-- OmniQ Supabase - row level security policies.
-- Author: OmniQ Team
alter table public.profiles enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'buyer')
$$;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "sellers own or admin select" on public.sellers;
create policy "sellers own or admin select" on public.sellers for select using (user_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "sellers own update" on public.sellers;
create policy "sellers own update" on public.sellers for update using (user_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "products public active select" on public.products;
create policy "products public active select" on public.products for select using (is_active = true and is_flagged = false and deleted_at is null);

drop policy if exists "products seller write" on public.products;
create policy "products seller write" on public.products for all using (
  seller_id in (select id from public.sellers where user_id = auth.uid()) or public.current_role() = 'admin'
) with check (
  seller_id in (select id from public.sellers where user_id = auth.uid()) or public.current_role() = 'admin'
);

drop policy if exists "orders participant select" on public.orders;
create policy "orders participant select" on public.orders for select using (
  buyer_id = auth.uid()
  or seller_id in (select id from public.sellers where user_id = auth.uid())
  or public.current_role() = 'admin'
);

drop policy if exists "order items participant select" on public.order_items;
create policy "order items participant select" on public.order_items for select using (
  order_id in (
    select id from public.orders
    where buyer_id = auth.uid()
      or seller_id in (select id from public.sellers where user_id = auth.uid())
      or public.current_role() = 'admin'
  )
);

drop policy if exists "zones public active select" on public.delivery_zones;
create policy "zones public active select" on public.delivery_zones for select using (is_active = true and deleted_at is null);

drop policy if exists "zones admin write" on public.delivery_zones;
create policy "zones admin write" on public.delivery_zones for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists "audit admin select" on public.audit_log;
create policy "audit admin select" on public.audit_log for select using (public.current_role() = 'admin');
