-- Catalog-level assertions for the five Phase 2 tables and three functions: RLS, policies,
-- table / column / function privileges, ownership and absence of sequences.
-- Prepended by the runner with _helpers.sql.

-- ── RLS is enabled on every new table (and not forced, like the existing tables) ─
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname in ('user_saved_venues','user_collections','user_collection_items','user_outings','user_taste_profiles')),
  5, 'RLS is enabled on all five new tables');
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relforcerowsecurity
      and c.relname in ('user_saved_venues','user_collections','user_collection_items','user_outings','user_taste_profiles')),
  0, 'RLS is not forced (consistent with the existing tables)');
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in
      ('user_saved_venues','user_collections','user_collection_items','user_outings','user_taste_profiles')
      and pg_get_userbyid(c.relowner) = 'postgres'),
  5, 'all five tables are owned by postgres (the migration role, as in production)');

-- ── The exact policy set ───────────────────────────────────────────────────────
select set_eq(
  $$select tablename || '|' || policyname || '|' || cmd from pg_policies where schemaname = 'public'
     and tablename in ('user_saved_venues','user_collections','user_collection_items','user_outings','user_taste_profiles')$$,
  $$values
    ('user_saved_venues|authenticated users can select own saved venues|SELECT'),
    ('user_saved_venues|authenticated users can insert own saved venues|INSERT'),
    ('user_saved_venues|authenticated users can delete own saved venues|DELETE'),
    ('user_collections|authenticated users can select own collections|SELECT'),
    ('user_collections|authenticated users can insert own collections|INSERT'),
    ('user_collections|authenticated users can update own collections|UPDATE'),
    ('user_collections|authenticated users can delete own collections|DELETE'),
    ('user_collection_items|authenticated users can select own collection items|SELECT'),
    ('user_collection_items|authenticated users can insert own collection items|INSERT'),
    ('user_collection_items|authenticated users can delete own collection items|DELETE'),
    ('user_outings|authenticated users can select own outings|SELECT'),
    ('user_outings|authenticated users can insert own outings|INSERT'),
    ('user_outings|authenticated users can update own outings|UPDATE'),
    ('user_outings|authenticated users can delete own outings|DELETE'),
    ('user_taste_profiles|authenticated users can select own taste profile|SELECT'),
    ('user_taste_profiles|authenticated users can insert own taste profile|INSERT'),
    ('user_taste_profiles|authenticated users can update own taste profile|UPDATE')$$,
  'exactly the 17 designed policies exist (no policy for UPDATE on saved venues / items, none for DELETE on taste profiles)');

select is(
  (select count(*)::int from pg_policies where schemaname = 'public'
     and tablename in ('user_saved_venues','user_collections','user_collection_items','user_outings','user_taste_profiles')
     and roles <> '{authenticated}'::name[]),
  0, 'every policy is to authenticated only');
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'
     and tablename in ('user_saved_venues','user_collections','user_collection_items','user_outings','user_taste_profiles')
     and 'anon' = any (roles)),
  0, 'anon has no policy');
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'
     and tablename in ('user_saved_venues','user_collections','user_collection_items','user_outings','user_taste_profiles')
     and not (coalesce(qual, with_check) ~ 'auth\.uid\(\)' and coalesce(qual, with_check) ~ 'user_id')),
  0, 'every policy expression is an own-row auth.uid() = user_id test');
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'
     and tablename in ('user_saved_venues','user_collections','user_collection_items','user_outings','user_taste_profiles')
     and (qual = 'true' or with_check = 'true')),
  0, 'no policy is USING (true) or WITH CHECK (true)');
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'
     and tablename in ('user_saved_venues','user_collections','user_collection_items','user_outings','user_taste_profiles')
     and coalesce(qual, with_check) !~ '\( SELECT auth\.uid\(\) AS uid\)'),
  0, 'every policy wraps the call as (select auth.uid()) so it is evaluated once per statement');

-- ── Table privileges: every role x every privilege ─────────────────────────────
create temp table t_expected_table_privs (tbl text, role_name text, priv text, expected boolean);
insert into t_expected_table_privs
select t.tbl, r.role_name, p.priv,
  case when r.role_name = 'anon' then false
       when r.role_name = 'authenticated' then
         case p.priv
           when 'SELECT' then true
           when 'INSERT' then true
           when 'DELETE' then t.tbl <> 'user_taste_profiles'
           else false end                              -- UPDATE is column-level only; none of the structural ones
       when r.role_name = 'service_role' then p.priv in ('SELECT','INSERT','UPDATE','DELETE')
  end
from (values ('user_saved_venues'),('user_collections'),('user_collection_items'),('user_outings'),('user_taste_profiles')) as t(tbl)
cross join (values ('anon'),('authenticated'),('service_role')) as r(role_name)
cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) as p(priv);

select is(
  (select count(*)::int from t_expected_table_privs
    where has_table_privilege(role_name, 'public.' || tbl, priv) is distinct from expected),
  0, 'table-level privileges match the design exactly for anon, authenticated and service_role (75 x 8 = 120 checks)');
select is((select count(*)::int from t_expected_table_privs), 120, 'the privilege matrix really covered 120 combinations');

-- authenticated / service_role hold NONE of the structural privileges anywhere
select is(
  (select count(*)::int from t_expected_table_privs
    where priv in ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN') and has_table_privilege(role_name, 'public.' || tbl, priv)),
  0, 'no role holds TRUNCATE, REFERENCES, TRIGGER or MAINTAIN on any new table');

-- ── Column-level UPDATE ────────────────────────────────────────────────────────
create temp table t_expected_col_update (tbl text, col text, expected boolean);
insert into t_expected_col_update values
  ('user_collections','id',false),('user_collections','user_id',false),('user_collections','name',true),
  ('user_collections','created_at',false),('user_collections','updated_at',false),
  ('user_outings','id',false),('user_outings','user_id',false),('user_outings','schema_version',true),
  ('user_outings','payload',true),('user_outings','created_at',false),('user_outings','updated_at',false),
  ('user_taste_profiles','user_id',false),('user_taste_profiles','schema_version',true),
  ('user_taste_profiles','interests',true),('user_taste_profiles','usual_company',true),
  ('user_taste_profiles','setting',true),('user_taste_profiles','profile_updated_at',true),
  ('user_taste_profiles','created_at',false),('user_taste_profiles','updated_at',false);
select is(
  (select count(*)::int from t_expected_col_update
    where has_column_privilege('authenticated', 'public.' || tbl, col, 'UPDATE') is distinct from expected),
  0, 'authenticated may UPDATE exactly the designed business columns (never id, user_id, created_at, updated_at)');
select ok(
  not has_any_column_privilege('authenticated', 'public.user_saved_venues', 'UPDATE')
  and not has_any_column_privilege('authenticated', 'public.user_collection_items', 'UPDATE'),
  'authenticated can UPDATE no column of saved venues or collection items');
select ok(
  not has_any_column_privilege('anon', 'public.user_saved_venues', 'SELECT')
  and not has_any_column_privilege('anon', 'public.user_collections', 'SELECT')
  and not has_any_column_privilege('anon', 'public.user_collection_items', 'SELECT')
  and not has_any_column_privilege('anon', 'public.user_outings', 'SELECT')
  and not has_any_column_privilege('anon', 'public.user_taste_profiles', 'SELECT'),
  'anon can read no column of any new table');

-- ── Roles ──────────────────────────────────────────────────────────────────────
select ok((select rolbypassrls from pg_roles where rolname = 'service_role'), 'service_role bypasses RLS (admin / maintenance path)');
select ok(not (select rolbypassrls from pg_roles where rolname = 'authenticated'), 'authenticated does not bypass RLS');
select ok(not (select rolbypassrls from pg_roles where rolname = 'anon'), 'anon does not bypass RLS');

-- ── Functions ──────────────────────────────────────────────────────────────────
select ok(
  not has_function_privilege('anon', 'public.set_updated_at()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.set_updated_at()', 'EXECUTE'),
  'set_updated_at() is executable by none of anon, authenticated, service_role');
select ok(
  has_function_privilege('authenticated', 'public.is_valid_outing_payload_v1(jsonb)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.is_valid_outing_payload_v1(jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.is_valid_outing_payload_v1(jsonb)', 'EXECUTE'),
  'the outing validator is executable by authenticated and service_role only');
select ok(
  has_function_privilege('authenticated', 'public.taste_array_is_valid(text[],text[])', 'EXECUTE')
  and has_function_privilege('service_role', 'public.taste_array_is_valid(text[],text[])', 'EXECUTE')
  and not has_function_privilege('anon', 'public.taste_array_is_valid(text[],text[])', 'EXECUTE'),
  'the taste-array validator is executable by authenticated and service_role only');
select is(
  (select count(*)::int from pg_proc p, aclexplode(p.proacl) a
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('set_updated_at','is_valid_outing_payload_v1','taste_array_is_valid') and a.grantee = 0),
  0, 'PUBLIC holds no EXECUTE on any of the three new functions');
select is(
  (select count(*)::int from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('set_updated_at','is_valid_outing_payload_v1','taste_array_is_valid') and p.prosecdef),
  0, 'none of the new functions is SECURITY DEFINER');
select is(
  (select count(*)::int from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('set_updated_at','is_valid_outing_payload_v1','taste_array_is_valid')
    and not ('search_path=""' = any (p.proconfig))),
  0, 'every new function pins search_path to the empty string');
select is(
  (select count(*)::int from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('is_valid_outing_payload_v1','taste_array_is_valid') and p.provolatile <> 'i'),
  0, 'the two validators are IMMUTABLE');

-- ── Triggers and sequences ─────────────────────────────────────────────────────
select set_eq(
  $$select tgrelid::regclass::text from pg_trigger where not tgisinternal and tgname = 'set_updated_at'$$,
  $$values ('user_collections'), ('user_outings'), ('user_taste_profiles')$$,
  'the updated_at trigger exists exactly on collections, outings and taste profiles');
select is(
  (select count(*)::int from pg_trigger where not tgisinternal and tgname = 'set_updated_at' and tgtype = 23),
  3, 'each updated_at trigger is BEFORE, FOR EACH ROW, on INSERT and UPDATE (tgtype 23 = row + before + insert + update)');
select is(
  (select count(*)::int from pg_trigger where not tgisinternal and tgname = 'set_updated_at' and tgtype & (8 | 32) <> 0),
  0, 'and none fires on DELETE or TRUNCATE');
select is(
  (select count(*)::int from pg_class where relkind = 'S' and relnamespace = 'public'::regnamespace and relname like 'user\_%'),
  0, 'no sequences were created (all keys are UUID or composite)');

-- ── Defaults that matter ───────────────────────────────────────────────────────
select is(
  (select pg_get_expr(d.adbin, d.adrelid) from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    where d.adrelid = 'public.user_collections'::regclass and a.attname = 'id'),
  null::text, 'user_collections.id has NO default (client-supplied UUID)');
select is(
  (select pg_get_expr(d.adbin, d.adrelid) from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    where d.adrelid = 'public.user_outings'::regclass and a.attname = 'id'),
  null::text, 'user_outings.id has NO default (client-supplied UUID)');

select * from finish();
rollback;
