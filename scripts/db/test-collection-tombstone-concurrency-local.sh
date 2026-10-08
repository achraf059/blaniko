#!/usr/bin/env bash
# LOCAL ONLY. Two-session concurrency proof for collection tombstones (Phase 3A-4A).
#
# pgTAP runs inside ONE transaction, so it cannot show how two clients interact. This harness starts a throwaway
# Postgres container (the production image), applies the six migrations (Phase 2 + collection tombstones) with the
# real Supabase CLI, and then drives TWO REAL, SEPARATE psql SESSIONS (separate server backends, separate
# transactions, application_name cc_*) through the race orderings that matter. It never fakes concurrency with
# sequential statements:
#
#   * the first session takes its locks and then SLEEPS inside its open transaction (pg_sleep), still uncommitted;
#   * the harness polls pg_stat_activity until the first session is verifiably sleeping with its work done;
#   * only then the second session is started, and the harness verifies from pg_blocking_pids() that the second
#     session is BLOCKED BY the first (a real lock wait), not merely slow;
#   * the first session commits; the second proceeds; the harness checks its outcome and the final database state.
#
# Cases
#   A  item INSERT holds the parent lock first       -> a stale conditional tombstone (from the old updated_at) waits, then affects 0 rows
#   B  tombstone holds the parent lock first         -> an item INSERT waits, then fails with SQLSTATE TS001; no child exists
#   C  tombstone first                               -> an item DELETE waits, then deletes 0 rows (the tombstone purged it); no error
#   D  item DELETE holds the parent lock first       -> a stale conditional tombstone waits, then affects 0 rows
#   E  two item INSERTs into the same parent         -> serialize on the parent lock; both succeed; no deadlock (40P01)
#   F  tombstone first                               -> a concurrent rename waits, then fails with SQLSTATE TS002
#   G  service_role REPLACEMENT (DELETE the old membership + INSERT the new one, one transaction) holds BOTH parent locks
#                                                    -> stale tombstones of the old and of the new parent each wait, then affect 0 rows
#      (items are immutable for every role, so this DELETE + INSERT is the only supported way to move a membership)
#
# READ COMMITTED is not assumed: every session reports current_setting('transaction_isolation') and the harness stops
# unless it is 'read committed' (and the server default must be too). Bounded lock_timeout / statement_timeout and a
# bounded polling loop mean a regression can fail the run but never hang it.
#
# Safety: connects only to the container it starts (127.0.0.1 / docker exec), with a throwaway password; the CLI is
# always called with --db-url to that container (never --linked). Requirements: bash, Docker, perl, the Supabase CLI.
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
for name in create_set_updated_at_function create_user_saved_venues create_user_collections_and_items create_user_outings create_user_taste_profiles add_collection_tombstones; do
  m=("$REPO_ROOT"/supabase/migrations/*_"$name".sql); [ -f "${m[0]}" ] || fail "missing migration $name"; MIGRATIONS+=("${m[0]}")
done

# ── container ──────────────────────────────────────────────────────────────────
log "Starting a disposable Postgres container and applying the six migrations with the real CLI"
CONTAINER="blaniko-tombstone-cc-$$-$RANDOM"
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
[ "$applied" = "6" ] || fail "expected 6 applied migrations, got $applied"
echo "  ok: 6 migrations applied"
# Test-of-the-test hook (never set in a normal run): apply a deliberate MUTATION (for example dropping the parent-lock
# trigger) to show that this harness FAILS when a safety mechanism is removed. Local container only.
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
select set_config('request.jwt.claims', '{"sub":"$USER_A","role":"authenticated"}', true);
select 'ISO=' || current_setting('transaction_isolation');
SQL
}
# launch NAME: reads the session body (SQL) from stdin; runs as application_name NAME in the BACKGROUND.
# Afterwards $! is that session's client pid. Output goes to $WORK/NAME.out.
launch() { # launch NAME [ROLE]
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
finish() { # wait for a session to exit
  local pid="$1" name="$2"
  wait "$pid" || true
  [ -s "$WORK/$name.out" ] || fail "session $name produced no output"
}
out_has() { grep -qE "$2" "$WORK/$1.out"; }
check_iso() { out_has "$1" '^ISO=read committed$' || { cat "$WORK/$1.out"; fail "STOP: session $1 did not run at READ COMMITTED"; }; }
no_deadlock() { ! grep -rqE '40P01|deadlock detected' "$WORK"/*.out; }

n=0
new_case() { # sets CID; creates a live collection with the given item venue ids (committed fixtures)
  n=$((n + 1)); CID="cc000000-0000-4000-8000-$(printf '%012d' "$n")"; shift 0
}
fixture() { # venue ids...
  sql_admin -c "insert into auth.users (id) values ('$USER_A') on conflict do nothing"
  sql_admin -c "insert into public.user_collections (id, user_id, name) values ('$CID', '$USER_A', 'case $n')"
  local v; for v in "$@"; do
    sql_admin -c "insert into public.user_collection_items (collection_id, user_id, venue_id) values ('$CID', '$USER_A', '$v')"
  done
  T0="$(sql_admin -c "select updated_at::text from public.user_collections where id = '$CID'")"   # full microsecond precision, as text
}
state() { sql_admin -c "select coalesce((select 'live' from public.user_collections where id = '$CID' and deleted_at is null), 'tombstoned') || '|items=' || (select count(*) from public.user_collection_items where collection_id = '$CID') || '|name=' || (select name from public.user_collections where id = '$CID')"; }
moved() { sql_admin -c "select (updated_at::text <> '$T0')::text from public.user_collections where id = '$CID'"; }

STALE_TOMBSTONE="with u as (update public.user_collections set deleted_at = now() where id = '__CID__' and updated_at = '__T0__' and deleted_at is null returning 1) select '__TAG__=' || count(*) from u;"
stale_tombstone() { # tag
  local q="${STALE_TOMBSTONE//__CID__/$CID}"; q="${q//__T0__/$T0}"; printf '%s\n' "${q//__TAG__/$1}"
}

# ── CASE A ─────────────────────────────────────────────────────────────────────
log "CASE A  item INSERT takes the parent lock first; a stale tombstone must wait and then affect zero rows"
new_case; fixture 'BLK-0001'
echo "  collection $CID at revision T0 = $T0"
launch cc_a_insert <<SQL
insert into public.user_collection_items (collection_id, venue_id) values ('$CID', 'BLK-0900');
select 'INSERTED';
select pg_sleep($HOLD);
commit;
select 'COMMITTED';
SQL
PID1=$!
wait_for "cc_a_insert to hold its transaction open after inserting" "$(is_sleeping cc_a_insert)" 20
pass "session 1 (cc_a_insert) has inserted the item and is sleeping inside its uncommitted transaction"
launch cc_a_tomb <<SQL
$(stale_tombstone TOMB_ROWS)
commit;
select 'TOMB_DONE';
SQL
PID2=$!
wait_for "cc_a_tomb to be BLOCKED by cc_a_insert" "$(is_blocked_by cc_a_tomb cc_a_insert)" 20
! out_has cc_a_tomb 'TOMB_ROWS=' || fail "the stale tombstone finished before the lock was released"
pass "session 2 (stale tombstone from T0) is genuinely BLOCKED by session 1 (pg_blocking_pids), and has not returned"
finish "$PID1" cc_a_insert; finish "$PID2" cc_a_tomb
check_iso cc_a_insert; check_iso cc_a_tomb; pass "both sessions ran at READ COMMITTED"
out_has cc_a_insert '^COMMITTED$' || fail "session 1 did not commit"
out_has cc_a_tomb '^TOMB_ROWS=0$' || { cat "$WORK/cc_a_tomb.out"; fail "the stale tombstone should have affected 0 rows"; }
pass "after session 1 committed, the stale conditional tombstone affected ZERO rows"
[ "$(state)" = "live|items=2|name=case $n" ] || fail "unexpected final state: $(state)"
[ "$(moved)" = "true" ] || fail "the item insert did not move the parent's updated_at"
pass "final state: collection still live with both items; the parent's updated_at moved past T0 (the bump committed with the item)"

# ── CASE B ─────────────────────────────────────────────────────────────────────
log "CASE B  tombstone takes the parent lock first; an item INSERT must wait and then fail with TS001"
new_case; fixture 'BLK-0001' 'BLK-0002'
launch cc_b_tomb <<SQL
$(stale_tombstone TOMB_ROWS)
select pg_sleep($HOLD);
commit;
select 'COMMITTED';
SQL
PID1=$!
wait_for "cc_b_tomb to hold its transaction open after tombstoning" "$(is_sleeping cc_b_tomb)" 20
pass "session 1 (cc_b_tomb) has tombstoned and purged, and is sleeping inside its uncommitted transaction"
launch cc_b_insert <<SQL
insert into public.user_collection_items (collection_id, venue_id) values ('$CID', 'BLK-0901');
\echo SQLSTATE=:LAST_ERROR_SQLSTATE
rollback;
SQL
PID2=$!
wait_for "cc_b_insert to be BLOCKED by cc_b_tomb" "$(is_blocked_by cc_b_insert cc_b_tomb)" 20
! out_has cc_b_insert 'SQLSTATE=' || fail "the item insert returned before the lock was released"
pass "session 2 (item INSERT) is genuinely BLOCKED by the tombstone transaction"
finish "$PID1" cc_b_tomb; finish "$PID2" cc_b_insert
check_iso cc_b_tomb; check_iso cc_b_insert; pass "both sessions ran at READ COMMITTED"
out_has cc_b_tomb '^TOMB_ROWS=1$' || fail "the tombstone should have affected 1 row"
out_has cc_b_insert '^SQLSTATE=TS001$' || { cat "$WORK/cc_b_insert.out"; fail "the blocked item insert should fail with TS001"; }
pass "after the tombstone committed, the waiting item INSERT failed with SQLSTATE TS001 (parent tombstoned)"
[ "$(state)" = "tombstoned|items=0|name=Deleted collection" ] || fail "unexpected final state: $(state)"
pass "final state: tombstoned, scrubbed, and NO child exists beneath it"

# ── CASE C ─────────────────────────────────────────────────────────────────────
log "CASE C  tombstone first; a concurrent item DELETE must wait and then delete nothing, without error"
new_case; fixture 'BLK-0001' 'BLK-0002'
launch cc_c_tomb <<SQL
$(stale_tombstone TOMB_ROWS)
select pg_sleep($HOLD);
commit;
select 'COMMITTED';
SQL
PID1=$!
wait_for "cc_c_tomb to hold its transaction open" "$(is_sleeping cc_c_tomb)" 20
launch cc_c_delete <<SQL
with d as (delete from public.user_collection_items where collection_id = '$CID' and venue_id = 'BLK-0001' returning 1) select 'DEL_ROWS=' || count(*) from d;
commit;
SQL
PID2=$!
wait_for "cc_c_delete to be BLOCKED by cc_c_tomb" "$(is_blocked_by cc_c_delete cc_c_tomb)" 20
! out_has cc_c_delete 'DEL_ROWS=' || fail "the item delete returned before the lock was released"
pass "session 2 (item DELETE) is genuinely BLOCKED by the tombstone transaction"
finish "$PID1" cc_c_tomb; finish "$PID2" cc_c_delete
check_iso cc_c_tomb; check_iso cc_c_delete; pass "both sessions ran at READ COMMITTED"
out_has cc_c_delete '^DEL_ROWS=0$' || { cat "$WORK/cc_c_delete.out"; fail "the item delete should have deleted 0 rows"; }
! grep -qE 'ERROR' "$WORK/cc_c_delete.out" || { cat "$WORK/cc_c_delete.out"; fail "the item delete raised an error"; }
[ "$(state)" = "tombstoned|items=0|name=Deleted collection" ] || fail "unexpected final state: $(state)"
pass "the waiting DELETE removed 0 rows with no error (the tombstone's purge had already removed them); final state valid"

# ── CASE D ─────────────────────────────────────────────────────────────────────
log "CASE D  item DELETE takes the parent lock first; a stale tombstone must wait and then affect zero rows"
new_case; fixture 'BLK-0001' 'BLK-0002'
launch cc_d_delete <<SQL
delete from public.user_collection_items where collection_id = '$CID' and venue_id = 'BLK-0001';
select 'DELETED';
select pg_sleep($HOLD);
commit;
select 'COMMITTED';
SQL
PID1=$!
wait_for "cc_d_delete to hold its transaction open" "$(is_sleeping cc_d_delete)" 20
launch cc_d_tomb <<SQL
$(stale_tombstone TOMB_ROWS)
commit;
SQL
PID2=$!
wait_for "cc_d_tomb to be BLOCKED by cc_d_delete" "$(is_blocked_by cc_d_tomb cc_d_delete)" 20
! out_has cc_d_tomb 'TOMB_ROWS=' || fail "the stale tombstone returned before the lock was released"
pass "session 2 (stale tombstone) is genuinely BLOCKED by the item-delete transaction"
finish "$PID1" cc_d_delete; finish "$PID2" cc_d_tomb
check_iso cc_d_delete; check_iso cc_d_tomb; pass "both sessions ran at READ COMMITTED"
out_has cc_d_tomb '^TOMB_ROWS=0$' || { cat "$WORK/cc_d_tomb.out"; fail "the stale tombstone should have affected 0 rows"; }
[ "$(state)" = "live|items=1|name=case $n" ] || fail "unexpected final state: $(state)"
[ "$(moved)" = "true" ] || fail "the item delete did not move the parent's updated_at"
pass "stale tombstone affected 0 rows; collection live with the remaining item; parent updated_at moved"

# ── CASE E ─────────────────────────────────────────────────────────────────────
log "CASE E  two item INSERTs into one parent serialize on the parent lock: both succeed, no deadlock"
new_case; fixture 'BLK-0001'
launch cc_e_one <<SQL
insert into public.user_collection_items (collection_id, venue_id) values ('$CID', 'BLK-0910');
select pg_sleep($HOLD);
commit;
select 'COMMITTED';
SQL
PID1=$!
wait_for "cc_e_one to hold its transaction open" "$(is_sleeping cc_e_one)" 20
launch cc_e_two <<SQL
insert into public.user_collection_items (collection_id, venue_id) values ('$CID', 'BLK-0911');
commit;
select 'COMMITTED';
SQL
PID2=$!
wait_for "cc_e_two to be BLOCKED by cc_e_one" "$(is_blocked_by cc_e_two cc_e_one)" 20
pass "session 2 (second INSERT into the same parent) is genuinely BLOCKED by session 1"
finish "$PID1" cc_e_one; finish "$PID2" cc_e_two
check_iso cc_e_one; check_iso cc_e_two
out_has cc_e_one '^COMMITTED$' && out_has cc_e_two '^COMMITTED$' || fail "both inserts should commit"
no_deadlock || fail "a deadlock was reported"
[ "$(state)" = "live|items=3|name=case $n" ] || fail "unexpected final state: $(state)"
pass "both inserts committed, three items, no deadlock"

# ── CASE F ─────────────────────────────────────────────────────────────────────
log "CASE F  tombstone first; a concurrent RENAME must wait and then fail with TS002"
new_case; fixture 'BLK-0001'
launch cc_f_tomb <<SQL
$(stale_tombstone TOMB_ROWS)
select pg_sleep($HOLD);
commit;
select 'COMMITTED';
SQL
PID1=$!
wait_for "cc_f_tomb to hold its transaction open" "$(is_sleeping cc_f_tomb)" 20
launch cc_f_rename <<SQL
update public.user_collections set name = 'Smuggled back' where id = '$CID';
\echo SQLSTATE=:LAST_ERROR_SQLSTATE
rollback;
SQL
PID2=$!
wait_for "cc_f_rename to be BLOCKED by cc_f_tomb" "$(is_blocked_by cc_f_rename cc_f_tomb)" 20
pass "session 2 (rename) is genuinely BLOCKED by the tombstone transaction"
finish "$PID1" cc_f_tomb; finish "$PID2" cc_f_rename
check_iso cc_f_tomb; check_iso cc_f_rename
out_has cc_f_rename '^SQLSTATE=TS002$' || { cat "$WORK/cc_f_rename.out"; fail "the waiting rename should fail with TS002"; }
[ "$(state)" = "tombstoned|items=0|name=Deleted collection" ] || fail "unexpected final state: $(state)"
pass "the waiting rename failed with SQLSTATE TS002; the tombstone is intact"

# ── CASE G ─────────────────────────────────────────────────────────────────────
log "CASE G  service_role REPLACEMENT (DELETE old membership + INSERT new) locks and bumps BOTH parents; stale tombstones of each wait and affect zero rows"
new_case; fixture 'BLK-0950'; CID_P="$CID"; T0_P="$T0"
new_case; fixture 'BLK-0951'; CID_Q="$CID"; T0_Q="$T0"
launch cc_g_move service_role <<SQL
delete from public.user_collection_items where collection_id = '$CID_P' and venue_id = 'BLK-0950';
insert into public.user_collection_items (collection_id, user_id, venue_id) values ('$CID_Q', '$USER_A', 'BLK-0950');
select 'MOVED';
select pg_sleep($HOLD);
commit;
select 'COMMITTED';
SQL
PID1=$!
wait_for "cc_g_move to hold its transaction open after the replacement" "$(is_sleeping cc_g_move)" 20
CID="$CID_P"; T0="$T0_P"
launch cc_g_tomb_old <<SQL
$(stale_tombstone TOMB_ROWS)
commit;
SQL
PID2=$!
CID="$CID_Q"; T0="$T0_Q"
launch cc_g_tomb_new <<SQL
$(stale_tombstone TOMB_ROWS)
commit;
SQL
PID3=$!
wait_for "the stale tombstone of the OLD parent to be BLOCKED by cc_g_move" "$(is_blocked_by cc_g_tomb_old cc_g_move)" 20
wait_for "the stale tombstone of the NEW parent to be BLOCKED by cc_g_move" "$(is_blocked_by cc_g_tomb_new cc_g_move)" 20
pass "both stale tombstones are genuinely BLOCKED by the service_role replacement transaction (it holds both parent locks)"
finish "$PID1" cc_g_move; finish "$PID2" cc_g_tomb_old; finish "$PID3" cc_g_tomb_new
out_has cc_g_move '^ISO=read committed$' && out_has cc_g_tomb_old '^ISO=read committed$' && out_has cc_g_tomb_new '^ISO=read committed$' || fail "STOP: a session did not run at READ COMMITTED"
out_has cc_g_move '^COMMITTED$' || { cat "$WORK/cc_g_move.out"; fail "the replacement did not commit"; }
out_has cc_g_tomb_old '^TOMB_ROWS=0$' && out_has cc_g_tomb_new '^TOMB_ROWS=0$' || { cat "$WORK/cc_g_tomb_old.out" "$WORK/cc_g_tomb_new.out"; fail "each stale tombstone should have affected 0 rows"; }
CID="$CID_P"; T0="$T0_P"; [ "$(state)" = "live|items=0|name=case $((n - 1))" ] && [ "$(moved)" = "true" ] || fail "old parent: unexpected state $(state)"
CID="$CID_Q"; T0="$T0_Q"; [ "$(state)" = "live|items=2|name=case $n" ] && [ "$(moved)" = "true" ] || fail "new parent: unexpected state $(state)"
pass "both stale tombstones affected ZERO rows; the membership moved; BOTH parents are live and their updated_at moved past their baselines"

log "Summary"
no_deadlock || fail "a deadlock was reported somewhere"
echo "  checks passed: $PASSED; deadlocks: 0; every session ran at READ COMMITTED (server default: $default_iso)"
echo "  ALL COLLECTION-TOMBSTONE CONCURRENCY CHECKS PASSED"
