-- OmniQ Supabase - cart items schema.
-- Author: OmniQ Team
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists cart_items_buyer_id_idx on public.cart_items(buyer_id);
