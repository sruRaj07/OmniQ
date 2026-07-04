-- OmniQ Supabase - profiles and audit log schema.
-- Author: OmniQ Team
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  phone_number text,
  address text,
  pincode text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
