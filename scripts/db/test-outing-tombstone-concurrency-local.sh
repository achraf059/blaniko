#!/usr/bin/env bash
# LOCAL ONLY. Two-session concurrency proof for outing tombstones (Phase 3A-4B).
#
# pgTAP runs inside ONE transaction, so it cannot show how two clients interact. This harness starts a throwaway
# Postgres container (the production image), applies the seven migrations (Phase 2 + collection tombstones + outing
# tombstones) with the real Supabase CLI, and then drives TWO REAL, SEPARATE psql SESSIONS (separate server backends,
# separate transactions, application_name cc_*) through the orderings that matter. It never fakes concurrency with
# sequential statements:
#
#   * the first session does its work and then SLEEPS inside its open transaction (pg_sleep), still uncommitted;
#   * the harness polls pg_stat_activity until the first session is verifiably sleeping with its work done;
#   * only then the second session is started, and the harness verifies from pg_blocking_pids() that the second
#     session is BLOCKED BY the first (a real row-lock wait), not merely slow;
#   * the first session commits; the second proceeds; the harness checks its outcome and the final database state.
#
# An outing has no child rows, so its only lock is its own row lock (unlike collections, which also lock a parent for items).
#
# Cases
#   A  an EDIT commits first               -> a stale conditional tombstone (from the old updated_at) waits, then affects 0 rows;
#                                             the newer authored edit survives
#   B  a TOMBSTONE commits first           -> a stale conditional payload update waits, then affects 0 rows;
#                                             the tombstone stays immutable and scrubbed
#   C  a TOMBSTONE commits first           -> an UNGUARDED payload update (no revision filter) waits, then fails with TS002
#      and afterwards                      -> unguarded updates by authenticated AND service_role are refused with TS002
#   D  retry convergence                   -> repeating the conditional tombstone updates 0 rows and does not rewrite the row
#
# READ COMMITTED is not assumed: every session reports current_setting('transaction_isolation') and the harness stops
# unless it is 'read committed' (and the server default must be too). Bounded lock_timeout / statement_timeout and a
# bounded polling loop mean a regression can fail the run but never hang it.
#
# Safety: connects only to the container it starts (docker exec), with a throwaway password; the CLI is always called
# with --db-url to that container (never --linked). Requirements: bash, Docker, perl, the Supabase CLI.
# Environment: SUPABASE_CMD (default: supabase), SYNC_TEST_PG_IMAGE, SYNC_TEST_KEEP=1, CC_MUTATION_SQL (test-of-the-test: SQL applied
# after the migrations to prove the harness fails when a safety mechanism is removed).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${SYNC_TEST_PG_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.111}"
SUPABASE_CMD="${SUPABASE_CMD:-supabase}"
PASSWORD="postgres"   # throwaway, local container only
WORK="$(mktemp -d)"
CONTAINER=""
USER_A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
HOLD=6   # seconds the first session keeps its transaction open; the harness polls, it does not rely on this

cleanup() {
  if [ "${SYNC_TEST_KEEP:-0}" != "1" ]; then
    [ -n "$CONTAINER" ] && docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    rm -rf "$WORK"
  else
    echo "SYNC_TEST_KEEP=1: container $CONTAINER and $WORK kept"
  fi
}
trap cleanup EXIT
log() { printf '\n== %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
pass() { printf '  ok: %s\n' "$*"; PASSED=$((PASSED + 1)); }
PASSED=0

MIGRATIONS=()
for name in create_set_updated_at_function create_user_saved_venues create_user_collections_and_items create_user_outings create_user_taste_profiles add_collection_tombstones add_outing_tombstones; do
  m=("$REPO_ROOT"/supabase/migrations/*_"$name".sql); [ -f "${m[0]}" ] || fail "missing migration $name"; MIGRATIONS+=("${m[0]}")
done

# ── container ──────────────────────────────────────────────────────────────────
log "Starting a disposable Postgres container and applying the seven migrations with the real CLI"
CONTAINER="blaniko-outing-cc-$$-$RANDOM"
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$PASSWORD" -p 127.0.0.1::5432 "$IMAGE" >/dev/null
PORT="$(docker port "$CONTAINER" 5432/tcp | head -1 | sed 's/.*://')"
[ -n "$PORT" ] || fail "no mapped port"
ready=0
for i in $(seq 1 120); do
  if docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -q -tA -U supabase_admin -d postgres \
       -c "select to_regclass('auth.users') is not null and exists (select 1 from pg_roles where rolname = 'authenticated')" 2>/dev/null | grep -q '^t$'; then
    ready=$((ready + 1)); [ "$ready" -ge 3 ] && break
  else ready=0; fi
  sleep 1
done
[ "$ready" -ge 3 ] || fail "container did not become ready"
DB_URL="postgresql://postgres:${PASSWORD}@127.0.0.1:${PORT}/postgres"
case "$DB_URL" in postgresql://postgres:*@127.0.0.1:*) ;; *) fail "refusing non-local database url" ;; esac

sql_admin() { docker exec -i -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -q -tA -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }

mkdir -p "$WORK/proj/supabase/migrations"
cp "$REPO_ROOT/supabase/config.toml" "$WORK/proj/supabase/config.toml"
for f in "${MIGRATIONS[@]}"; do cp "$f" "$WORK/proj/supabase/migrations/"; done
# shellcheck disable=SC2086
PGSSLMODE=disable perl -e 'alarm shift; exec @ARGV' 240 $SUPABASE_CMD db push --db-url "$DB_URL" --workdir "$WORK/proj" --yes >"$WORK/push.log" 2>&1 \
  || { cat "$WORK/push.log"; fail "db push failed"; }
applied="$(sql_admin -c "select count(*) from supabase_migrations.schema_migrations")"
[ "$applied" = "7" ] || fail "expected 7 applied migrations, got $applied"
echo "  ok: 7 migrations applied"
if [ -n "${CC_MUTATION_SQL:-}" ]; then
  echo "  MUTATION APPLIED (expect this run to FAIL): $CC_MUTATION_SQL"
  sql_admin -c "$CC_MUTATION_SQL" >/dev/null
fi

# ── isolation level: recorded, not assumed ─────────────────────────────────────
log "Isolation level"
default_iso="$(sql_admin -c "show default_transaction_isolation")"
echo "  server default_transaction_isolation = $default_iso"
[ "$default_iso" = "read committed" ] || fail "STOP: the server default isolation is '$default_iso', not READ COMMITTED; the proofs below assume it"

# ── session machinery ──────────────────────────────────────────────────────────
session_header() { # optional role argument (default authenticated)
  cat <<SQL
begin;
set local role ${1:-authenticated};
select set_config('request.jwt.claim.sub', '$USER_A', true);
select set_config('request.jwt.claims', '{"sub":"$USER_A","role":"${1:-authenticated}"}', true);
select 'ISO=' || current_setting('transaction_isolation');
SQL
}
# launch NAME [ROLE]: reads the session body (SQL) from stdin; runs as application_name NAME in the BACKGROUND.
launch() {
  local name="$1"
  { session_header "${2:-authenticated}"; cat; } > "$WORK/$name.sql"
  docker exec -i -e PGPASSWORD="$PASSWORD" -e PGAPPNAME="$name" \
    -e PGOPTIONS="-c lock_timeout=20s -c statement_timeout=60s -c idle_in_transaction_session_timeout=60s" \
    "$CONTAINER" psql -X -q -tA -v ON_ERROR_STOP=0 -U supabase_admin -d postgres < "$WORK/$name.sql" > "$WORK/$name.out" 2>&1 &
}
wait_for() { # description, boolean SQL, max seconds
  local desc="$1" q="$2" secs="$3" i
  for i in $(seq 1 $((secs * 5))); do
    [ "$(sql_admin -c "$q")" = "t" ] && return 0
    sleep 0.2
  done
  fail "timed out waiting for: $desc"
}
is_sleeping() { echo "select exists (select 1 from pg_stat_activity where application_name = '$1' and state = 'active' and query ilike '%pg_sleep%')"; }
is_blocked_by() { echo "select exists (select 1 from pg_stat_activity b join pg_stat_activity a on a.pid = any (pg_blocking_pids(b.pid))
                          where b.application_name = '$1' and a.application_name = '$2')"; }
finish() { local pid="$1" name="$2"; wait "$pid" || true; [ -s "$WORK/$name.out" ] || fail "session $name produced no output"; }
out_has() { grep -qE "$2" "$WORK/$1.out"; }
check_iso() { out_has "$1" '^ISO=read committed$' || { cat "$WORK/$1.out"; fail "STOP: session $1 did not run at READ COMMITTED"; }; }
no_deadlock() { ! grep -rqE '40P01|deadlock detected' "$WORK"/*.out; }

n=0
new_case() { n=$((n + 1)); OID="dd000000-0000-4000-8000-$(printf '%012d' "$n")"; }
ORIGINAL='{"name":{"en":"Original plan"},"why":{"en":"Original why"},"stopIds":["BLK-0001","BLK-0002"],"answers":{"who":"friends"}}'
EDITED='{"name":{"en":"Edited plan"},"stopIds":["BLK-0003"],"answers":{"who":"partner"}}'
fixture() {
  sql_admin -c "insert into auth.users (id) values ('$USER_A') on conflict do nothing"
  sql_admin -c "insert into public.user_outings (id, user_id, schema_version, payload) values ('$OID', '$USER_A', 1, '$ORIGINAL'::jsonb)"
  T0="$(sql_admin -c "select updated_at::text from public.user_outings where id = '$OID'")"   # full microsecond precision, as text
}
state() { sql_admin -c "select case when deleted_at is null then 'live' else 'tombstoned' end || '|name=' || (payload -> 'name' ->> 'en') || '|stops=' || jsonb_array_length(payload -> 'stopIds') from public.user_outings where id = '$OID'"; }
moved() { sql_admin -c "select (updated_at::text <> '$T0')::text from public.user_outings where id = '$OID'"; }
stale_tombstone() { # tag
  printf "with u as (update public.user_outings set deleted_at = now() where id = '%s' and updated_at = '%s' and deleted_at is null returning 1) select '%s=' || count(*) from u;\n" "$OID" "$T0" "$1"
}
stale_edit() { # tag
  printf "with u as (update public.user_outings set payload = '%s'::jsonb where id = '%s' and updated_at = '%s' and deleted_at is null returning 1) select '%s=' || count(*) from u;\n" "$EDITED" "$OID" "$T0" "$1"
}

# ── CASE A ─────────────────────────────────────────────────────────────────────
log "CASE A  an EDIT commits first; a stale conditional tombstone must wait and then affect zero rows"
new_case; fixture
echo "  outing $OID at revision T0 = $T0"
launch cc_a_edit <<SQL
update public.user_outings set payload = '$EDITED'::jsonb where id = '$OID';
select 'EDITED';
select pg_sleep($HOLD);
commit;
select 'COMMITTED';
SQL
PID1=$!
wait_for "cc_a_edit to hold its transaction open after editing" "$(is_sleeping cc_a_edit)" 20
pass "session 1 (cc_a_edit) has edited the payload and is sleeping inside its uncommitted transaction"
launch cc_a_tomb <<SQL
$(stale_tombstone TOMB_ROWS)
commit;
SQL
PID2=$!
wait_for "cc_a_tomb to be BLOCKED by cc_a_edit" "$(is_blocked_by cc_a_tomb cc_a_edit)" 20
! out_has cc_a_tomb 'TOMB_ROWS=' || fail "the stale tombstone finished before the lock was released"
pass "session 2 (conditional tombstone from T0) is genuinely BLOCKED by session 1 (pg_blocking_pids), and has not returned"
finish "$PID1" cc_a_edit; finish "$PID2" cc_a_tomb
check_iso cc_a_edit; check_iso cc_a_tomb; pass "both sessions ran at READ COMMITTED"
out_has cc_a_edit '^COMMITTED$' || fail "session 1 did not commit"
out_has cc_a_tomb '^TOMB_ROWS=0$' || { cat "$WORK/cc_a_tomb.out"; fail "the stale tombstone should have affected 0 rows"; }
pass "after session 1 committed, the stale conditional tombstone affected ZERO rows"
[ "$(state)" = "live|name=Edited plan|stops=1" ] || fail "unexpected final state: $(state)"
[ "$(moved)" = "true" ] || fail "the edit did not move updated_at past T0"
pass "final state: still live, the newer authored edit survived, updated_at moved past T0"

# ── CASE B ─────────────────────────────────────────────────────────────────────
log "CASE B  a TOMBSTONE commits first; a stale conditional payload update must wait and then affect zero rows"
new_case; fixture
echo "  outing $OID at revision T0 = $T0"
launch cc_b_tomb <<SQL
$(stale_tombstone TOMB_ROWS)
select pg_sleep($HOLD);
commit;
select 'COMMITTED';
SQL
PID1=$!
wait_for "cc_b_tomb to hold its transaction open after tombstoning" "$(is_sleeping cc_b_tomb)" 20
pass "session 1 (cc_b_tomb) has tombstoned and scrubbed, and is sleeping inside its uncommitted transaction"
launch cc_b_edit <<SQL
$(stale_edit EDIT_ROWS)
commit;
SQL
PID2=$!
wait_for "cc_b_edit to be BLOCKED by cc_b_tomb" "$(is_blocked_by cc_b_edit cc_b_tomb)" 20
! out_has cc_b_edit 'EDIT_ROWS=' || fail "the stale edit finished before the lock was released"
pass "session 2 (stale conditional payload update from T0) is genuinely BLOCKED by the tombstone transaction"
finish "$PID1" cc_b_tomb; finish "$PID2" cc_b_edit
check_iso cc_b_tomb; check_iso cc_b_edit; pass "both sessions ran at READ COMMITTED"
out_has cc_b_tomb '^TOMB_ROWS=1$' || { cat "$WORK/cc_b_tomb.out"; fail "the tombstone should have affected 1 row"; }
out_has cc_b_edit '^EDIT_ROWS=0$' || { cat "$WORK/cc_b_edit.out"; fail "the stale edit should have affected 0 rows"; }
pass "after the tombstone committed, the stale conditional edit affected ZERO rows"
[ "$(state)" = "tombstoned|name=Deleted outing|stops=0" ] || fail "unexpected final state: $(state)"
[ "$(sql_admin -c "select (payload = '{\"name\":{\"en\":\"Deleted outing\"},\"stopIds\":[],\"answers\":{}}'::jsonb and schema_version = 1)::text from public.user_outings where id = '$OID'")" = "true" ] \
  || fail "the tombstone does not hold exactly the scrub payload"
pass "final state: tombstoned, holding exactly the scrub payload; neither the original nor the smuggled edit survived"

# ── CASE C ─────────────────────────────────────────────────────────────────────
log "CASE C  a TOMBSTONE commits first; an UNGUARDED payload update (no revision filter) must wait and then fail with TS002"
new_case; fixture
launch cc_c_tomb <<SQL
$(stale_tombstone TOMB_ROWS)
select pg_sleep($HOLD);
commit;
select 'COMMITTED';
SQL
PID1=$!
wait_for "cc_c_tomb to hold its transaction open" "$(is_sleeping cc_c_tomb)" 20
launch cc_c_edit <<SQL
update public.user_outings set payload = '$EDITED'::jsonb where id = '$OID';
\echo SQLSTATE=:LAST_ERROR_SQLSTATE
rollback;
SQL
PID2=$!
wait_for "cc_c_edit to be BLOCKED by cc_c_tomb" "$(is_blocked_by cc_c_edit cc_c_tomb)" 20
! out_has cc_c_edit 'SQLSTATE=' || fail "the unguarded edit returned before the lock was released"
pass "session 2 (unguarded payload update) is genuinely BLOCKED by the tombstone transaction"
finish "$PID1" cc_c_tomb; finish "$PID2" cc_c_edit
check_iso cc_c_tomb; check_iso cc_c_edit; pass "both sessions ran at READ COMMITTED"
out_has cc_c_edit '^SQLSTATE=TS002$' || { cat "$WORK/cc_c_edit.out"; fail "the waiting unguarded edit should fail with TS002"; }
pass "after the tombstone committed, the waiting unguarded UPDATE failed with SQLSTATE TS002"
[ "$(state)" = "tombstoned|name=Deleted outing|stops=0" ] || fail "unexpected final state: $(state)"
# direct updates by both client-facing roles, now that the tombstone is committed (separate real sessions)
launch cc_c_direct_auth <<SQL
update public.user_outings set payload = '$ORIGINAL'::jsonb where id = '$OID';
\echo SQLSTATE=:LAST_ERROR_SQLSTATE
rollback;
SQL
PID3=$!; finish "$PID3" cc_c_direct_auth
launch cc_c_direct_svc service_role <<SQL
update public.user_outings set payload = '$ORIGINAL'::jsonb where id = '$OID';
\echo SQLSTATE=:LAST_ERROR_SQLSTATE
rollback;
SQL
PID4=$!; finish "$PID4" cc_c_direct_svc
out_has cc_c_direct_auth '^SQLSTATE=TS002$' || { cat "$WORK/cc_c_direct_auth.out"; fail "an authenticated payload restore should fail with TS002"; }
out_has cc_c_direct_svc '^SQLSTATE=TS002$' || { cat "$WORK/cc_c_direct_svc.out"; fail "a service_role payload restore should fail with TS002"; }
[ "$(state)" = "tombstoned|name=Deleted outing|stops=0" ] || fail "unexpected final state after the direct attempts: $(state)"
pass "a direct payload restore on the committed tombstone fails with TS002 for authenticated AND service_role; the original payload is not restored"

# ── CASE D ─────────────────────────────────────────────────────────────────────
log "CASE D  retry convergence: repeating the conditional tombstone changes nothing"
XMIN_BEFORE="$(sql_admin -c "select xmin::text from public.user_outings where id = '$OID'")"
launch cc_d_retry <<SQL
$(stale_tombstone TOMB_ROWS)
commit;
SQL
PID1=$!; finish "$PID1" cc_d_retry
check_iso cc_d_retry
out_has cc_d_retry '^TOMB_ROWS=0$' || { cat "$WORK/cc_d_retry.out"; fail "the repeated conditional tombstone should affect 0 rows"; }
[ "$(sql_admin -c "select xmin::text from public.user_outings where id = '$OID'")" = "$XMIN_BEFORE" ] || fail "the repeated request rewrote the row"
[ "$(state)" = "tombstoned|name=Deleted outing|stops=0" ] || fail "unexpected final state: $(state)"
pass "the repeated request (the 'timeout after commit' retry) affected zero rows, did not rewrite the row, and the UUID stays tombstoned and occupied"

log "Summary"
no_deadlock || fail "a deadlock was reported somewhere"
echo "  checks passed: $PASSED; deadlocks: 0; every session ran at READ COMMITTED (server default: $default_iso)"
echo "  ALL OUTING-TOMBSTONE CONCURRENCY CHECKS PASSED"
