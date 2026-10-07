-- Shared preamble for the Phase 2 database tests. It is PREPENDED to every *.test.sql by
-- scripts/db/test-sync-schema-local.sh (this file is not a test itself, and is never a
-- migration). Everything runs inside one transaction that each test rolls back, so nothing
-- persists in the disposable database.
--
-- The tests run as the database owner (supabase_admin) and switch role with t_as().
-- LOCAL ONLY: these tests assume the disposable harness database.

begin;

-- Refuse to run anywhere except the disposable harness. The runner sets this marker through
-- PGOPTIONS; a hosted or shared database never has it, so these tests (which insert users and
-- create temporary objects, all rolled back) can never run there by accident.
do $$
begin
  if current_setting('blaniko.local_test_harness', true) is distinct from 'on' then
    raise exception 'refusing to run: this is not the disposable local test harness (scripts/db/test-sync-schema-local.sh)';
  end if;
end;
$$;

set local search_path to public, extensions;
create extension if not exists pgtap with schema extensions;

-- Runs one statement and returns 'OK' or the SQLSTATE it raised. Runs with the privileges of
-- the CURRENT role, so it observes exactly what a client of that role would observe.
create function public.t_state(q text) returns text
  language plpgsql
as $$
begin
  execute q;
  return 'OK';
exception when others then
  return sqlstate;
end;
$$;

-- Switches the current role like a PostgREST request would: the JWT subject is read by
-- auth.uid(), and the database role is set locally. uid may be null (anon, service_role).
create function public.t_as(role_name text, uid text default null) returns void
  language plpgsql
as $$
begin
  -- Both GUC styles are set: some auth.uid() definitions read request.jwt.claim.sub, others the
  -- request.jwt.claims JSON. (The harness image's reads claim.sub; GoTrue-era projects read both.)
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), true);
  perform set_config('request.jwt.claim.role', role_name, true);
  perform set_config('request.jwt.claims',
    case when uid is null then json_build_object('role', role_name)::text
         else json_build_object('sub', uid, 'role', role_name)::text end, true);
  perform set_config('role', role_name, true);
end;
$$;

-- Two ordinary users, a third that tests may delete, and a fourth for the updated_at forging tests.
insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd');

select * from no_plan();
