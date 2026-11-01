-- OmniQ Supabase - Add Delivery Distance and Hub Details to Orders Table
-- Supports Option C delivery system: Base delivery (Free >= ₹200 or ₹25) + Distance charge (₹10/KM).
-- Author: OmniQ Team

alter table public.orders
  add column if not exists delivery_fee numeric(10,2) default 0,
  add column if not exists distance_km numeric(6,2),
  add column if not exists nearest_hub text;

comment on column public.orders.delivery_fee is
  'Total delivery fee charged for this order (base fee + distance surcharge).';
comment on column public.orders.distance_km is
  'Distance in kilometers between the delivery address and the nearest inventory hub.';
comment on column public.orders.nearest_hub is
  'Name of the nearest inventory hub/zone fulfilling this delivery.';
