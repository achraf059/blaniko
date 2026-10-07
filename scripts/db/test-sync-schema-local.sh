#!/usr/bin/env bash
# LOCAL ONLY. Disposable test harness for the Phase 2 account-sync schema.
#
# What it does
#   1. Static review of the five Phase 2 migrations (forbidden patterns).
#   2. Starts a throwaway Postgres container from the Supabase Postgres image (the
#      version production runs), with the Supabase roles, auth schema and pgTAP.
#   3. Failed-migration probe: applies a deliberately broken copy of migration 3 with
#      the real Supabase CLI to learn how a failed migration file behaves.
#   4. Fresh container: applies ONLY the five Phase 2 migrations with the real CLI,
#      then checks the migration history and idempotence.
#   5. Snapshots catalog objects that are not Phase 2's before and after, and requires
#      the two snapshots to be identical (Phase 2 alters nothing that already exists).
#   6. Runs every supabase/local-db-tests/sync-schema/*.test.sql (pgTAP) as the database owner,
#      switching to anon / authenticated / service_role inside the tests.
#   7. Probes updated_at across real, separate transactions (forged INSERT value replaced; later UPDATE moves it forward).
#   8. Verifies the rollback files: the wrong order fails loudly and changes nothing; the right
#      order removes every Phase 2 object.
#
# Why only the Phase 2 migrations: the historical chain cannot rebuild from zero
# (public.venues has no CREATE migration). The CLI is pointed at a temporary workdir
# that holds copies of just the Phase 2 files; the repo's migration history is never
# modified, and the workdir has no link metadata, so it can never address a hosted project.
#
# Safety
#   * Connects only to the container this script starts, on 127.0.0.1, with a throwaway
#     password. It never reads .env files, keys, or the linked-project metadata.
#   * The CLI is always called with --db-url pointing at that container (never --linked).
#
# Requirements: bash, Docker, the Supabase CLI. Environment:
#   SUPABASE_CMD         command that runs the CLI (default: supabase). A wrapper may be
#                        needed when the CLI's interpreter is broken on a machine.
#   SYNC_TEST_PG_IMAGE   image (default: the production Postgres version)
#   SYNC_TEST_KEEP=1     keep the containers for debugging
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${SYNC_TEST_PG_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.111}"
SUPABASE_CMD="${SUPABASE_CMD:-supabase}"
PASSWORD="postgres"   # throwaway, local container only
WORK="$(mktemp -d)"
CONTAINERS=()

PHASE2_NAMES=(
  create_set_updated_at_function
  create_user_saved_venues
  create_user_collections_and_items
  create_user_outings
  create_user_taste_profiles
)
NEW_TABLES="'user_saved_venues','user_collections','user_collection_items','user_outings','user_taste_profiles'"
NEW_FUNCTIONS="'set_updated_at','is_valid_outing_payload_v1','taste_array_is_valid'"

cleanup() {
  if [ "${SYNC_TEST_KEEP:-0}" != "1" ]; then
    for c in "${CONTAINERS[@]:-}"; do [ -n "$c" ] && docker rm -f "$c" >/dev/null 2>&1 || true; done
    rm -rf "$WORK"
  else
    echo "SYNC_TEST_KEEP=1: containers ${CONTAINERS[*]:-} and $WORK kept"
  fi
}
trap cleanup EXIT

log() { printf '\n== %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

# ── 1. migration files + static review ─────────────────────────────────────────

MIGRATION_FILES=()
for name in "${PHASE2_NAMES[@]}"; do
  matches=("$REPO_ROOT"/supabase/migrations/*_"$name".sql)
  [ "${#matches[@]}" -eq 1 ] && [ -f "${matches[0]}" ] || fail "expected exactly one migration for $name"
  MIGRATION_FILES+=("${matches[0]}")
done

log "Static review of the Phase 2 migrations"
static_fail=0
strip_comments() { sed -E 's/--.*$//' "$1" | tr '\n' ' '; }
for f in "${MIGRATION_FILES[@]}"; do
  base="$(basename "$f")"
  body="$(strip_comments "$f")"   # comments removed, one line, so statements can be matched whole
  check() { # description, extended-regex that must NOT appear
    if printf '%s\n' "$body" | grep -iE "$2" >/dev/null; then
      printf '  [%s] forbidden: %s\n' "$base" "$1"; static_fail=1
    fi
  }
  check "alter default privileges"            'alter[[:space:]]+default[[:space:]]+privileges'
  check "alter/drop of an existing object"    'alter[[:space:]]+table[[:space:]]+(if exists[[:space:]]+)?(only[[:space:]]+)?(public\.)?(profiles|user_favorites|venues|waitlist_emails|venue_claims)|drop[[:space:]]+(table|function|policy|trigger|index|schema|extension)'
  check "SECURITY DEFINER"                    'security[[:space:]]+definer'
  check "broad USING/WITH CHECK (true)"       'using[[:space:]]*\([[:space:]]*true[[:space:]]*\)|with[[:space:]]+check[[:space:]]*\([[:space:]]*true[[:space:]]*\)'
  check "grant to anon"                       'grant[^;]*[[:space:]]to[[:space:]]+[^;]*(^|[^a-z_])anon([^a-z_]|$)'
  check "policy for anon / public"            'create[[:space:]]+policy[^;]*[[:space:]]to[[:space:]]+(anon|public)([^a-z_]|$)'
  check "touches handle_new_user, storage or a trigger on auth" 'handle_new_user|storage\.|[[:space:]]on[[:space:]]+auth\.'
  check "machine path or project ref"         '/Users/|vptjbfoaqmbdjdqwloae|supabase\.co'
done
[ "$static_fail" -eq 0 ] || fail "static review found forbidden patterns"
echo "  ok: no forbidden pattern in ${#MIGRATION_FILES[@]} migrations"

# ── container helpers ──────────────────────────────────────────────────────────

start_container() { # sets CONTAINER, PORT
  CONTAINER="blaniko-sync-schema-test-$$-$RANDOM"
  CONTAINERS+=("$CONTAINER")
  docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$PASSWORD" \
    -p 127.0.0.1::5432 "$IMAGE" >/dev/null
  PORT="$(docker port "$CONTAINER" 5432/tcp | head -1 | sed 's/.*://')"
  [ -n "$PORT" ] || fail "no mapped port"
  local ready=0 i
  for i in $(seq 1 120); do
    if docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -q -tA -U supabase_admin -d postgres \
         -c "select to_regclass('auth.users') is not null and exists (select 1 from pg_roles where rolname = 'authenticated')" 2>/dev/null | grep -q '^t$'; then
      ready=$((ready + 1)); [ "$ready" -ge 3 ] && break
    else
      ready=0
    fi
    sleep 1
  done
  [ "$ready" -ge 3 ] || fail "container did not become ready"
  DB_URL="postgresql://postgres:${PASSWORD}@127.0.0.1:${PORT}/postgres"
}

sql_admin() { docker exec -i -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -q -tA -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }

with_timeout() { perl -e 'alarm shift; exec @ARGV' "$@"; }

make_workdir() { # fresh temp project holding only the given migration files
  rm -rf "$WORK/proj"; mkdir -p "$WORK/proj/supabase/migrations"
  cp "$REPO_ROOT/supabase/config.toml" "$WORK/proj/supabase/config.toml"
  for f in "$@"; do cp "$f" "$WORK/proj/supabase/migrations/"; done
}

cli_push() { # uses DB_URL (a local container) and the temporary workdir
  case "$DB_URL" in postgresql://postgres:*@127.0.0.1:*) ;; *) fail "refusing non-local database url" ;; esac
  # This CLI version ignores sslmode in the URL; the environment variable is honored. The
  # local container has no TLS. (Set for this one local-only call, never exported globally.)
  # shellcheck disable=SC2086
  PGSSLMODE=disable with_timeout 240 $SUPABASE_CMD db push --db-url "$DB_URL" --workdir "$WORK/proj" --yes
}

# The CLI's own bookkeeping schema (supabase_migrations) is excluded: it is created by the
# migration tool on first use, not by Phase 2 SQL.
snapshot() { sql_admin <<SQL
select 'default_acl|' || defaclrole::regrole::text || '|' || defaclnamespace::regnamespace::text || '|' || defaclobjtype::text || '|' || coalesce(defaclacl::text, '') from pg_default_acl order by 1;
select 'policy|' || schemaname || '.' || tablename || '|' || policyname || '|' || cmd || '|' || roles::text || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '')
  from pg_policies where not (schemaname = 'public' and tablename in ($NEW_TABLES)) order by 1;
select 'grant|' || grantee || '|' || table_schema || '.' || table_name || '|' || privilege_type
  from information_schema.role_table_grants
  where table_schema <> 'supabase_migrations' and not (table_schema = 'public' and table_name in ($NEW_TABLES)) order by 1;
select 'function|' || p.oid::regprocedure::text || '|' || coalesce(p.proacl::text, '') || '|' || p.prosecdef::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema')
    and not (n.nspname = 'public' and p.proname in ($NEW_FUNCTIONS)) order by 1;
select 'trigger|' || tgrelid::regclass::text || '|' || tgname from pg_trigger
  where not tgisinternal
    and tgrelid not in (select c.oid from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname in ($NEW_TABLES))
  order by 1;
select 'class|' || n.nspname || '.' || c.relname || '|' || c.relkind::text || '|' || c.relrowsecurity::text || '|' || coalesce(c.relacl::text, '')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname not like 'user\_%' order by 1;
SQL
}

# ── 2. failed-migration probe ──────────────────────────────────────────────────

log "Failed-migration probe (real CLI, broken copy of migration 3)"
start_container
BROKEN="$WORK/broken_3.sql"
cp "${MIGRATION_FILES[2]}" "$BROKEN"
printf '\nselect 1/0; -- deliberate failure at the END of the file\n' >> "$BROKEN"
# The broken copy must keep the real file name so it carries the real version.
mkdir -p "$WORK/broken"; cp "$BROKEN" "$WORK/broken/$(basename "${MIGRATION_FILES[2]}")"
make_workdir "${MIGRATION_FILES[0]}" "${MIGRATION_FILES[1]}" "$WORK/broken/$(basename "${MIGRATION_FILES[2]}")"
if cli_push >"$WORK/probe.log" 2>&1; then
  fail "the broken migration unexpectedly succeeded"
fi
echo "  CLI exit: failure. Tail of its output:"; tail -n 6 "$WORK/probe.log" | sed 's/^/    /'
grep -qiE 'division by zero|22012' "$WORK/probe.log" || { cat "$WORK/probe.log"; fail "the probe failed for a reason other than the deliberate division by zero"; }
probe="$(sql_admin -c "select
  (to_regclass('public.user_saved_venues') is not null)::int,
  (to_regclass('public.user_collections') is not null)::int,
  (to_regclass('public.user_collection_items') is not null)::int,
  (select count(*) from supabase_migrations.schema_migrations)")"
echo "  after failure [saved_venues|collections|items|recorded_versions] = $probe"
case "$probe" in
  "1|0|0|2") echo "  understood: a failing file is applied ATOMICALLY (nothing from it persists, its version is not recorded); earlier files stay applied." ;;
  *) echo "  FINDING: the CLI does NOT roll back a failing file as a unit ($probe)."; PROBE_NONATOMIC=1 ;;
esac
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

# ── 3. real application on a fresh container ───────────────────────────────────

log "Applying the five Phase 2 migrations with the real CLI (fresh container)"
start_container
snapshot > "$WORK/snapshot.before"
make_workdir "${MIGRATION_FILES[@]}"
cli_push >"$WORK/push.log" 2>&1 || { cat "$WORK/push.log"; fail "db push failed"; }
tail -n 4 "$WORK/push.log" | sed 's/^/    /'
versions="$(sql_admin -c "select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations")"
expected="$(for f in "${MIGRATION_FILES[@]}"; do basename "$f" | cut -d_ -f1; done | paste -sd, -)"
[ "$versions" = "$expected" ] || fail "migration history mismatch: got $versions, expected $expected"
echo "  ok: recorded versions = $versions"
if cli_push >"$WORK/push2.log" 2>&1 && grep -qiE 'up to date|no change' "$WORK/push2.log"; then
  echo "  ok: second push is a no-op"
else
  cat "$WORK/push2.log"; fail "second push was not a clean no-op"
fi

log "Pre-existing objects must be unchanged by Phase 2"
snapshot > "$WORK/snapshot.after"
if diff -u "$WORK/snapshot.before" "$WORK/snapshot.after" >"$WORK/snapshot.diff"; then
  echo "  ok: default ACLs, policies, grants, functions, triggers and public relations outside Phase 2 are identical ($(wc -l < "$WORK/snapshot.before" | tr -d ' ') catalog rows compared)"
else
  cat "$WORK/snapshot.diff"; fail "Phase 2 changed a pre-existing object"
fi

# ── 4. database tests ──────────────────────────────────────────────────────────

log "Database tests (pgTAP)"
# The tests refuse to run unless the harness marker is set (so they can never touch a hosted database).
guard_out="$(docker exec -i -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -q -tA -v ON_ERROR_STOP=0 -U supabase_admin -d postgres < "$REPO_ROOT/supabase/local-db-tests/sync-schema/_helpers.sql" 2>&1 || true)"
printf '%s\n' "$guard_out" | grep -q 'refusing to run' || fail "the tests did not refuse to run without the harness marker"
echo "  ok: without the harness marker the test preamble refuses to run"
total_ok=0; total_not_ok=0; problems=0
for t in "$REPO_ROOT"/supabase/local-db-tests/sync-schema/*.test.sql; do
  out="$(cat "$REPO_ROOT/supabase/local-db-tests/sync-schema/_helpers.sql" "$t" | docker exec -i -e PGPASSWORD="$PASSWORD" -e PGOPTIONS="-c blaniko.local_test_harness=on" "$CONTAINER" psql -X -q -tA -v ON_ERROR_STOP=0 -U supabase_admin -d postgres 2>&1 || true)"
  oks="$(printf '%s\n' "$out" | grep -cE '^ok ' || true)"
  noks="$(printf '%s\n' "$out" | grep -cE '^not ok ' || true)"
  errs="$(printf '%s\n' "$out" | grep -cE '(^|[^a-z])(ERROR|FATAL|PANIC):|^# Looks like' || true)"
  total_ok=$((total_ok + oks)); total_not_ok=$((total_not_ok + noks))
  status="PASS"; { [ "$noks" -ne 0 ] || [ "$errs" -ne 0 ] || [ "$oks" -eq 0 ]; } && { status="FAIL"; problems=$((problems + 1)); }
  printf '  %-4s %-48s ok=%-4s not_ok=%-3s errors=%s\n' "$status" "$(basename "$t")" "$oks" "$noks" "$errs"
  if [ "$status" = "FAIL" ]; then printf '%s\n' "$out" | grep -E '^not ok |^#|ERROR|FATAL' | head -40 | sed 's/^/        /'; fi
done

log "updated_at over real, separate transactions"
# One transaction has a single now(), so this probe commits each statement on its own and sleeps
# between them: a forged updated_at on INSERT must be replaced by server time, and a later UPDATE
# must move it strictly forward. Autocommit: no BEGIN anywhere in this script.
probe_result="$(sql_admin <<'SQL'
insert into auth.users (id) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
set role authenticated;
set request.jwt.claim.sub = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
insert into public.user_collections (id, name, updated_at) values ('f0000000-0000-4000-8000-000000000001', 'p', '2000-01-01');
insert into public.user_outings (id, schema_version, payload, updated_at)
  values ('f0000000-0000-4000-8000-000000000002', 1, '{"name":{"en":"p"},"stopIds":[],"answers":{}}', '2000-01-01');
insert into public.user_taste_profiles (interests, updated_at) values (array['padel'], '2000-01-01');
select updated_at as c1 from public.user_collections where id = 'f0000000-0000-4000-8000-000000000001' \gset
select updated_at as o1 from public.user_outings where id = 'f0000000-0000-4000-8000-000000000002' \gset
select updated_at as t1 from public.user_taste_profiles \gset
select pg_sleep(1.5);
update public.user_collections set name = 'p2' where id = 'f0000000-0000-4000-8000-000000000001';
update public.user_outings set schema_version = 1 where id = 'f0000000-0000-4000-8000-000000000002';
update public.user_taste_profiles set setting = 'indoor';
select updated_at as c2 from public.user_collections where id = 'f0000000-0000-4000-8000-000000000001' \gset
select updated_at as o2 from public.user_outings where id = 'f0000000-0000-4000-8000-000000000002' \gset
select updated_at as t2 from public.user_taste_profiles \gset
reset role;
delete from auth.users where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
select (:'c1'::timestamptz > '2020-01-01' and :'o1'::timestamptz > '2020-01-01' and :'t1'::timestamptz > '2020-01-01'
        and :'c2'::timestamptz > :'c1'::timestamptz and :'o2'::timestamptz > :'o1'::timestamptz and :'t2'::timestamptz > :'t1'::timestamptz)::text
       || '|collections +' || round(extract(epoch from (:'c2'::timestamptz - :'c1'::timestamptz))::numeric, 1) || 's'
       || '|outings +' || round(extract(epoch from (:'o2'::timestamptz - :'o1'::timestamptz))::numeric, 1) || 's'
       || '|taste +' || round(extract(epoch from (:'t2'::timestamptz - :'t1'::timestamptz))::numeric, 1) || 's';
SQL
)" || fail "the real-time updated_at probe errored"
probe_result="$(printf '%s\n' "$probe_result" | tail -n 1)"   # pg_sleep prints an empty line first
echo "  result: $probe_result"
case "$probe_result" in true\|*) echo "  ok: forged inserts were replaced by server time and each later UPDATE moved updated_at strictly forward" ;; *) fail "updated_at probe failed: $probe_result" ;; esac

log "Rollback files"
sql_owner() { docker exec -i -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -q -tA -v ON_ERROR_STOP=1 -h 127.0.0.1 -U postgres -d postgres "$@"; }
count_new() { sql_admin -c "select (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relname in ($NEW_TABLES))
  + (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ($NEW_FUNCTIONS))"; }
ROLLBACKS=("$REPO_ROOT"/supabase/rollbacks/*.down.sql)
[ "${#ROLLBACKS[@]}" -eq 5 ] || fail "expected 5 rollback files"
for rb in "${ROLLBACKS[@]}"; do grep -q 'LOCAL / EMERGENCY REFERENCE ONLY' "$rb" || fail "$(basename "$rb") lacks the reference-only banner"; done
echo "  ok: all five carry the LOCAL / EMERGENCY REFERENCE ONLY banner and sit outside supabase/migrations/"
[ "$(count_new)" = "8" ] || fail "expected 5 tables + 3 functions before the rollback, got $(count_new)"
rollback_file() { local m=("$REPO_ROOT"/supabase/rollbacks/*_"$1".down.sql); [ -f "${m[0]}" ] || fail "no rollback file for $1"; printf '%s' "${m[0]}"; }
# Wrong order: dropping the shared function first must fail with the dependency error and change nothing.
wrong_out="$(sql_owner < "$(rollback_file create_set_updated_at_function)" 2>&1 || true)"
printf '%s\n' "$wrong_out" | grep -qiE 'cannot drop function (public\.)?set_updated_at\(\) because other objects depend on it' \
  || { printf '%s\n' "$wrong_out"; fail "the wrong-order rollback did not fail with the expected dependency error"; }
[ "$(count_new)" = "8" ] || fail "the wrong-order rollback changed something"
echo "  ok: the wrong order (function first) fails with the dependency error and changes nothing"
# Right order: taste profiles, outings, collections+items, saved venues, function.
for pattern in create_user_taste_profiles create_user_outings create_user_collections_and_items create_user_saved_venues create_set_updated_at_function; do
  sql_owner < "$(rollback_file "$pattern")" >/dev/null || fail "rollback $pattern failed"
done
[ "$(count_new)" = "0" ] || fail "objects remain after the rollbacks"
snapshot > "$WORK/snapshot.rolledback"
diff -u "$WORK/snapshot.before" "$WORK/snapshot.rolledback" >"$WORK/snapshot.rb.diff" || { cat "$WORK/snapshot.rb.diff"; fail "rollback left the catalog different"; }
echo "  ok: the right order removes all 5 tables and 3 functions; the catalog matches the pre-Phase-2 snapshot"

log "Summary"
echo "  assertions passed: $total_ok, failed: $total_not_ok, files with problems: $problems"
[ "${PROBE_NONATOMIC:-0}" = "0" ] || echo "  note: the failed-migration probe reported a non-atomic CLI behaviour (see above)"
[ "$problems" -eq 0 ] || exit 1
echo "  ALL PHASE 2 LOCAL CHECKS PASSED"
