-- user_taste_profiles: closed canonical domains (no NULL, no duplicates), setting, versioning,
-- last-write-wins patch, immutability, isolation, anon and service_role.
-- Prepended by the runner with _helpers.sql.

-- ── the closed-set validator itself ────────────────────────────────────────────
select is(public.taste_array_is_valid(array['a','b'], array['a','b','c']), true, 'validator: a subset is valid');
select is(public.taste_array_is_valid(array[]::text[], array['a']), true, 'validator: an empty array is valid');
select is(public.taste_array_is_valid(array['a','a'], array['a','b']), false, 'validator: a duplicate is invalid');
select is(public.taste_array_is_valid(array['a', null], array['a','b']), false, 'validator: a NULL element is invalid');
select is(public.taste_array_is_valid(array[null]::text[], array['a','b']), false, 'validator: a lone NULL element is invalid');
select is(public.taste_array_is_valid(array['z'], array['a','b']), false, 'validator: an element outside the set is invalid');
select is(public.taste_array_is_valid(array['A'], array['a']), false, 'validator: matching is case-sensitive');
select is(public.taste_array_is_valid(null, array['a']), false, 'validator: a NULL array is invalid');
select is(public.taste_array_is_valid(array['a'], null), false, 'validator: a NULL domain is invalid');

select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- ── valid canonical values ─────────────────────────────────────────────────────
select is(public.t_state($q$insert into public.user_taste_profiles (interests, usual_company, setting, profile_updated_at)
  values (array['padel','football','entertainment','kids-family','sports','billiards','water-beach','adventure','wellness'],
          array['friends','partner','family','solo'], 'indoor', '2026-01-02T03:04:05Z')$q$), 'OK',
  'all 9 canonical interests, all 4 company values and a setting are accepted (user_id defaults to the caller)');
select is((select cardinality(interests) from public.user_taste_profiles), 9, 'the 9 interests were stored');
select is(public.t_state($q$insert into public.user_taste_profiles (interests) values (array['padel'])$q$), '23505',
  'a second profile for the same user violates the primary key (one row per user)');

-- ── interests ──────────────────────────────────────────────────────────────────
select is(public.t_state($q$update public.user_taste_profiles set interests = array['padel','wellness']$q$), 'OK', 'valid interests accepted');
select is(public.t_state($q$update public.user_taste_profiles set interests = array[]::text[]$q$), 'OK', 'an empty interests array is accepted');
select is(public.t_state($q$update public.user_taste_profiles set interests = array['padel','bowling']$q$), '23514', 'an unknown interest is rejected');
select is(public.t_state($q$update public.user_taste_profiles set interests = array['padel','padel']$q$), '23514', 'a duplicate interest is rejected');
select is(public.t_state($q$update public.user_taste_profiles set interests = array['padel', null]$q$), '23514', 'a NULL interest element is rejected');
select is(public.t_state($q$update public.user_taste_profiles set interests = array[null]::text[]$q$), '23514', 'an array holding only NULL is rejected');
select is(public.t_state($q$update public.user_taste_profiles set interests = array['Padel']$q$), '23514', 'a wrong-case interest is rejected');
select is(public.t_state($q$update public.user_taste_profiles set interests = array[' padel']$q$), '23514', 'an interest with a leading space is rejected');
select is(public.t_state($q$update public.user_taste_profiles set interests = array['']$q$), '23514', 'an empty-string interest is rejected');
select is(public.t_state($q$update public.user_taste_profiles set interests = array['padel,football']$q$), '23514', 'a comma-joined value cannot forge two ids');
select is(public.t_state($q$update public.user_taste_profiles set interests = null$q$), '23502', 'NULL interests (the column) is rejected');

-- ── usual_company ──────────────────────────────────────────────────────────────
select is(public.t_state($q$update public.user_taste_profiles set usual_company = array['friends','solo']$q$), 'OK', 'valid company values accepted');
select is(public.t_state($q$update public.user_taste_profiles set usual_company = array['colleagues']$q$), '23514', 'an unknown company value is rejected');
select is(public.t_state($q$update public.user_taste_profiles set usual_company = array['family','family']$q$), '23514', 'a duplicate company value is rejected');
select is(public.t_state($q$update public.user_taste_profiles set usual_company = array['family', null]$q$), '23514', 'a NULL company element is rejected');
select is(public.t_state($q$update public.user_taste_profiles set usual_company = array['Friends']$q$), '23514', 'a wrong-case company value is rejected');
select is(public.t_state($q$update public.user_taste_profiles set usual_company = null$q$), '23502', 'NULL usual_company (the column) is rejected');

-- ── setting ────────────────────────────────────────────────────────────────────
select is(public.t_state($q$update public.user_taste_profiles set setting = 'outdoor'$q$), 'OK', 'setting outdoor accepted');
select is(public.t_state($q$update public.user_taste_profiles set setting = 'indoor'$q$), 'OK', 'setting indoor accepted');
select is(public.t_state($q$update public.user_taste_profiles set setting = null$q$), 'OK', 'setting NULL (no preference) accepted');
select is(public.t_state($q$update public.user_taste_profiles set setting = 'both'$q$), '23514', 'an invalid setting is rejected');
select is(public.t_state($q$update public.user_taste_profiles set setting = 'Indoor'$q$), '23514', 'a wrong-case setting is rejected');
select is(public.t_state($q$update public.user_taste_profiles set setting = ''$q$), '23514', 'an empty setting is rejected');

-- ── schema_version ─────────────────────────────────────────────────────────────
select is(public.t_state($q$update public.user_taste_profiles set schema_version = 2$q$), '23514', 'an unknown schema_version is rejected');
select is(public.t_state($q$update public.user_taste_profiles set schema_version = null$q$), '23502', 'a NULL schema_version is rejected');

-- ── last-write-wins on the CLIENT time (profile_updated_at), NULL loses ─────────
reset role;
update public.user_taste_profiles set profile_updated_at = null where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
update public.user_taste_profiles set interests = array['padel'], profile_updated_at = '2026-05-01T00:00:00Z'
  where user_id = (select auth.uid()) and (profile_updated_at is null or profile_updated_at < '2026-05-01T00:00:00Z');
select is((select profile_updated_at from public.user_taste_profiles), '2026-05-01T00:00:00Z'::timestamptz, 'a NULL profile_updated_at loses to any real timestamp (the patch applied)');
update public.user_taste_profiles set interests = array['sports'], profile_updated_at = '2026-04-01T00:00:00Z'
  where user_id = (select auth.uid()) and (profile_updated_at is null or profile_updated_at < '2026-04-01T00:00:00Z');
select is((select interests from public.user_taste_profiles), array['padel'], 'an older client time does not overwrite a newer one (the guarded patch matched no row)');
update public.user_taste_profiles set interests = array['wellness'], profile_updated_at = '2026-06-01T00:00:00Z'
  where user_id = (select auth.uid()) and (profile_updated_at is null or profile_updated_at < '2026-06-01T00:00:00Z');
select is((select interests from public.user_taste_profiles), array['wellness'], 'a newer client time wins');

-- ── immutable columns, no DELETE ───────────────────────────────────────────────
select is(public.t_state($q$update public.user_taste_profiles set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$q$), '42501', 'user_id cannot be updated');
select is(public.t_state($q$update public.user_taste_profiles set created_at = now()$q$), '42501', 'created_at cannot be updated');
select is(public.t_state($q$update public.user_taste_profiles set updated_at = now()$q$), '42501', 'updated_at cannot be written by a client');
select is(public.t_state($q$delete from public.user_taste_profiles$q$), '42501', 'authenticated has no DELETE permission');

-- ── isolation and spoofing ─────────────────────────────────────────────────────
select is(public.t_state($q$insert into public.user_taste_profiles (user_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$q$), '42501', 'A cannot create a profile for B');
reset role;
insert into public.user_taste_profiles (user_id, interests) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', array['billiards']);
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is((select count(*)::int from public.user_taste_profiles), 1, 'A sees only her own profile');
select is(public.t_state($q$update public.user_taste_profiles set interests = array['wellness'] where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$q$), 'OK', 'A''s update of B''s profile matches no visible row');
reset role;
select is((select interests from public.user_taste_profiles where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), array['billiards'], 'B''s profile is unchanged');

-- ── defaults ───────────────────────────────────────────────────────────────────
select public.t_as('authenticated', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select is(public.t_state($q$insert into public.user_taste_profiles default values$q$), 'OK', 'an empty profile row (all defaults) is valid');
select is((select interests || usual_company from public.user_taste_profiles), array[]::text[], 'the defaults are empty arrays');
select is((select setting from public.user_taste_profiles), null::text, 'and a NULL setting (no preference)');
select is((select profile_updated_at from public.user_taste_profiles), null::timestamptz, 'and an unknown client edit time (NULL)');

-- ── anon ───────────────────────────────────────────────────────────────────────
select public.t_as('anon', null);
select is(public.t_state('select count(*) from public.user_taste_profiles'), '42501', 'anon cannot SELECT');
select is(public.t_state($q$insert into public.user_taste_profiles (user_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$), '42501', 'anon cannot INSERT');
select is(public.t_state('update public.user_taste_profiles set setting = null'), '42501', 'anon cannot UPDATE');
select is(public.t_state('delete from public.user_taste_profiles'), '42501', 'anon cannot DELETE');
select is(public.t_state('select public.taste_array_is_valid(array[]::text[], array[]::text[])'), '42501', 'anon cannot call the validator directly');

-- ── service_role ───────────────────────────────────────────────────────────────
select public.t_as('service_role', null);
select is((select count(*)::int from public.user_taste_profiles), 3, 'service_role sees every profile (A, B, C)');
select is(public.t_state($q$update public.user_taste_profiles set setting = 'indoor' where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$q$), 'OK', 'service_role can UPDATE');
select is(public.t_state($q$update public.user_taste_profiles set interests = array['nope'] where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$q$), '23514', 'service_role is still subject to the CHECK constraints');
select is(public.t_state($q$delete from public.user_taste_profiles where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$q$), 'OK', 'service_role can DELETE');
select is(public.t_state('truncate public.user_taste_profiles'), '42501', 'service_role cannot TRUNCATE');

reset role;
select * from finish();
rollback;
