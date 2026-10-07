-- ============================================================================
-- BLANIKO BASELINE — REFERENCE / LOCAL BOOTSTRAP ONLY
-- DO NOT APPLY TO PRODUCTION
-- (Nothing in this file is "applied": every statement is a read-only SELECT. Running it against
--  production for catalog VERIFICATION, as it was run to produce the snapshot, is the one permitted use.)
-- ============================================================================
-- READ ONLY / SAFE FOR PRODUCTION CATALOG VERIFICATION
-- ============================================================================
-- Catalog-only SELECT statements. NOTHING here modifies anything: no DDL, no DML, no
-- privilege change, no function call with side effects. Every statement returns a single text
-- column named `line`, ordered, so the output can be diffed between databases.
--
-- Used with supabase/baseline/catalog_snapshot_20261007.txt (the live pre-Phase-2 output) to compare a
-- local database, before and after the Phase 2 migrations, against production. Output contains
-- metadata only: no user data, no emails, no auth.users rows, no secrets.
--
-- Format: each statement is preceded by a line `-- ## <name>`; the runner splits on those markers.
-- Run locally:  psql -tA -f supabase/baseline/verify_baseline.sql   (one result set per statement).
-- ============================================================================

-- ## 01_migrations
-- Applied migration versions and names (metadata only, never the statements).
select version || '|' || name as line from supabase_migrations.schema_migrations order by version;

-- ## 02_extensions
-- Installed extensions.
select e.extname || '|' || e.extversion || '|' || n.nspname as line from pg_extension e join pg_namespace n on n.oid = e.extnamespace order by 1;

-- ## 03_roles
-- Role attributes that matter for RLS and privileges.
select r.rolname || '|super=' || r.rolsuper::text || '|bypassrls=' || r.rolbypassrls::text || '|login=' || r.rolcanlogin::text || '|inherit=' || r.rolinherit::text as line from pg_roles r where r.rolname in ('anon','authenticated','service_role','postgres','supabase_admin','authenticator') order by 1;

-- ## 04_public_relations
-- Relations in public: kind, owner, RLS flags, options, raw ACL.
select c.relname || '|' || c.relkind::text || '|' || pg_get_userbyid(c.relowner) || '|rls=' || c.relrowsecurity::text || '|forced=' || c.relforcerowsecurity::text || '|opts=' || coalesce(c.reloptions::text, '') || '|acl=' || coalesce((select string_agg(x::text, ',' order by x::text) from unnest(c.relacl) as x), '<default>') as line from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind not in ('i','I','c','t') order by c.relname;

-- ## 05_public_columns
-- Columns of public tables: position, name, type, nullability, default, identity, generated, collation.
select c.relname || '|' || a.attnum::text || '|' || a.attname || '|' || format_type(a.atttypid, a.atttypmod) || '|notnull=' || a.attnotnull::text || '|default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '<none>') || '|identity=' || a.attidentity::text || '|generated=' || a.attgenerated::text || '|collation=' || case when a.attcollation <> t.typcollation then a.attcollation::regcollation::text else '<default>' end as line from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_type t on t.oid = a.atttypid left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped order by c.relname, a.attnum;

-- ## 06_public_constraints
-- Constraints (primary key, unique, check, foreign key) of public tables.
select c.conrelid::regclass::text || '|' || c.conname || '|' || c.contype::text || '|' || pg_get_constraintdef(c.oid) as line from pg_constraint c where c.conrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace) order by 1;

-- ## 07_public_indexes
-- Indexes in public.
select tablename || '|' || indexname || '|' || indexdef as line from pg_indexes where schemaname = 'public' order by 1;

-- ## 08_public_policies
-- RLS policies in public.
select tablename || '|' || policyname || '|' || permissive || '|' || roles::text || '|' || cmd || '|using=' || coalesce(qual, '<none>') || '|check=' || coalesce(with_check, '<none>') as line from pg_policies where schemaname = 'public' order by 1;

-- ## 09_public_table_privileges
-- Table privileges per grantee (expanded ACL, owner included).
select c.relname || '|' || case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end || '|' || a.privilege_type || '|grantable=' || a.is_grantable::text as line from pg_class c cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1;

-- ## 10_public_column_privileges
-- Column-level privileges in public (empty when none).
select c.relname || '.' || a.attname || '|' || case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end || '|' || x.privilege_type as line from pg_attribute a join pg_class c on c.oid = a.attrelid cross join lateral aclexplode(a.attacl) x where c.relnamespace = 'public'::regnamespace and a.attacl is not null and not a.attisdropped order by 1;

-- ## 11_public_table_effective_privileges
-- Effective table privileges for anon, authenticated and service_role.
select c.relname || '|' || r.rolname || '|' || pr.priv || '|' || has_table_privilege(r.rolname, c.oid, pr.priv)::text as line from pg_class c cross join (select rolname from pg_roles where rolname in ('anon','authenticated','service_role')) r cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) as pr(priv) where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1;

-- ## 12_public_functions
-- Functions in public: signature, owner, security, volatility, config, raw ACL, md5 of the definition.
select p.oid::regprocedure::text || '|' || p.prokind::text || '|' || pg_get_userbyid(p.proowner) || '|secdef=' || p.prosecdef::text || '|volatility=' || p.provolatile::text || '|strict=' || p.proisstrict::text || '|config=' || coalesce(p.proconfig::text, '') || '|returns=' || p.prorettype::regtype::text || '|acl=' || coalesce((select string_agg(x::text, ',' order by x::text) from unnest(p.proacl) as x), '<default>') || '|def_md5=' || md5(pg_get_functiondef(p.oid)) as line from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1;

-- ## 13_public_function_effective_execute
-- Effective EXECUTE on public functions for anon, authenticated and service_role.
select p.oid::regprocedure::text || '|' || r.rolname || '|execute=' || has_function_privilege(r.rolname, p.oid, 'EXECUTE')::text as line from pg_proc p cross join (select rolname from pg_roles where rolname in ('anon','authenticated','service_role')) r where p.pronamespace = 'public'::regnamespace order by 1;

-- ## 14_triggers
-- Non-internal triggers on public tables and on auth.users.
select t.tgrelid::regclass::text || '|' || t.tgname || '|enabled=' || t.tgenabled::text || '|' || pg_get_triggerdef(t.oid) as line from pg_trigger t where not t.tgisinternal and (t.tgrelid = 'auth.users'::regclass or t.tgrelid in (select c.oid from pg_class c where c.relnamespace = 'public'::regnamespace)) order by 1;

-- ## 15_event_triggers
-- Event triggers (database level).
select e.evtname || '|' || e.evtevent || '|owner=' || pg_get_userbyid(e.evtowner) || '|fn=' || e.evtfoid::regproc::text || '|tags=' || coalesce(e.evttags::text, '<all>') || '|enabled=' || e.evtenabled::text as line from pg_event_trigger e order by 1;

-- ## 16_default_acls
-- Default privileges (ALTER DEFAULT PRIVILEGES) in effect, any schema.
select pg_get_userbyid(d.defaclrole) || '|' || d.defaclnamespace::regnamespace::text || '|' || d.defaclobjtype::text || '|' || coalesce((select string_agg(x::text, ',' order by x::text) from unnest(d.defaclacl) as x), '<default>') as line from pg_default_acl d order by 1;

-- ## 17_schema_acls
-- Schema owners and ACLs for public, auth and storage.
select n.nspname || '|' || pg_get_userbyid(n.nspowner) || '|' || coalesce((select string_agg(x::text, ',' order by x::text) from unnest(n.nspacl) as x), '<default>') as line from pg_namespace n where n.nspname in ('public','auth','storage') order by 1;

-- ## 18_storage_bucket_venue_images
-- Configuration of the venue-images bucket (no objects, no owner ids).
select b.id || '|name=' || b.name || '|public=' || b.public::text || '|file_size_limit=' || coalesce(b.file_size_limit::text, '<none>') || '|allowed_mime_types=' || coalesce(b.allowed_mime_types::text, '<none>') || '|avif_autodetection=' || coalesce(b.avif_autodetection::text, '<null>') || '|type=' || b.type::text as line from storage.buckets b where b.id = 'venue-images';

-- ## 19_storage_rls_and_policies
-- RLS flags and policies on storage.objects and storage.buckets.
select x.line from (select 'rel|' || c.relname || '|rls=' || c.relrowsecurity::text || '|forced=' || c.relforcerowsecurity::text as line from pg_class c where c.relnamespace = 'storage'::regnamespace and c.relname in ('objects','buckets') union all select 'policy|' || p.tablename || '|' || p.policyname || '|' || p.cmd || '|' || p.roles::text || '|' || coalesce(p.qual, '') || '|' || coalesce(p.with_check, '') as line from pg_policies p where p.schemaname = 'storage' and p.tablename in ('objects','buckets')) x order by 1;

-- ## 20_public_comments
-- Comments on public tables, columns and functions.
select x.line from (select 'table|' || c.relname || '|' || obj_description(c.oid, 'pg_class') as line from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and obj_description(c.oid, 'pg_class') is not null union all select 'column|' || c.relname || '.' || a.attname || '|' || col_description(c.oid, a.attnum) as line from pg_class c join pg_attribute a on a.attrelid = c.oid where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped and col_description(c.oid, a.attnum) is not null union all select 'function|' || p.oid::regprocedure::text || '|' || obj_description(p.oid, 'pg_proc') as line from pg_proc p where p.pronamespace = 'public'::regnamespace and obj_description(p.oid, 'pg_proc') is not null) x order by 1;

