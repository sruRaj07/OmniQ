-- OmniQ Supabase - add a small list thumbnail to products.
-- `images[0]` is the 1200px detail image (~150-250KB). Grids, cart rows and
-- order cards never render it larger than ~180px, so they load this 400px WebP
-- (~25-40KB) instead whenever the connection is 3G or worse.
-- Author: OmniQ Team
alter table public.products
  add column if not exists thumbnail_url text;

comment on column public.products.thumbnail_url is
  '400px WebP derived from images[0]. Served to list views on 2G/3G connections.';

-- Existing rows have no thumbnail; list views fall back to images[0] when null,
-- so no backfill is required for correctness. Backfill only improves them.
