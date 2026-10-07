-- Semantics experiments. These PROVE, rather than assume, the PostgreSQL / Supabase
-- behaviours the Phase 2 design relies on. Prepended by the runner with _helpers.sql.

-- ── A. The harness reproduces the live default-ACL problem ─────────────────────
-- A scratch table created by `postgres` in public inherits REFERENCES / TRIGGER / TRUNCATE
-- / MAINTAIN for anon and authenticated (as production does). If this precondition were
-- false the REVOKE tests below would prove nothing.
set local role postgres;
create table public.t_acl_probe (id int);
reset role;

select ok(has_table_privilege('anon', 'public.t_acl_probe', 'TRUNCATE'),
  'precondition: anon inherits TRUNCATE on a new public table');
select ok(has_table_privilege('authenticated', 'public.t_acl_probe', 'MAINTAIN'),
  'precondition: authenticated inherits MAINTAIN (PG17) on a new public table');
select ok(has_table_privilege('authenticated', 'public.t_acl_probe', 'REFERENCES'),
  'precondition: authenticated inherits REFERENCES');
select ok(has_table_privilege('authenticated', 'public.t_acl_probe', 'TRIGGER'),
  'precondition: authenticated inherits TRIGGER');

revoke all on table public.t_acl_probe from anon;
revoke all on table public.t_acl_probe from authenticated;
revoke all on table public.t_acl_probe from service_role;

select ok(
  not has_table_privilege('anon', 'public.t_acl_probe', 'TRUNCATE')
  and not has_table_privilege('anon', 'public.t_acl_probe', 'MAINTAIN')
  and not has_table_privilege('authenticated', 'public.t_acl_probe', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'public.t_acl_probe', 'MAINTAIN')
  and not has_table_privilege('authenticated', 'public.t_acl_probe', 'REFERENCES')
  and not has_table_privilege('authenticated', 'public.t_acl_probe', 'TRIGGER')
  and not has_table_privilege('service_role', 'public.t_acl_probe', 'TRUNCATE')
  and not has_table_privilege('service_role', 'public.t_acl_probe', 'MAINTAIN'),
  'REVOKE ALL removes TRUNCATE, MAINTAIN, REFERENCES and TRIGGER (including PG17 MAINTAIN)');

select ok(
  has_table_privilege('postgres', 'public.t_acl_probe', 'MAINTAIN'),
  'the owner keeps its own privileges after the revoke');

-- ── B. A trigger fires without the caller holding EXECUTE on its function ───────
reset role;
select ok(not has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE'),
  'authenticated has no EXECUTE on set_updated_at()');

-- The trigger also runs on INSERT now, so a back-dated fixture needs it switched off for the
-- fixture insert only (inside this transaction, which is rolled back).
alter table public.user_collections disable trigger set_updated_at;
insert into public.user_collections (id, user_id, name, created_at, updated_at)
values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'before', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z');
alter table public.user_collections enable trigger set_updated_at;
select is((select tgenabled from pg_trigger where tgrelid = 'public.user_collections'::regclass and tgname = 'set_updated_at'),
  'O', 'the trigger is enabled again after the fixture insert');
select is((select updated_at from public.user_collections where id = '11111111-1111-4111-8111-111111111111'),
  '2000-01-01T00:00:00Z'::timestamptz, 'precondition: the fixture really carries the back-dated updated_at');

select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$update public.user_collections set name = 'after'
  where id = '11111111-1111-4111-8111-111111111111'$q$), 'OK',
  'authenticated may update the business column (name)');
reset role;

select ok((select updated_at > '2020-01-01'::timestamptz from public.user_collections
  where id = '11111111-1111-4111-8111-111111111111'),
  'the trigger fired and wrote updated_at although authenticated holds no EXECUTE and only a column-level UPDATE on name');
select is((select name from public.user_collections where id = '11111111-1111-4111-8111-111111111111'),
  'after', 'the business update itself was applied');

select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$update public.user_collections set updated_at = '2001-01-01'
  where id = '11111111-1111-4111-8111-111111111111'$q$), '42501',
  'a client cannot write updated_at directly (no column privilege)');
reset role;

-- ── C. A CHECK-constraint function is evaluated with the WRITER'S privileges ───
-- This is why the two validator helpers are granted EXECUTE to authenticated. Proven by
-- revoking it and observing the insert fail (inside this transaction, rolled back later).
revoke execute on function public.is_valid_outing_payload_v1(jsonb) from authenticated;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$insert into public.user_outings (id, schema_version, payload) values
  ('22222222-2222-4222-8222-222222222222', 1,
   '{"name":{"en":"x"},"stopIds":[],"answers":{}}')$q$), '42501',
  'without EXECUTE on the validator an authenticated insert fails (permission denied for function)');
reset role;
grant execute on function public.is_valid_outing_payload_v1(jsonb) to authenticated;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$insert into public.user_outings (id, schema_version, payload) values
  ('22222222-2222-4222-8222-222222222222', 1,
   '{"name":{"en":"x"},"stopIds":[],"answers":{}}')$q$), 'OK',
  'with the intended EXECUTE grant the same insert succeeds');
reset role;

-- ── D. Create / upsert semantics under RLS and column-level grants ─────────────
-- Create is INSERT .. ON CONFLICT (id) DO NOTHING; a merge-upsert (DO UPDATE of the
-- immutable columns) is not available to clients.
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$insert into public.user_collections (id, name)
  values ('33333333-3333-4333-8333-333333333333', 'first') on conflict (id) do nothing$q$), 'OK',
  'ON CONFLICT (id) DO NOTHING creates a new collection');
select is(public.t_state($q$insert into public.user_collections (id, name)
  values ('33333333-3333-4333-8333-333333333333', 'second') on conflict (id) do nothing$q$), 'OK',
  'repeating the same create is absorbed');
reset role;
select is((select name from public.user_collections where id = '33333333-3333-4333-8333-333333333333'),
  'first', 'the original row was kept by DO NOTHING');

-- user B owns this id
insert into public.user_collections (id, user_id, name)
values ('44444444-4444-4444-8444-444444444444', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bs');
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$insert into public.user_collections (id, name)
  values ('44444444-4444-4444-8444-444444444444', 'stolen') on conflict (id) do nothing$q$), 'OK',
  'DO NOTHING against another user''s id is a silent skip, not an error (clients must not assume it was stored)');
reset role;
select is((select name || '/' || user_id::text from public.user_collections
  where id = '44444444-4444-4444-8444-444444444444'),
  'bs/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B''s row is untouched and still B''s');

select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$insert into public.user_collections (id, name, created_at)
  values ('33333333-3333-4333-8333-333333333333', 'x', now())
  on conflict (id) do update set id = excluded.id, user_id = excluded.user_id,
    name = excluded.name, created_at = excluded.created_at$q$), '42501',
  'a merge-upsert that rewrites id / user_id / created_at is denied (those columns are immutable)');
select is(public.t_state($q$insert into public.user_collections (id, name)
  values ('33333333-3333-4333-8333-333333333333', 'renamed')
  on conflict (id) do update set name = excluded.name$q$), 'OK',
  'a name-only DO UPDATE on one''s own row is allowed');
reset role;
select is((select name from public.user_collections where id = '33333333-3333-4333-8333-333333333333'),
  'renamed', 'the name-only update was applied');

select * from finish();
rollback;
