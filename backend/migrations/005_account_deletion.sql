-- OmniQ: account deletion support.
-- Run this in your Supabase SQL Editor.
--
-- Google Play's User Data policy requires that an account deletion request actually deletes the
-- account and the personal data attached to it. Before this migration the app only recorded a
-- `pending` row in `user_requests`; the one code path that deleted anything
-- (admin-service `actionUserRequest`) called `auth.admin.deleteUser` and swallowed the error, so a
-- failed deletion still reported success to the user.
--
-- Three problems this file fixes at the schema level:
--
--   1. `user_requests.status` only allowed pending/approved/rejected. There was no way to record
--      that a deletion actually completed, or that it failed. Adding 'completed' and 'failed'.
--
--   2. Deleting the auth user cascades to `public.profiles`, which cascades to `user_requests`.
--      The evidence that a deletion happened therefore deleted itself. `account_deletions` keeps a
--      minimal, PII-free record so the deletion can be proven to a Play reviewer or a DPO request.
--
--   3. `orders.seller_id` is `on delete restrict` while `sellers.owner_id` is
--      `on delete cascade` from `auth.users`. Deleting a seller who has ever received an order
--      therefore fails at the database level. The application now detaches the seller row before
--      deleting the auth user (see backend/shared/utils/accountDeletion.ts); the partial index
--      below lets that detach happen without tripping the `owner_id` unique constraint, which
--      would otherwise allow only one detached seller ever.

begin;

-- 1. Allow terminal statuses on user_requests.
alter table public.user_requests
  drop constraint if exists user_requests_status_check;

alter table public.user_requests
  add constraint user_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'completed', 'failed'));

-- 2. PII-free record that a deletion was carried out.
--    `user_id` is retained deliberately: without it we cannot answer "was this account deleted?"
--    if the person writes in later. It is a pseudonymous identifier and carries no name, email,
--    phone or address. Nothing else about the person is stored here.
create table if not exists public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  -- 'self_service' (the person deleted their own account in the app) or
  -- 'admin_approved' (an administrator actioned a request row).
  initiated_by text not null check (initiated_by in ('self_service', 'admin_approved')),
  orders_anonymised integer not null default 0,
  seller_detached boolean not null default false,
  outcome text not null default 'pending' check (outcome in ('pending', 'completed', 'failed')),
  failure_reason text
);

create index if not exists account_deletions_user_id_idx on public.account_deletions(user_id);
create index if not exists account_deletions_completed_at_idx on public.account_deletions(completed_at);

-- Deny-all to anon and authenticated. Only the service role (which bypasses RLS) reads this.
alter table public.account_deletions enable row level security;

-- 3. `sellers.owner_id` is `uuid unique`. Postgres treats NULLs as distinct in a unique index, so
--    multiple detached sellers are already fine. This partial index is the one we actually want for
--    lookups and makes the intent explicit; the original unique constraint stays in place.
create index if not exists sellers_owner_id_active_idx
  on public.sellers(owner_id) where owner_id is not null;

commit;
