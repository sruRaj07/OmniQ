-- OmniQ Supabase - sellers schema.
-- Author: OmniQ Team
create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  business_name text not null,
  description text,
  gst_number text,
  bank_account text,
  category text,
  city text,
  status text not null default 'pending' check (status in ('pending','approved','suspended','rejected')),
  rejection_reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
