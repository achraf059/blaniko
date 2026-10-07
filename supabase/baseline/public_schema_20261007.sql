-- ============================================================================
-- BLANIKO BASELINE — REFERENCE / LOCAL BOOTSTRAP ONLY
-- DO NOT APPLY TO PRODUCTION
-- ============================================================================
-- Pre-Phase-2 baseline of the Blaniko Supabase project (ref vptjbfoaqmbdjdqwloae), captured 2026-10-07.
-- This is NOT a migration. It must never be moved under supabase/migrations/ and has no
-- automatic production application path. See supabase/baseline/README.md.
-- PUBLIC SCHEMA ONLY: tables, constraints, indexes, RLS, policies, grants, functions, comments, and the
-- database-level event trigger that belongs to public.rls_auto_enable(). Generated from the live
-- catalogs by read-only SELECTs (not pg_dump). No row data. Load as supabase_admin (an event trigger
-- needs superuser) into a DISPOSABLE local database that already has the Supabase roles and auth schema.

do $$
begin
  if to_regclass('public.venues') is not null then
    raise exception 'BLANIKO BASELINE refuses to run: public.venues already exists (this looks like a populated database)';
  end if;
end;
$$;

-- The objects below are owned by postgres in production, so they are created as postgres. (Run this file as
-- supabase_admin: the guard above and the event trigger at the end need a superuser.)
set role postgres;

-- ── Default privileges: role postgres, schema public (reproduces the live pg_default_acl rows) ──
-- Production's defaults for new public objects created by postgres are narrower than a stock Supabase
-- image's. They matter because they decide what a NEW table or function inherits (see 16_default_acls).
-- Each block clears the entry and re-states exactly the live one. Only future objects are affected.

alter default privileges for role postgres in schema public revoke all on sequences from public, postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant update on sequences to anon;
alter default privileges for role postgres in schema public grant update on sequences to authenticated;
alter default privileges for role postgres in schema public grant select, update, usage on sequences to postgres;
alter default privileges for role postgres in schema public grant update on sequences to service_role;

alter default privileges for role postgres in schema public revoke all on functions from public, postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant execute on functions to postgres;

alter default privileges for role postgres in schema public revoke all on tables from public, postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant truncate, references, trigger, maintain on tables to anon;
alter default privileges for role postgres in schema public grant truncate, references, trigger, maintain on tables to authenticated;
alter default privileges for role postgres in schema public grant insert, select, update, delete, truncate, references, trigger, maintain on tables to postgres;
alter default privileges for role postgres in schema public grant truncate, references, trigger, maintain on tables to service_role;


-- ── Tables ─────────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid not null,
  email text not null,
  language text default 'en'::text not null,
  theme text default 'light'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.user_favorites (
  user_id uuid not null,
  venue_slug text not null,
  created_at timestamp with time zone default now() not null
);

create table public.venue_claims (
  id uuid default gen_random_uuid() not null,
  type text not null,
  venue_slug text,
  venue_name text,
  contact_name text not null,
  contact_email text not null,
  contact_whatsapp text,
  role_at_venue text,
  message text not null,
  official_website text,
  instagram text,
  language text default 'en'::text not null,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  reviewed_at timestamp with time zone,
  admin_notes text
);

create table public.venues (
  id uuid default gen_random_uuid() not null,
  external_id text not null,
  name text not null,
  slug text not null,
  category text not null,
  subcategory text,
  region text,
  neighborhood text,
  address text,
  google_maps_link text,
  phone text,
  short_description text,
  image_url text,
  is_active boolean default true not null,
  source text default 'v0_seed'::text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  lat double precision,
  lng double precision,
  price_level text,
  overview text,
  vibe text,
  audience text,
  additional_experiences text[],
  location_text text,
  google_maps_url text,
  contact_information text,
  audience_tags text[],
  experience_description text,
  atmosphere_tags text[],
  indoor_outdoor text,
  facebook text,
  opening_hours_raw text,
  booking_method text[],
  booking_link text,
  research_status text,
  verification_level text,
  last_verified_date date,
  verified_by text,
  price text,
  price_details text,
  best_for_tags text[],
  space_type text,
  time_of_day text[],
  website text,
  instagram text,
  detail_image_url text
);

create table public.waitlist_emails (
  id uuid default gen_random_uuid() not null,
  email text not null,
  source text default 'homepage_footer'::text not null,
  language text default 'en'::text not null,
  page text default '/'::text not null,
  created_at timestamp with time zone default now() not null
);

-- ── Constraints (primary key, unique, check, then foreign keys) ────────────────

alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.user_favorites add constraint user_favorites_pkey PRIMARY KEY (user_id, venue_slug);
alter table public.venue_claims add constraint venue_claims_pkey PRIMARY KEY (id);
alter table public.venues add constraint venues_pkey PRIMARY KEY (id);
alter table public.waitlist_emails add constraint waitlist_emails_pkey PRIMARY KEY (id);
alter table public.venues add constraint venues_external_id_key UNIQUE (external_id);
alter table public.venues add constraint venues_slug_key UNIQUE (slug);
alter table public.waitlist_emails add constraint waitlist_emails_email_key UNIQUE (email);
alter table public.profiles add constraint profiles_language_check CHECK ((language = ANY (ARRAY['en'::text, 'fr'::text])));
alter table public.profiles add constraint profiles_theme_check CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text])));
alter table public.venue_claims add constraint venue_claims_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'approved'::text, 'rejected'::text])));
alter table public.venue_claims add constraint venue_claims_type_check CHECK ((type = ANY (ARRAY['claim'::text, 'listing'::text])));
alter table public.venues add constraint venues_indoor_outdoor_check CHECK ((indoor_outdoor = ANY (ARRAY['Indoor'::text, 'Outdoor'::text, 'Indoor / Outdoor'::text])));
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.user_favorites add constraint user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── Indexes (those not backing a constraint) ───────────────────────────────────

CREATE INDEX user_favorites_user_id ON public.user_favorites USING btree (user_id);
CREATE INDEX venue_claims_status_created ON public.venue_claims USING btree (status, created_at DESC);
CREATE INDEX idx_venues_atmosphere_tags ON public.venues USING gin (atmosphere_tags);
CREATE INDEX idx_venues_audience_tags ON public.venues USING gin (audience_tags);
CREATE INDEX idx_venues_category ON public.venues USING btree (category);
CREATE INDEX idx_venues_is_active ON public.venues USING btree (is_active) WHERE (is_active = true);
CREATE INDEX waitlist_emails_created_at_idx ON public.waitlist_emails USING btree (created_at DESC);

-- ── Row level security ─────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.user_favorites enable row level security;
alter table public.venue_claims enable row level security;
alter table public.venues enable row level security;
alter table public.waitlist_emails enable row level security;

-- ── Policies ───────────────────────────────────────────────────────────────────

create policy "authenticated users can insert own profile" on public.profiles as permissive for insert to authenticated
  with check ((auth.uid() = id));
create policy "authenticated users can select own profile" on public.profiles as permissive for select to authenticated
  using ((auth.uid() = id));
create policy "authenticated users can update own profile" on public.profiles as permissive for update to authenticated
  using ((auth.uid() = id))
  with check ((auth.uid() = id));
create policy "authenticated users can delete own favorites" on public.user_favorites as permissive for delete to authenticated
  using ((auth.uid() = user_id));
create policy "authenticated users can insert own favorites" on public.user_favorites as permissive for insert to authenticated
  with check ((auth.uid() = user_id));
create policy "authenticated users can select own favorites" on public.user_favorites as permissive for select to authenticated
  using ((auth.uid() = user_id));

-- ── Table privileges (reproduce the live ACLs; start from nothing so local defaults do not leak in) ──

revoke all on table public.profiles from public, anon, authenticated, service_role;
grant MAINTAIN, REFERENCES, TRIGGER, TRUNCATE on table public.profiles to anon;
grant INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.profiles to authenticated;
grant INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.profiles to service_role;
revoke all on table public.user_favorites from public, anon, authenticated, service_role;
grant MAINTAIN, REFERENCES, TRIGGER, TRUNCATE on table public.user_favorites to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.user_favorites to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.user_favorites to service_role;
revoke all on table public.venue_claims from public, anon, authenticated, service_role;
grant MAINTAIN, REFERENCES, TRIGGER, TRUNCATE on table public.venue_claims to anon;
grant MAINTAIN, REFERENCES, TRIGGER, TRUNCATE on table public.venue_claims to authenticated;
grant INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.venue_claims to service_role;
revoke all on table public.venues from public, anon, authenticated, service_role;
grant MAINTAIN, REFERENCES, TRIGGER, TRUNCATE on table public.venues to anon;
grant MAINTAIN, REFERENCES, TRIGGER, TRUNCATE on table public.venues to authenticated;
grant MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.venues to service_role;
revoke all on table public.waitlist_emails from public, anon, authenticated, service_role;
grant MAINTAIN, REFERENCES, TRIGGER, TRUNCATE on table public.waitlist_emails to anon;
grant MAINTAIN, REFERENCES, TRIGGER, TRUNCATE on table public.waitlist_emails to authenticated;
grant INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.waitlist_emails to service_role;

-- ── Functions ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$function$;
-- handle_new_user(): the live ACL is the DEFAULT (NULL proacl, so EXECUTE through PUBLIC); a local load applies this
-- database's default privileges instead. Effective EXECUTE is what the verification compares.

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;
revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;
grant execute on function public.rls_auto_enable() to anon;
grant execute on function public.rls_auto_enable() to authenticated;
grant execute on function public.rls_auto_enable() to public;
grant execute on function public.rls_auto_enable() to service_role;

-- ── Comments ───────────────────────────────────────────────────────────────────

-- (no comments exist)

-- ── Database-level event trigger of public.rls_auto_enable() ────────────────────
-- Cannot be reconstructed from a schema-only dump of public (event triggers are database objects).
-- Creating an event trigger needs a superuser, so switch back from postgres first.
-- Live owner of this event trigger is postgres; an event trigger created here is owned by the superuser that
-- creates it (PostgreSQL requires event trigger owners to be superusers). A local load therefore differs in
-- evtowner only; the regression comparison records that difference.

-- PostgreSQL requires a superuser-owned event trigger to call a superuser-owned function, so the function is
-- handed to the superuser only while the trigger is created, then returned to postgres (its live owner).
reset role;
alter function public.rls_auto_enable() owner to supabase_admin;
create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();
alter function public.rls_auto_enable() owner to postgres;
