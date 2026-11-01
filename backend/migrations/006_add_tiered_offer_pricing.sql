-- OmniQ Backend - Tiered Daily Offer Pricing Migration
-- Author: OmniQ Team

alter table public.products
  add column if not exists offer_price numeric(10,2) check (offer_price >= 0),
  add column if not exists offer_limit_qty integer check (offer_limit_qty >= 0),
  add column if not exists unit text default 'kg';

alter table public.order_items
  add column if not exists offer_price numeric(10,2),
  add column if not exists offer_qty integer default 0,
  add column if not exists regular_price numeric(10,2),
  add column if not exists regular_qty integer default 0,
  add column if not exists savings numeric(10,2) default 0;
