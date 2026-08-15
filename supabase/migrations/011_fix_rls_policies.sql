-- OmniQ Supabase - corrected row level security policies.
-- Author: OmniQ Team
--
-- WHY THIS EXISTS
-- ---------------
-- 007_create_rls_policies.sql never applied successfully. It referenced three columns that do not
-- exist in the live schema:
--   * products.is_active      (live schema has is_approved / is_flagged / deleted_at)
--   * delivery_zones.is_active(live column is `active`)
--   * sellers.user_id         (live column is `owner_id`)
-- The first failing statement aborted the migration, so row level security was left DISABLED on
-- profiles, sellers, products, orders, order_items, delivery_zones and audit_log.
--
-- The practical consequence: the anon key - which is published inside the Android app and in
-- eas.json - could read and write every one of those tables directly through PostgREST, bypassing
-- the API gateway entirely. Verified against production: anonymous SELECT returned all rows of
-- profiles (name, email, phone, address, pincode) and orders (delivery address, phone, lat/lng),
-- and an anonymous PATCH on cart_items was accepted.
--
-- MODEL
-- -----
-- The backend services authenticate the caller at the gateway and then query with the service-role
-- key, which bypasses RLS by design. RLS therefore exists to constrain the PUBLIC anon key and
-- ordinary user sessions hitting PostgREST directly. Anything the mobile app does not read
-- directly from Supabase gets no policy at all, which under enabled RLS means deny.
--
-- The app reads exactly two things directly from Supabase: its own auth session, and its own
-- profile row (frontend/src/app/index.tsx). Everything else goes through the gateway.

-- ---------------------------------------------------------------------------
-- profiles: a user may read and update only their own row.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Deliberately no INSERT or DELETE policy: profile creation and deletion happen server-side.
-- Note there is also no admin read policy here. The previous version used a current_role() helper
-- that reads public.profiles from inside a policy ON public.profiles, which is a recursive
-- dependency. Admin reads go through admin-service on the service-role key instead.

-- ---------------------------------------------------------------------------
-- products: publicly readable only when approved, unflagged and not soft-deleted.
-- No write policy - price and stock are server-controlled. Anonymous callers could previously
-- update prices directly.
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;

drop policy if exists "products public active select" on public.products;
drop policy if exists "products seller write" on public.products;
create policy "products public approved select" on public.products
  for select using (is_approved = true and is_flagged = false and deleted_at is null);

-- ---------------------------------------------------------------------------
-- delivery_zones: publicly readable when active. Column is `active`, not `is_active`.
-- ---------------------------------------------------------------------------
alter table public.delivery_zones enable row level security;

drop policy if exists "zones public active select" on public.delivery_zones;
drop policy if exists "zones admin write" on public.delivery_zones;
create policy "zones public active select" on public.delivery_zones
  for select using (active = true and deleted_at is null);

-- ---------------------------------------------------------------------------
-- Tables the client never touches directly. RLS on with no policy = deny for anon and
-- authenticated; service_role continues to bypass, so the backend is unaffected.
-- ---------------------------------------------------------------------------
alter table public.sellers enable row level security;
drop policy if exists "sellers own or admin select" on public.sellers;
drop policy if exists "sellers own update" on public.sellers;

alter table public.orders enable row level security;
drop policy if exists "orders participant select" on public.orders;

alter table public.order_items enable row level security;
drop policy if exists "order items participant select" on public.order_items;

alter table public.cart_items enable row level security;

alter table public.audit_log enable row level security;
drop policy if exists "audit admin select" on public.audit_log;

-- ---------------------------------------------------------------------------
-- Verification. After applying, each of these must return zero rows when executed with the
-- anon key (run them from the SQL editor with `set role anon;` or re-run the curl probes):
--   select * from public.profiles;    -- expect 0
--   select * from public.orders;      -- expect 0
--   select * from public.cart_items;  -- expect 0
--   select * from public.sellers;     -- expect 0
--   select * from public.products;    -- expect only approved, unflagged, non-deleted rows
-- ---------------------------------------------------------------------------
