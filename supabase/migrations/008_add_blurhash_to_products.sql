-- OmniQ Supabase - add image placeholder to products.
-- Stores a base64 WebP data URI (~20px wide, a few hundred bytes) rendered by
-- expo-image while the full product image downloads. Named `blurhash` for
-- continuity with the client prop; the payload is a data URI, not a
-- BlurHash-algorithm string.
-- Author: OmniQ Team
alter table public.products
  add column if not exists blurhash text;

comment on column public.products.blurhash is
  'Base64 WebP data URI (~20px) used as an expo-image placeholder on slow connections.';
