-- OmniQ Supabase - orders schema.
-- Author: OmniQ Team
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.profiles(id) on delete set null,
  seller_id uuid not null references public.sellers(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','packed','dispatched','delivered','cancelled')),
  delivery_address jsonb not null,
  subtotal numeric(10,2) not null,
  platform_fee numeric(10,2) not null default 29,
  total numeric(10,2) not null,
  payment_method text not null default 'cod',
  buyer_lat numeric(10,8),
  buyer_lng numeric(11,8),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_buyer_id_idx on public.orders(buyer_id);
create index if not exists orders_seller_id_idx on public.orders(seller_id);
