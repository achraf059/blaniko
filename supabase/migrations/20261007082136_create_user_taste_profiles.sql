-- Taste profile for authenticated users (Phase 2 account sync).
--
-- This is NOT public.profiles. profiles holds account-level settings (email,
-- language, theme) and is left completely untouched. user_taste_profiles holds the
-- slow-changing taste collected by the mobile first-use setup: what someone is
-- generally interested in, who they usually go out with, and a setting preference.
-- It deliberately excludes email, theme, language, the setup progress record
-- (step / draft / done) and the Home moment; those are device-local or account-level.
--
-- Design notes:
--   • One row per user. An empty profile is a row with empty arrays.
--   • Typed columns (not jsonb): three stable fields that benefit from real constraints.
--   • CLOSED canonical domains, mirroring the current mobile model exactly:
--       interests      padel, football, entertainment, kids-family, sports,
--                      billiards, water-beach, adventure, wellness
--       usual_company  friends, partner, family, solo
--       setting        indoor, outdoor, or NULL ("no preference")
--     No NULL elements and no duplicates are allowed in either array. A future
--     category is added by a forward migration that replaces the constraint; that is
--     preferred over accepting malformed values from direct clients.
--   • profile_updated_at is the CLIENT's edit time and the last-write-wins key. It is
--     NULL for a migrated profile with no known edit time, and NULL must lose to any
--     real timestamp. updated_at is a different thing: SERVER-CONTROLLED row metadata
--     (upload time) written by public.set_updated_at() on INSERT and on UPDATE, so a
--     client-supplied value is overwritten; it is never a conflict key.
--   • schema_version lets the three fields evolve without a table rewrite.
--
-- Privilege posture (the live postgres default ACLs grant REFERENCES, TRIGGER,
-- TRUNCATE and MAINTAIN on new public tables; none is relied upon):
--   anon            nothing (no grants, no policies)
--   authenticated   SELECT, INSERT, UPDATE (the five business columns) own row; no DELETE
--   service_role    SELECT, INSERT, UPDATE, DELETE (bypasses RLS)

-- ── Closed-set array validator ─────────────────────────────────────────────────
--
-- PostgreSQL cannot express "no duplicates" in a plain CHECK (subqueries and
-- set-returning functions are not allowed there), so this one small helper exists.
-- It is used only by this table's constraints. A CHECK evaluates it with the writing
-- role's privileges, so that role needs EXECUTE (granted below).
--   true  <=>  not null, every element is in `allowed`, no NULL element, no duplicate
--   IMMUTABLE         depends only on its arguments
--   SECURITY INVOKER  reads nothing but its arguments
--   search_path = ''  every non-pg_catalog name is schema-qualified

create function public.taste_array_is_valid(vals text[], allowed text[])
  returns boolean
  language sql
  immutable
  security invoker
  set search_path = ''
as $$
  select vals is not null
     and allowed is not null
     and vals <@ allowed
     and pg_catalog.cardinality(vals) = (select pg_catalog.count(distinct v) from pg_catalog.unnest(vals) as v)
$$;

revoke all on function public.taste_array_is_valid(text[], text[]) from public, anon, authenticated, service_role;
grant execute on function public.taste_array_is_valid(text[], text[]) to authenticated, service_role;

comment on function public.taste_array_is_valid(text[], text[]) is
  'True when vals is a non-null, duplicate-free array whose elements are all in allowed. Used only by user_taste_profiles constraints.';

-- ── Table ──────────────────────────────────────────────────────────────────────

create table public.user_taste_profiles (
  user_id            uuid        primary key default auth.uid()
                                 references auth.users (id) on delete cascade,
  schema_version     smallint    not null default 1,
  interests          text[]      not null default '{}',
  usual_company      text[]      not null default '{}',
  setting            text,
  profile_updated_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint user_taste_profiles_schema_version_known check (schema_version = 1),
  constraint user_taste_profiles_interests_domain check (
    public.taste_array_is_valid(
      interests,
      array['padel', 'football', 'entertainment', 'kids-family', 'sports',
            'billiards', 'water-beach', 'adventure', 'wellness']::text[]
    )
  ),
  constraint user_taste_profiles_company_domain check (
    public.taste_array_is_valid(
      usual_company,
      array['friends', 'partner', 'family', 'solo']::text[]
    )
  ),
  -- NULL (no preference) satisfies the check by SQL semantics.
  constraint user_taste_profiles_setting_domain check (setting in ('indoor', 'outdoor'))
);

-- ── RLS + privileges ───────────────────────────────────────────────────────────

alter table public.user_taste_profiles enable row level security;

revoke all on table public.user_taste_profiles from anon;
revoke all on table public.user_taste_profiles from authenticated;
revoke all on table public.user_taste_profiles from service_role;

grant select, insert on table public.user_taste_profiles to authenticated;
-- Column-level: user_id and created_at are immutable for clients; no DELETE.
grant update (schema_version, interests, usual_company, setting, profile_updated_at)
  on table public.user_taste_profiles to authenticated;
grant select, insert, update, delete on table public.user_taste_profiles to service_role;

create policy "authenticated users can select own taste profile"
  on public.user_taste_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "authenticated users can insert own taste profile"
  on public.user_taste_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "authenticated users can update own taste profile"
  on public.user_taste_profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- INSERT as well as UPDATE: a client may name updated_at in an INSERT, and the server value wins.
create trigger set_updated_at
  before insert or update on public.user_taste_profiles
  for each row
  execute function public.set_updated_at();

comment on table public.user_taste_profiles is
  'Account-sync taste profile (interests, usual company, setting). Not public.profiles. profile_updated_at is the client last-write-wins key. See docs/database/sync-schema.md.';
