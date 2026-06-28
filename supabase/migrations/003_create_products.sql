-- OmniQ Supabase - products schema.
-- Author: OmniQ Team
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  compare_price numeric(10,2),
  images text[] not null default '{}',
  category text not null,
  sku text unique,
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  is_flagged boolean not null default false,
  flag_reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category);
create index if not exists products_seller_id_idx on public.products(seller_id);
