# OmniQ production-readiness — session handoff

**Updated:** 2026-08-20. Nothing is mid-flight.

> **Play launch work has moved to [`PLAY_LAUNCH.md`](PLAY_LAUNCH.md).** That file is the active
> checklist for shipping to Google Play. This file remains the security and performance record.
>
> **This document is why the repo must stay private.** It describes both breaches in enough detail
> to reproduce them. It was publicly readable at `raw.githubusercontent.com` until 2026-08-20.

---

## State of production right now

**Both breaches found in this engagement are closed and verified against live production.**

### Breach 1 — backend services published to the internet (CLOSED)

Six of the seven Container Apps had external ingress. `admin-service` served every customer's
name, address, phone and GPS coordinates unauthenticated. They are now internal; only
`api-gateway` is public.

| Check | Result |
|---|---|
| `admin-service…azurecontainerapps.io/admin/orders` direct | `404` (was `200`, 71,914 bytes of PII) |
| `product-service…azurecontainerapps.io/products` direct | `404` (was `200`) |
| `api-gateway…/health` | `200` |
| `api-gateway…/products` (proxy → internal) | `200`, real data |

This is now enforced by CI rather than by hand: `.github/workflows/deploy.yml` carries a per-service
`ingress` matrix value, re-asserts it on every deploy, and **fails the job** if the resulting state
disagrees. The old workflow hardcoded `ingress: external` for all seven and would have silently
undone the containment on the next push.

### Breach 2 — row level security was never enabled (CLOSED 2026-08-15)

`007_create_rls_policies.sql` aborted on its first statement (it referenced `products.is_active`,
`delivery_zones.is_active` and `sellers.user_id`, none of which exist), leaving RLS **disabled** on
every table. The anon key published inside the APK and in `eas.json` could read all of `profiles`
and `orders` directly through PostgREST, and writes were accepted.

`011_fix_rls_policies.sql` was applied by the repo owner in the Supabase SQL editor. Verified from
outside with the anon key:

| Probe | Before | After |
|---|---|---|
| `GET /rest/v1/profiles` | all rows (name, email, phone, address) | `[]` |
| `GET /rest/v1/orders` | all rows (address, phone, lat/lng) | `[]` |
| `GET /rest/v1/order_items`, `cart_items`, `sellers`, `audit_log` | all rows | `[]` |
| `POST /rest/v1/cart_items` | accepted | `401` / `42501 new row violates row-level security policy` |
| `PATCH /rest/v1/products` (price tamper) | accepted | `200 []` — 0 rows, price unchanged |
| `GET /rest/v1/products` | all rows | approved + unflagged only |
| `GET /rest/v1/delivery_zones` | all rows | active only |

App login and home screen confirmed working after the change — that path exercises the one policy
the client depends on (`profiles select own`, used by `frontend/src/app/index.tsx:50`).

`004_order_idempotency.sql` was applied in the same pass; `order_idempotency` exists and is
deny-all to anon.

### Also closed and verified live

- **Self-service admin.** `POST /auth/signup {"role":"admin"}` created a working administrator.
  Now `400 invalid_enum_value`; `signUpSchema` accepts only `buyer` and `seller`.
- **Roles in client-writable metadata.** All 8 auth users had their role in `user_metadata`, which
  any signed-in client can rewrite via `supabase.auth.updateUser`. Backfilled to `app_metadata`
  (service-key only) and re-verified: 3 admin, 1 seller, 4 buyer.
- **Decode-only JWTs.** The gateway called `jwt.decode`; a forged token with
  `app_metadata.role: "admin"` was accepted. Now ES256 via the project's published JWKS. A forged
  admin token returns `401`, and spoofed `x-omniq-*` headers return `401`.
- **Privilege escalation in `assignRole`.** Validated a `userId` then ignored it and used the
  caller's own `sub`. Now admin-only; a buyer calling it gets `403`.
- **Plaintext secrets on all 7 Container Apps.** `SUPABASE_SERVICE_ROLE_KEY` and `REDIS_URL` were
  readable by anyone with Reader on the subscription. Now Container App secrets via `secretref:`;
  plaintext secret env count is 0 on all seven.

---

## State of the repo

Commit `fa2eb5433` — "fix(security): verify JWTs, enforce authorization, and stop publishing
backends" — **has been pushed**; `main` and `origin/main` agree. The hardened `deploy.yml` with the
per-service `ingress` matrix is therefore live on GitHub, and the CI-regression risk noted in the
previous version of this document is closed.

Twelve further commits have landed since, covering the seller portal redesign, admin fixes, image
renditions, account deletion and error sanitisation.

Deployed image tag on all 7 apps: `omniqregistry.azurecr.io/<service>:sec-299ab687a`,
`provisioningState: Succeeded`.

---

## Still open

### [ACTION_REQUIRED] Rotate `SUPABASE_SERVICE_ROLE_KEY`
It sat in plaintext env vars alongside a publicly reachable endpoint. It bypasses all RLS, so the
work above does not constrain it. Rotate in the Supabase dashboard, update the GitHub repository
secret, then re-run the deploy workflow. Not yet done.

### Google Play blockers — now tracked in [`PLAY_LAUNCH.md`](PLAY_LAUNCH.md)
Resolved since the last update:
- **Account deletion** is implemented server-side (`backend/shared/utils/accountDeletion.ts`) and
  migration `005_account_deletion.sql` is confirmed applied in production. The frontend flow was
  broken until 2026-08-20 — the confirmation text was checked but bound to no input, so the
  mutation could never fire — and has been fixed.
- **Legal pages** are written and live in `legal-site/`, ready to publish to a separate public repo
  via GitHub Pages.
- **Hardcoded coordinates** are gone from `cart.tsx`; `buyerLat`/`buyerLng` are optional in
  `orderCreateSchema`. The unused `expo-location` dependency was removed and camera/location/mic
  permissions are stripped via `android.blockedPermissions`, verified in the generated manifest.

Still outstanding: the Data Safety declaration itself, store graphics (feature graphic and
screenshots), and the 14-day closed test.

### Performance (measured, not estimated)
- **`minReplicas: 0` on all services.** Cold starts measured at 26.2s (direct admin-service),
  23.7s (direct product-service), 31.2s (gateway `/products`). Warm gateway `/health` is 2.50s.
  This is by far the largest real latency source.
- **Redis is in `centralindia`, Container Apps are in `eastus`** — every cache lookup crosses
  continents and is likely slower than the query it replaces.
- **The gateway's 60s response cache never stores anything.** It overrides `res.json`, but
  `http-proxy-middleware` streams via `res.write`/`res.end`. Dead code.
- `redis.keys('products:*')` is O(N) and blocking; search is `ilike %term%` with `count: "exact"`.
- `select("*")` in `getProduct`, `listSellerProducts`, `searchProducts`.
- **No CDN and no Front Door exist** in the subscription. Nothing has been provisioned.

### Correctness
- **Multi-seller carts collapse to `products[0].seller_id`** (`orderService.ts:32`) — other sellers
  never see their half of the order.
- **`cancelOrder` hard-deletes** the order and its items, destroying transactional records.
- **`/auth*` has no rate limiter.** `authLimiter` is defined and never used.
- **CORS**: `FRONTEND_URL` / `ADMIN_URL` are unset on the gateway. Fail-closed in production, so
  nothing breaks today (React Native sends no `Origin`), but must be set before hosting the web
  export.
- **OTP is dead code** — `generateAndStoreOtp` is commented out, so `/auth/verify-otp` cannot
  succeed. It was 4-digit, `Math.random()`-based, in-memory.
- **Stub endpoints returning success without doing anything**: `GET /orders/export` (hardcoded
  CSV), `/admin/flagged-products`, `/admin/audit-log`. The product-service stubs were removed.
- ~~Root `app.json` and `frontend/app.json` disagree~~ — **fixed 2026-08-20.** Both root `app.json`
  and root `eas.json` were deleted. Since `aaa4c9329` removed their `projectRoot` pointer, running
  `eas build` from the repo root would have built against a different EAS project with no
  `android.package` and `newArchEnabled: true`. `frontend/` is now the only Expo config.

### Not yet started
Performance baseline doc, Azure CDN/Front Door cost evaluation, image pipeline, DB indexing,
Android release config, and all legal / Data Safety documentation.
