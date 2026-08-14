
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OmniQ is an India-first multi-vendor ecommerce marketplace: a pnpm workspace holding an Expo Router app (buyer + seller + admin flows in one binary), seven Express microservices behind an API gateway, and Supabase (Postgres + Auth + RLS) as the datastore.

## Working agreements

These override general defaults. When one conflicts with something else in this file, these win.

**Scope discipline**
- Finish one task completely — code, verification, report — before starting the next. Do not interleave.
- v1.0 launch work must not touch v1.1 items: FlashList migration, MMKV, `React.memo` passes, New Architecture. Leave them alone even when they look like an easy win in a file you're already editing.
- Warn before any change that could break production, and wait for a go-ahead. This includes migrations, gateway route order, auth/RLS, `constants/config.ts` URL resolution, and the SSR guards in `lib/supabase.ts` / `index.web.tsx`.

**Reporting**
- Show before and after for every file change — the old snippet and the new one, per file, not just a summary of intent.

**Mobile code**
- Lists: `FlashList` from `@shopify/flash-list`. Never `FlatList`.
- Images: `Image` from `expo-image`. Never React Native's `Image`.
- Never nest a list inside a `ScrollView`. Put the scrolling content in `ListHeaderComponent` / `ListFooterComponent` and let the list own the scroll.

**Product constraints**
- Target device is Redmi Note class: 2GB RAM, Android, mid-tier CPU. Budget memory and JS work accordingly.
- APK must stay under 40MB. Weigh any new dependency or bundled asset against that.
- All prices display in Indian Rupee (₹). Format via `utils/formatCurrency.ts`.

Note on the FlashList rules: they don't currently conflict. `src/` already has zero `FlatList` usages and six screens on `FlashList`, so the v1.1 "FlashList migration" is effectively done — rule 1 governs new code, and there is no pending migration for rule 2 to freeze. `ImageZoomViewer.tsx` imports both `expo-image` and React Native `Image`; that's the one place left where the image rule has real work behind it.

## Commands

Run from the repo root (Node 20+, pnpm 10):

```bash
pnpm dev              # frontend + all 7 services concurrently (color-coded logs)
pnpm dev:backend      # all 7 services, no Expo
pnpm dev:frontend     # Expo only
pnpm dev:api          # gateway only
pnpm typecheck        # tsc --noEmit across all workspaces
pnpm build            # recursive build
pnpm test             # recursive; vitest is wired up but no test files exist yet
```

Single service: `pnpm --filter @omniq/order-service dev` (tsx, no build step). Single workspace typecheck: `pnpm --filter frontend typecheck`.

Expo on a phone: `pnpm --filter frontend dev:go` (LAN) or `dev:tunnel` (different network). Web build preview: `pnpm preview:web`.

Backends in Docker: `docker compose up` — one image, `SERVICE_NAME` build arg picks which service runs.

`lint` is aliased to `tsc --noEmit` everywhere; there is no ESLint config in this repo.

## Workspace layout

`pnpm-workspace.yaml` includes only `frontend`, `web-storefront`, `backend/shared`, `backend/services/*`. Two directories are **not** workspace members and are not part of the build:

- `omniq/` and `frontend/omniq/` — scratch Expo 57 bootstrap apps, unused by the product.
- `admin/` — empty; the README's `pnpm dev:admin` and Vercel/Render deployment notes are stale. Admin lives inside the Expo app at `frontend/src/app/(admin)/`, and backends deploy to **Azure Container Apps** via `.github/workflows/deploy.yml`.

## Backend architecture

The gateway (`backend/services/api-gateway`, port 4000) is the only public surface. It proxies by path prefix to services on 4001–4006 (`/products`→4001, `/orders` and `/cart`→4002, `/sellers`→4003, `/users` and `/auth`→4004, `/location`→4005, `/admin`→4006). Route order matters: public `GET` routes are registered before the catch-all `app.all(..., authMiddleware, ...)` so unauthenticated reads pass through. The gateway also holds a 60s in-memory response cache that only applies to `GET` requests without an `Authorization` header.

**Auth is decode-only, not verify.** `authMiddleware` calls `jwt.decode` on the Supabase access token; downstream services independently base64-decode the JWT payload to read `sub` (see `extractTokenPayload` in each controller). Nothing validates the signature, and controllers fall back to a hardcoded `DEFAULT_BUYER_ID` when no token is present. Real authorization is enforced by Supabase RLS (`supabase/migrations/007_create_rls_policies.sql`), which keys off `auth.uid()` and the `public.current_role()` helper. Code paths using `supabaseAdmin` (service-role key) bypass RLS entirely — check which client a service function uses before assuming a query is guarded.

Each service follows `server.ts` → `controllers/` → `services/` (business logic + Supabase calls) → optional `validators/` (Zod). `product-service` additionally uses Redis (`ioredis`); `order-service` emits domain events via `events/orderEventEmitter.ts`.

`backend/shared` is imported by **relative path**, not by its package name — e.g. `import { ok } from "../../../shared/utils/responseFormatter"`. Its `package.json` points at a nonexistent `src/index.ts`; each service's tsconfig instead does `"include": ["src/**/*.ts", "../../shared/**/*.ts"]`. Adding a shared module means adding a file under `backend/shared/{utils,types,constants}` and importing it relatively.

Every response goes through `ok(data, meta)` / `fail(code, message, requestId?, retryAfter?)`, producing `{ success, data, meta }` or `{ success, error: { code, message } }`. Frontend code consistently unwraps with `response.data?.data`.

## Frontend architecture

`frontend/` is Expo SDK 56 / React Native 0.85 / React 19 with the React Compiler babel plugin enabled. Entry is a custom `index.js` that patches a `useNativeDriver` web warning before importing `expo-router/entry`.

Routing is file-based under `src/app/` with four groups: `(auth)`, `(buyer)`, `(seller)`, `(admin)`. `AuthProvider` (`components/shared/AuthProvider.tsx`) subscribes to `supabase.auth.onAuthStateChange` and imperatively redirects between `(auth)` and `(buyer)` based on session presence — route guarding happens there, not in layouts.

State splits three ways:
- **Server state**: TanStack Query via hooks in `src/hooks/` (`useProducts` uses cursor-based `useInfiniteQuery`). Global defaults in `lib/queryClient.ts` are `offlineFirst` with a 24h `gcTime`.
- **Client state**: Zustand stores in `src/store/`. `cartStore` is not local-only — its actions call the `/cart` API and mirror the response.
- **Auth session**: `authStore` holds the Supabase session; `userStore` holds the profile and role.

`lib/apiClient.ts` is the single axios instance: it caches the access token for 4 minutes, clears the cache on 401, and retries network errors/5xx twice with exponential backoff.

**Styling is `StyleSheet.create` with theme tokens, not utility classes.** `tailwind.config.js` references a nativewind preset that is not installed and no file uses `className` — treat it as dead config. Colors come from `useThemeColors()` (`store/useThemeStore.ts`), which returns a single frozen `lightTheme` object; the same reference is returned on every call deliberately, to stop Zustand from re-rendering every consumer. Dark mode is stubbed but not wired. Design tokens live in `constants/colors.ts` and `constants/typography.ts`.

Web matters here: the app static-exports (`app.json` `web.output: "static"`). `src/lib/supabase.ts` swaps in a no-op storage adapter when `window` is undefined so SSR doesn't crash on AsyncStorage, and `src/app/index.web.tsx` re-exports the buyer home screen so `/` pre-renders content instead of a splash. Preserve those guards when touching startup code.

`constants/config.ts` resolves the API base URL at runtime: on web dev it follows `window.location.hostname`, on Android emulator `10.0.2.2:4000`, otherwise `localhost:4000`, and in production a hardcoded Azure gateway URL. Production Supabase URL/anon key are hardcoded as fallbacks in this file and in `lib/supabase.ts`.

## Database

Schema lives in `supabase/migrations/` (numbered SQL, note two files share the `002_` prefix). `backend/migrations/003_user_requests.sql` is a separate, later-added migration outside the Supabase folder — check both directories for schema. Seed data: `supabase/seed.sql` and `backend/scripts/seedDemoData.ts`.

## Conventions

Source files open with a `/** OmniQ <area> - <purpose>. Author: OmniQ Team */` header block. Backend uses full `request`/`response` parameter names. Perf-sensitive edits are marked with `⚡ PERFORMANCE:` comments explaining the tradeoff — read those before "simplifying" the code they guard.
