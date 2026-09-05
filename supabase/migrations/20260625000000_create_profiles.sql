-- Create a minimal user profile table linked to auth.users.
--
-- Design notes:
--   • id is a FK to auth.users so the row is tied to a real auth identity.
--   • ON DELETE CASCADE means the profile is automatically removed when the
--     auth user is deleted — no orphaned rows.
--   • language / theme mirror the frontend localStorage values so they can
--     eventually be synced; CHECK constraints match the allowed app values.
--   • email is denormalised here for convenience (admin queries, email look-up
--     without joining auth.users). It is populated from new.email in the
--     trigger and can drift if the user changes their email in Supabase Auth,
--     but that is acceptable for Phase 1 — a separate migration will add a
--     sync mechanism later.
--   • RLS is enabled with no anon access — only the owning authenticated user
--     can read or write their own row.
--   • The trigger function uses SECURITY DEFINER so it can insert into
--     public.profiles even though the operation is initiated by the
--     auth.users insert (which runs as the supabase_auth_admin role).
--     SET search_path = public is required to prevent search-path injection
--     when running as a security-definer function.

-- ── Table ──────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text        not null,
  language   text        not null default 'en'
                         check (language in ('en', 'fr')),
  theme      text        not null default 'light'
                         check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Authenticated users may read only their own profile.
create policy "authenticated users can select own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Authenticated users may update only their own profile.
create policy "authenticated users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Authenticated users may insert their own profile row.
-- Needed for a frontend first-login upsert fallback in case the trigger
-- did not fire (e.g. the user was created before this migration ran).
create policy "authenticated users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Explicit GRANTs: the privilege layer is checked before RLS, so both must
-- allow the operation. service_role bypasses RLS and needs no policy.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profiles to service_role;

-- ── Automatic profile creation ─────────────────────────────────────────────────
--
-- A trigger on auth.users fires AFTER INSERT and creates the matching profile
-- row immediately. This keeps profile creation invisible to the frontend — no
-- extra round-trip needed on first sign-in.
--
-- SECURITY DEFINER: the function runs with the privileges of its owner
-- (typically postgres / the migration user), not the caller
-- (supabase_auth_admin). This is required because auth.users is in a different
-- schema and the trigger body writes to public.profiles.
--
-- SET search_path = public: prevents a malicious search_path injection attack
-- against a SECURITY DEFINER function, per Postgres best-practice.

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── Backfill existing users ────────────────────────────────────────────────────
--
-- Users created before this migration ran have no profile row. Backfill them
-- now so every auth.users row has a matching public.profiles row after apply.
-- ON CONFLICT DO NOTHING makes this idempotent — safe to re-run if needed.

insert into public.profiles (id, email)
select id, coalesce(email, '')
from auth.users
on conflict (id) do nothing;

-- ── Trigger ────────────────────────────────────────────────────────────────────

-- Fire once per new auth user, after the row is committed so the FK is valid.
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
