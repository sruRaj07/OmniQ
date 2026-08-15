-- OmniQ - order idempotency keys.
-- Author: OmniQ Team
--
-- Order creation had no idempotency protection while the mobile client retries network errors and
-- 5xx responses twice with backoff (frontend/src/lib/apiClient.ts). On a weak mobile connection a
-- request that succeeded server-side but whose response was lost would be replayed, charging and
-- shipping the customer twice. The client now sends an Idempotency-Key per checkout attempt and
-- this table maps that key to the order it produced.
--
-- The primary key doubles as the concurrency control: two concurrent replays race to insert, the
-- loser gets a unique violation and returns the winner's order instead of creating a second one.

create table if not exists public.order_idempotency (
  key text primary key,
  buyer_id uuid not null,
  order_id uuid references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists order_idempotency_buyer_idx on public.order_idempotency(buyer_id);

-- Keys are only useful for the lifetime of a checkout retry window. A scheduled cleanup can prune
-- old rows; nothing in the application depends on them after the order exists.
create index if not exists order_idempotency_created_at_idx on public.order_idempotency(created_at);

alter table public.order_idempotency enable row level security;

-- No client-facing policy is defined on purpose: this table is only ever touched by the order
-- service using the service-role key. With RLS enabled and no policy, anon/authenticated callers
-- reaching Supabase directly cannot read or write it.
