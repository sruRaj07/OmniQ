-- OmniQ Supabase - Tiered Daily Offer Pricing Schema Migration
-- Enables weight-based and quantity-based daily offer limits (e.g., 2kg at ₹8/kg, remaining at ₹12/kg).
-- Author: OmniQ Team

-- 1. Add offer pricing and unit columns to products
alter table public.products
  add column if not exists offer_price numeric(10,2) check (offer_price >= 0),
  add column if not exists offer_limit_qty integer check (offer_limit_qty >= 0),
  add column if not exists unit text default 'kg';

comment on column public.products.offer_price is
  'Special daily offer price (e.g. ₹8/kg). When set with offer_limit_qty, buyers receive this price up to offer_limit_qty per order.';
comment on column public.products.offer_limit_qty is
  'Max quantity eligible for offer_price in a single order (e.g. 2 kg). Quantity beyond this is billed at standard price.';
comment on column public.products.unit is
  'Unit of measurement (e.g., kg, g, piece, packet, bundle). Defaults to kg for produce/grocery.';

-- 2. Add breakdown columns to order_items for full auditability and invoice accuracy
alter table public.order_items
  add column if not exists offer_price numeric(10,2),
  add column if not exists offer_qty integer default 0,
  add column if not exists regular_price numeric(10,2),
  add column if not exists regular_qty integer default 0,
  add column if not exists savings numeric(10,2) default 0;

comment on column public.order_items.offer_price is
  'Offer unit price applied to this line item at order time.';
comment on column public.order_items.offer_qty is
  'Number of units billed at offer_price.';
comment on column public.order_items.regular_price is
  'Standard unit price applied to this line item at order time.';
comment on column public.order_items.regular_qty is
  'Number of units billed at standard regular_price.';
comment on column public.order_items.savings is
  'Total monetary savings customer received from tiered offer on this item.';
