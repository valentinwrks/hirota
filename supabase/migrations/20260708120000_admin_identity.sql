-- ============================================================================
-- Admin identity — establishes WHO is the single admin, enforceable in RLS.
--
-- Authentication (Supabase Auth) only proves a user is a valid, logged-in user.
-- It does NOT, by itself, grant admin rights. This migration adds the
-- authorization layer: an explicit membership table + a helper function that
-- RLS policies (and server code) call to decide "is the current user THE admin?".
--
-- Single-admin model (AGENTS §2): there is exactly ONE admin, created MANUALLY
-- in Supabase Studio (Auth > Users). After pushing this migration, insert that
-- user's uid once:
--
--   insert into admin_users (user_id) values ('<the-studio-user-uuid>');
--
-- There is no app UI for managing admins (out of scope).
-- ============================================================================

create table admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS ON, NO POLICIES: nobody reads this table directly through the API
-- (anon or authenticated). "When in doubt, deny" (§5). Membership is only ever
-- consulted indirectly through is_admin() below, which runs SECURITY DEFINER.
alter table admin_users enable row level security;

-- is_admin(): the single source of truth for admin authorization.
--
-- SECURITY DEFINER lets it read admin_users despite that table's deny-all RLS,
-- while STABLE + a pinned search_path keep it safe. It returns true only when
-- the CURRENT authenticated user (auth.uid()) is a member. RLS policies in later
-- sprints gate privileged rows with `using (public.is_admin())`, and server
-- components call it to guard the admin shell.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_users where user_id = auth.uid()
  );
$$;

-- Callable by any logged-in user (it returns false for non-admins). Not granted
-- to anon: an unauthenticated caller is never the admin.
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
