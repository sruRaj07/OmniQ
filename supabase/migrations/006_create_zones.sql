-- OmniQ Supabase - delivery zones schema.
-- Author: OmniQ Team
create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat numeric(10,8) not null,
  lng numeric(11,8) not null,
  radius_km numeric(6,2) not null,
  supported_pincodes text[] not null default '{}',
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
