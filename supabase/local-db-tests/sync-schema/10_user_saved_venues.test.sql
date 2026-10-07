-- user_saved_venues: BLK validation, PK semantics, isolation, no UPDATE, anon and service_role.
-- Prepended by the runner with _helpers.sql.

-- ── authenticated user A: valid ids ────────────────────────────────────────────
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('BLK-0001')$q$), 'OK',
  'a canonical BLK id is accepted and user_id defaults to the caller (auth.uid())');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('BLK-9999')$q$), 'OK',
  'a retired / unknown but well-formed BLK id is accepted (no FK to venues by design)');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id, saved_at)
  values ('BLK-0002', '2024-05-01T10:00:00Z')$q$), 'OK', 'a client-supplied saved_at is accepted');
select is((select saved_at from public.user_saved_venues where venue_id = 'BLK-0002'),
  '2024-05-01T10:00:00Z'::timestamptz, 'the client saved_at is preserved exactly');

-- ── malformed ids are rejected by the CHECK ────────────────────────────────────
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('BLK-1')$q$), '23514', 'too few digits rejected');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('BLK-00012')$q$), '23514', 'too many digits rejected');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('blk-0001')$q$), '23514', 'lower case rejected');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('BLK-000A')$q$), '23514', 'non-digit rejected');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values (' BLK-0001')$q$), '23514', 'leading space rejected');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('BLK-0001 ')$q$), '23514', 'trailing space rejected');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values (E'BLK-0001\n')$q$), '23514', 'trailing newline rejected');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('astro-pool-lounge-blk-0001')$q$), '23514', 'a legacy slug is rejected (BLK ids only)');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('')$q$), '23514', 'empty string rejected');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values (null)$q$), '23502', 'NULL venue_id rejected (NOT NULL)');

-- ── duplicates follow the primary key ──────────────────────────────────────────
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('BLK-0001')$q$), '23505',
  'saving the same venue twice is a primary-key violation');
select is(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('BLK-0001') on conflict do nothing$q$), 'OK',
  'ON CONFLICT DO NOTHING absorbs a duplicate save');
select is((select count(*)::int from public.user_saved_venues where venue_id = 'BLK-0001'), 1, 'still exactly one row');

-- ── no UPDATE for authenticated ────────────────────────────────────────────────
select is(public.t_state($q$update public.user_saved_venues set saved_at = now() where venue_id = 'BLK-0001'$q$), '42501',
  'authenticated has no UPDATE permission on saved venues');
select is(public.t_state($q$update public.user_saved_venues set venue_id = 'BLK-0003' where venue_id = 'BLK-0001'$q$), '42501',
  'a saved venue id cannot be rewritten');

-- ── isolation: B's data is invisible and untouchable for A ─────────────────────
reset role;
insert into public.user_saved_venues (user_id, venue_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BLK-0500');

select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is((select count(*)::int from public.user_saved_venues where venue_id = 'BLK-0500'), 0, 'A cannot read B''s row');
select is((select count(*)::int from public.user_saved_venues), 3, 'A sees only her own three rows');
select is(public.t_state($q$insert into public.user_saved_venues (user_id, venue_id)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BLK-0600')$q$), '42501', 'A cannot insert a row owned by B (RLS WITH CHECK)');
select is(public.t_state($q$delete from public.user_saved_venues where venue_id = 'BLK-0500'$q$), 'OK',
  'A''s delete of B''s row runs but matches nothing (row-level security hides it)');
reset role;
select is((select count(*)::int from public.user_saved_venues where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and venue_id = 'BLK-0500'),
  1, 'B''s row survived A''s delete attempt');
select is((select count(*)::int from public.user_saved_venues where venue_id = 'BLK-0600'), 0, 'nothing was inserted for B');

select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$delete from public.user_saved_venues where venue_id = 'BLK-0002'$q$), 'OK', 'A can delete her own row');
select is((select count(*)::int from public.user_saved_venues where venue_id = 'BLK-0002'), 0, 'and it is gone');

-- no identity at all: auth.uid() is null
select public.t_as('authenticated', null);
select isnt(public.t_state($q$insert into public.user_saved_venues (venue_id) values ('BLK-0010')$q$), 'OK',
  'an authenticated role without a JWT subject cannot insert (no owner)');
select is((select count(*)::int from public.user_saved_venues), 0, 'and reads nothing');

-- ── anon ───────────────────────────────────────────────────────────────────────
select public.t_as('anon', null);
select is(public.t_state($q$select count(*) from public.user_saved_venues$q$), '42501', 'anon cannot SELECT');
select is(public.t_state($q$insert into public.user_saved_venues (user_id, venue_id)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0011')$q$), '42501', 'anon cannot INSERT');
select is(public.t_state($q$delete from public.user_saved_venues$q$), '42501', 'anon cannot DELETE');
select is(public.t_state($q$update public.user_saved_venues set saved_at = now()$q$), '42501', 'anon cannot UPDATE');
select is(public.t_state($q$truncate public.user_saved_venues$q$), '42501', 'anon cannot TRUNCATE');

-- ── service_role: required DML only ────────────────────────────────────────────
select public.t_as('service_role', null);
select is(public.t_state($q$insert into public.user_saved_venues (user_id, venue_id)
  values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'BLK-0020')$q$), 'OK', 'service_role can INSERT for any user');
select is((select count(*)::int from public.user_saved_venues), 4, 'service_role sees every user''s rows: A has 2, B 1, C 1 (bypasses RLS)');
select is(public.t_state($q$update public.user_saved_venues set saved_at = '2025-01-01' where venue_id = 'BLK-0020'$q$), 'OK', 'service_role can UPDATE');
select is(public.t_state($q$delete from public.user_saved_venues where venue_id = 'BLK-0020'$q$), 'OK', 'service_role can DELETE');
select is(public.t_state($q$truncate public.user_saved_venues$q$), '42501', 'service_role cannot TRUNCATE');
select is(public.t_state($q$create trigger t_probe after insert on public.user_saved_venues for each row execute function public.set_updated_at()$q$), '42501',
  'service_role cannot create a trigger on the table');
select is(public.t_state($q$alter table public.user_saved_venues add constraint t_fk foreign key (user_id) references auth.users (id)$q$), '42501',
  'service_role cannot alter the table / add references');

reset role;
select * from finish();
rollback;
