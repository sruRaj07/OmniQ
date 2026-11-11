-- OmniQ Supabase - Add warehouse assignment and location to sellers.
-- Sellers get lat/lng for their inventory location and are auto-assigned to the nearest warehouse (delivery_zone).
-- Author: OmniQ Team

-- 1. Add location coordinates to sellers (where they deliver products from)
alter table public.sellers
  add column if not exists lat numeric(10,8),
  add column if not exists lng numeric(11,8);

-- 2. Add warehouse (delivery_zone) assignment
alter table public.sellers
  add column if not exists assigned_warehouse_id uuid references public.delivery_zones(id) on delete set null;

comment on column public.sellers.lat is
  'Latitude of the seller''s inventory/dispatch location. Used to auto-assign nearest warehouse.';
comment on column public.sellers.lng is
  'Longitude of the seller''s inventory/dispatch location. Used to auto-assign nearest warehouse.';
comment on column public.sellers.assigned_warehouse_id is
  'The delivery_zone (warehouse/hub) this seller is assigned to. Orders from this seller calculate delivery distance from this warehouse to the buyer.';

-- 3. Index for quick lookups of sellers by warehouse
create index if not exists sellers_assigned_warehouse_id_idx on public.sellers(assigned_warehouse_id);

-- 4. Auto-assign existing sellers to nearest warehouse based on city name matching zone name.
--    This is a best-effort retroactive fix for existing sellers.
update public.sellers s
set assigned_warehouse_id = dz.id
from public.delivery_zones dz
where s.assigned_warehouse_id is null
  and dz.active = true
  and dz.deleted_at is null
  and (
    lower(trim(coalesce(s.city, ''))) = lower(trim(dz.name))
    or position(lower(trim(coalesce(s.city, ''))) in lower(trim(dz.name))) > 0
    or position(lower(trim(dz.name)) in lower(trim(coalesce(s.city, '')))) > 0
  );

