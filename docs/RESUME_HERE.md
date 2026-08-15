# OmniQ production-readiness — session handoff

**Paused:** 2026-08-14. Safe to resume at any time; nothing is mid-flight.

---

## State of production right now

**Contained, working, deployed.** A live PII breach was found and closed during this session.

The six backend services were changed from external to **internal ingress**, and `api-gateway`
was repointed at the new `.internal.` FQDNs. Both halves are applied and verified:

| Check | Result |
|---|---|
| `admin-service…azurecontainerapps.io/admin/orders` unauthenticated | `404` (was `200`, 71,914 bytes of customer PII) |
| `product-service…azurecontainerapps.io/products` direct | `404` (was `200`) |
| `api-gateway…/health` | `200` |
| `api-gateway…/products` (proxy → internal product-service) | `200`, real data |
| `api-gateway…/admin/orders` without token | `401` |

Rollback reference (pre-change ingress) is at `/tmp/omniq_ingress_rollback.txt` — **this is in
tmp and will not survive a reboot**. The original state was: all 7 apps `external: true`, ports
4000–4006, transport Auto. Gateway env vars pointed at the non-`.internal.` FQDNs.

## State of the repo

Two new files, **not imported by anything yet** — they have zero runtime effect and are safe to
leave uncommitted:

- `backend/shared/utils/jwtVerifier.ts` — real Supabase token verification (ES256 via the
  project's published JWKS; HS256 via `SUPABASE_JWT_SECRET` as a fallback; fails closed).
- `backend/shared/utils/gatewayIdentity.ts` — trusted identity propagation for downstream
  services (`requireAuth`, `requireRole`, `attachIdentity`).

`frontend/src/app/(buyer)/cart.tsx` was already modified before this session started — untouched by me.

Nothing has been deployed from the working tree. `jose` is **not yet installed** in
`backend/services/api-gateway`.

---

## Next step when you resume

Wiring those two files in. In order:

1. `pnpm --filter @omniq/api-gateway add jose`
2. Rewrite the gateway's `authMiddleware` to `await verifyAccessToken(...)`, strip inbound
   `x-omniq-*` headers, and inject trusted ones.
3. Add `requireRole("admin")` to `/admin*` in `server.ts` **and** inside `admin-service` itself.
4. Replace `extractTokenPayload` + `DEFAULT_BUYER_ID` in order/user/product controllers with
   `requireUserId(request)`.
5. Generate `INTERNAL_GATEWAY_KEY`, set it plus `NODE_ENV=production` on all 7 container apps.
6. Deploy, then re-run the verification probes above.

---

## Confirmed findings not yet fixed

Ordered by severity. Each was read in source, not inferred.

### Critical
- **`admin-service` has no authorization at all** — no controller checks a role. Currently
  reachable only via the gateway, which applies decode-only auth. `roleGuardMiddleware.ts`
  exists and is never imported.
- **Gateway `authMiddleware.ts:29` uses `jwt.decode`, not `jwt.verify`** — signatures are not
  checked. A forged token with `app_metadata.role: "admin"` is accepted.
- **`SUPABASE_SERVICE_ROLE_KEY` and `REDIS_URL` are plaintext env vars** on all 7 apps (not
  `secretRef`), visible to anyone with Reader on the subscription. The service-role key bypasses
  all RLS. **These keys should be rotated** — they were exposed alongside a public endpoint.

### High
- **`updateOrderStatusController` (`orderController.ts:33`) has no ownership or role check** —
  any caller can set any order to any status, including `delivered`.
- **No idempotency on `placeOrder`**, while `lib/apiClient.ts` retries 5xx twice → duplicate orders.
- **`assignRole` (`userService.ts`) lets a caller set their own role**, including `admin`. It
  validates a `userId` field then ignores it and uses the caller's own `sub`.
- **Stock decrement is read-then-write** (`orderService.ts:93`) — oversell race. No transaction
  wraps order → items → stock, so partial failure leaves orphaned orders.
- **Multi-seller carts collapse to `products[0].seller_id`** (`orderService.ts:32`) — other
  sellers never see their half of the order.
- **`cancelOrder` hard-deletes the order and its items** — destroys transactional records that
  likely must be retained.
- **`/auth*` has no rate limiter.** `authLimiter` is defined in `rateLimiterMiddleware.ts` and
  never used. Credential stuffing is unthrottled.
- **CORS falls through to `origin: true` with `credentials: true`** — `FRONTEND_URL` and
  `ADMIN_URL` are unset on the gateway, so `allowedOrigins` is empty.
- **Account deletion is not implemented.** It inserts a `pending` row in `user_requests` with no
  fulfilment path. This is a Google Play blocker.

### Medium / performance
- **The gateway's 60s response cache never stores anything.** It overrides `res.json`, but
  `http-proxy-middleware` streams to `res.write`/`res.end` and never calls `res.json`. The
  documented cache is dead code.
- **`minReplicas` is 0 on all services** → cold starts. Measured **31s** for `/products` and
  ~26s for a direct service call. This is the single largest real-world latency source.
- **Redis is in `centralindia`; Container Apps are in `eastus`.** Every cache lookup crosses
  continents — the cache is likely slower than the query it replaces.
- **`product-service` forks one Node worker per host CPU** (`server.ts`, `cluster.fork()`) inside
  a 0.5 vCPU / 1Gi container.
- **`redis.keys('products:*')`** is O(N) and blocking; invalidation wipes all product caches on
  any write.
- **Search uses `ilike %term%`** across title/description/category with `count: "exact"` — full
  scan per search.
- `select("*")` in `getProduct`, `listSellerProducts`, `searchProducts`; order lists use
  `*, order_items(*, product:products(*))`.
- **Stub endpoints returning success without doing anything:** `DELETE /products/:id`,
  `PATCH /products/:id/stock`, `POST /products/:id/flag`, `GET /orders/export` (hardcoded CSV),
  `/admin/flagged-products`, `/admin/audit-log`.
- **RLS policy bugs in `007_create_rls_policies.sql`:** the `orders` and `order_items` policies
  reference `sellers.user_id`, but the sellers policies use `owner_id`. Worth confirming whether
  that migration applied cleanly to production at all.
- **OTP is dead code** — `generateAndStoreOtp` is commented out, so `/auth/verify-otp` can never
  succeed. It is 4-digit, `Math.random()`-based, and stored in-memory (breaks across replicas).
- **Root `app.json` and `frontend/app.json` disagree** — different EAS `projectId`s, and the root
  sets `newArchEnabled: true` while frontend does not. Worth resolving before a release build.
- **`frontend/index.js` is in `.gitignore`** but CLAUDE.md documents it as the entry point.

## Not yet started
Performance baseline, Azure CDN/Front Door evaluation, image pipeline, DB indexing, and all
legal/Data Safety documentation.
