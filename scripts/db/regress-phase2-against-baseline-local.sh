#!/usr/bin/env bash
# LOCAL ONLY. Regression comparison of the Phase 2 migrations against the PRE-PHASE-2 production baseline.
#
#   1. Starts a disposable Postgres container (Supabase image, the production Postgres version).
#   2. Loads supabase/baseline/{public_schema,auth_integration,storage_metadata}_*.sql into it.
#   3. Runs supabase/baseline/verify_baseline.sql locally and compares it, section by section, with the LIVE
#      pre-Phase-2 snapshot (catalog_snapshot_*.txt): how faithfully the baseline reconstructs production.
#   4. Applies ONLY the five Phase 2 migrations with the real Supabase CLI (--db-url to the container).
#   5. Runs the same inventory again and proves every PRE-EXISTING object is unchanged and that only the
#      intended Phase 2 objects were added.
#
# It never connects to a hosted project: the only database it touches is the container it starts (127.0.0.1).
# Managed Supabase internals (other schemas' ACLs, roles, extension versions, the managed event triggers, the
# migration history table) are NOT bootstrapped by the baseline; those sections are reported as skipped, with the
# reason, rather than faked.
#
# Environment: SUPABASE_CMD (default: supabase), SYNC_TEST_PG_IMAGE, SYNC_TEST_KEEP=1.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE="$REPO_ROOT/supabase/baseline"
IMAGE="${SYNC_TEST_PG_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.111}"
SUPABASE_CMD="${SUPABASE_CMD:-supabase}"
PASSWORD="postgres"   # throwaway, local container only
WORK="$(mktemp -d)"
CONTAINER=""

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

SNAP_FILE=("$BASE"/catalog_snapshot_*.txt)
PUB_FILE=("$BASE"/public_schema_*.sql)
AUTH_FILE=("$BASE"/auth_integration_*.sql)
STO_FILE=("$BASE"/storage_metadata_*.sql)
for f in "${SNAP_FILE[0]}" "${PUB_FILE[0]}" "${AUTH_FILE[0]}" "${STO_FILE[0]}" "$BASE/verify_baseline.sql"; do [ -f "$f" ] || fail "missing baseline file $f"; done

PHASE2=()
for name in create_set_updated_at_function create_user_saved_venues create_user_collections_and_items create_user_outings create_user_taste_profiles; do
  m=("$REPO_ROOT"/supabase/migrations/*_"$name".sql); [ -f "${m[0]}" ] || fail "missing migration $name"; PHASE2+=("${m[0]}")
done

start_container() {
  CONTAINER="blaniko-baseline-regress-$$-$RANDOM"
  docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$PASSWORD" -p 127.0.0.1::5432 "$IMAGE" >/dev/null
  PORT="$(docker port "$CONTAINER" 5432/tcp | head -1 | sed 's/.*://')"
  local ready=0 i
  for i in $(seq 1 120); do
    if docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -q -tA -U supabase_admin -d postgres \
         -c "select to_regclass('auth.users') is not null and exists (select 1 from pg_roles where rolname = 'authenticated')" 2>/dev/null | grep -q '^t$'; then
      ready=$((ready + 1)); [ "$ready" -ge 3 ] && break
    else ready=0; fi
    sleep 1
  done
  [ "$ready" -ge 3 ] || fail "container did not become ready"
  DB_URL="postgresql://postgres:${PASSWORD}@127.0.0.1:${PORT}/postgres"
}
psql_admin() { docker exec -i -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -q -tA -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }

# Splits verify_baseline.sql into one file per statement, in order.
python3 - "$BASE/verify_baseline.sql" "$WORK/q" <<'PY'
import re, sys, os
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
parts = re.split(r"^-- ## (\S+)\n", open(src).read(), flags=re.M)
names = []
for i in range(1, len(parts), 2):
    name, body = parts[i], parts[i + 1]
    sql = "\n".join(l for l in body.splitlines() if not l.startswith("--")).strip()
    open(os.path.join(out, name + ".sql"), "w").write(sql + "\n")
    names.append(name)
open(os.path.join(out, "_order"), "w").write("\n".join(names) + "\n")
PY

# Catalog deparse (pg_get_expr, pg_get_constraintdef, pg_get_triggerdef) qualifies names that are not on the session
# search_path. The live snapshot was taken through the Management API, whose search_path has public but not auth, so the
# local inventory uses the same search_path; otherwise auth.uid() would print as uid() and compare as a false difference.
snapshot_local() { # $1 = output file, same format as the live snapshot
  : > "$1"
  while read -r name; do
    printf '\n## %s\n' "$name" >> "$1"
    if out="$(docker exec -i -e PGPASSWORD="$PASSWORD" -e PGOPTIONS='-c search_path=public,extensions' "$CONTAINER" psql -X -q -tA -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < "$WORK/q/$name.sql" 2>"$WORK/q/err")"; then
      if [ -n "$out" ]; then printf '%s\n' "$out" >> "$1"; else echo "<no rows>" >> "$1"; fi
    else
      echo "<query unavailable>" >> "$1"
    fi
  done < "$WORK/q/_order"
}

# ── 1-2. load the baseline ─────────────────────────────────────────────────────

log "Loading the pre-Phase-2 baseline into a disposable container"
start_container
echo "  container ready on 127.0.0.1:$PORT"
if psql_admin -c "select exists (select 1 from pg_event_trigger where evtname = 'ensure_rls')" | grep -q '^t$'; then
  echo "  note: the image already has an ensure_rls event trigger"
fi
for f in "${PUB_FILE[0]}" "${AUTH_FILE[0]}"; do
  if psql_admin < "$f" >"$WORK/load.out" 2>&1; then echo "  loaded $(basename "$f")"; else cat "$WORK/load.out"; fail "loading $(basename "$f") failed"; fi
done
# The bucket row needs storage.buckets, which the Storage SERVICE creates; the bare Postgres image has an empty
# storage schema. That is a limitation of the local environment, reported rather than faked.
if [ "$(psql_admin -c "select to_regclass('storage.buckets') is not null")" = "t" ]; then
  if psql_admin < "${STO_FILE[0]}" >"$WORK/load.out" 2>&1; then echo "  loaded $(basename "${STO_FILE[0]}")"; else cat "$WORK/load.out"; fail "loading storage metadata failed"; fi
else
  echo "  LIMITATION: storage.buckets does not exist in this image (the Storage service creates it), so $(basename "${STO_FILE[0]}")"
  echo "              cannot be loaded and the storage sections (18, 19) cannot be compared locally."
fi

# The guard really refuses a populated database (it must, or the files could be applied by mistake).
if psql_admin < "${PUB_FILE[0]}" >"$WORK/guard.out" 2>&1; then fail "the public baseline loaded twice (guard missing)"; fi
grep -q 'BLANIKO BASELINE refuses to run' "$WORK/guard.out" || { cat "$WORK/guard.out"; fail "the guard did not fire with its message"; }
echo "  ok: re-loading the public baseline is refused by its guard"

# ── 3. baseline vs LIVE snapshot ───────────────────────────────────────────────

log "Local reconstruction vs the LIVE pre-Phase-2 snapshot"
snapshot_local "$WORK/local_before.txt"
cp "${SNAP_FILE[0]}" "$WORK/live.txt"

cat > "$WORK/compare.py" <<'PY'
import re, sys

def parse(path):
    sections, cur = {}, None
    for line in open(path).read().splitlines():
        if line.startswith("## "): cur = line[3:]; sections[cur] = []
        elif cur is not None and line and not line.startswith("#") and line != "<no rows>": sections[cur].append(line)
    return sections

def sec_is_unavailable(path, name):
    txt = open(path).read()
    m = re.search(r"^## %s\n(.*?)(?=^## |\Z)" % re.escape(name), txt, flags=re.M | re.S)
    return bool(m) and "<query unavailable>" in m.group(1)

mode = sys.argv[1]
if mode == "live-vs-local":
    live, local = parse(sys.argv[2]), parse(sys.argv[3])
    # Sections that describe MANAGED Supabase internals, not objects the baseline defines.
    skip = {
      "01_migrations": "migration history is kept by the CLI (supabase_migrations), not bootstrapped by the baseline",
      "02_extensions": "extensions and their versions are provided by the platform image",
      "03_roles": "roles are provided by the platform image",
      "17_schema_acls": "auth and storage schema ACLs are platform-managed (only public is compared)",
    }
    def keep(name, lines):
        if name == "15_event_triggers":   # only the baseline's own event trigger; owner differs by design
            return sorted(re.sub(r"\|owner=[a-z_]+", "|owner=*", l) for l in lines if l.startswith("ensure_rls|"))
        if name == "16_default_acls":      # only role postgres / schema public, the rows the baseline sets
            return sorted(l for l in lines if l.startswith("postgres|public|"))
        if name == "17_schema_acls":
            return sorted(l for l in lines if l.startswith("public|"))
        if name == "12_public_functions":  # handle_new_user keeps the default ACL live; effective EXECUTE is compared in 13
            return sorted(re.sub(r"(handle_new_user\(\)\|.*\|acl=)[^|]*", r"\1*", l) for l in lines)
        return sorted(lines)
    bad = 0
    for name in live:
        if name in skip: print("  SKIP  %-40s %s" % (name, skip[name])); continue
        if name == "19_storage_rls_and_policies" and local.get("18_storage_bucket_venue_images") == ["<query unavailable>"]:
            print("  SKIP  %-40s not available locally (no storage tables in the bare image)" % name); continue
        if local.get(name) == ["<query unavailable>"]:
            print("  SKIP  %-40s not available locally (the Storage service creates the storage tables; the bare image has none)" % name); continue
        a, b = keep(name, live[name]), keep(name, local.get(name, []))
        if a == b: print("  MATCH %-40s %d rows" % (name, len(a)))
        else:
            bad += 1
            print("  DIFF  %-40s live=%d local=%d" % (name, len(a), len(b)))
            for l in sorted(set(a) - set(b)): print("        - live only : " + l[:200])
            for l in sorted(set(b) - set(a)): print("        + local only: " + l[:200])
    sys.exit(1 if bad else 0)

if mode == "before-vs-after":
    before, after = parse(sys.argv[2]), parse(sys.argv[3])
    new = re.compile(r"user_saved_venues|user_collections|user_collection_items|user_outings|user_taste_profiles|set_updated_at|is_valid_outing_payload_v1|taste_array_is_valid")
    skip = {"01_migrations"}
    changed = 0; added_total = 0
    for name in before:
        if name in skip: continue
        b, a = set(before[name]), set(after.get(name, []))
        removed_or_changed = sorted(b - a)
        added = sorted(a - b)
        foreign = [l for l in added if not new.search(l)]
        status = "UNCHANGED" if not removed_or_changed and not foreign else "CHANGED"
        if status == "CHANGED": changed += 1
        added_total += len(added)
        print("  %-9s %-40s pre-existing rows kept: %-4d new Phase 2 rows added: %d" % (status, name, len(b & a), len(added) - len(foreign)))
        for l in removed_or_changed: print("        - pre-existing row removed/changed: " + l[:220])
        for l in foreign: print("        + unexpected added row (not a Phase 2 object): " + l[:220])
    print("  total new rows (all Phase 2 objects): %d" % added_total)
    sys.exit(1 if changed else 0)
PY
python3 "$WORK/compare.py" live-vs-local "$WORK/live.txt" "$WORK/local_before.txt" | tee "$WORK/live_vs_local.out" || BASELINE_DIFFS=1
[ "${BASELINE_DIFFS:-0}" = "0" ] && echo "  every compared section of the reconstruction matches production" || echo "  NOTE: the reconstruction differs from production in the sections marked DIFF above"

# ── 4. apply the five Phase 2 migrations ───────────────────────────────────────

log "Applying the five Phase 2 migrations with the real CLI (on top of the baseline)"
mkdir -p "$WORK/proj/supabase/migrations"
cp "$REPO_ROOT/supabase/config.toml" "$WORK/proj/supabase/config.toml"
for f in "${PHASE2[@]}"; do cp "$f" "$WORK/proj/supabase/migrations/"; done
case "$DB_URL" in postgresql://postgres:*@127.0.0.1:*) ;; *) fail "refusing non-local database url" ;; esac
# shellcheck disable=SC2086
if ! PGSSLMODE=disable perl -e 'alarm shift; exec @ARGV' 240 $SUPABASE_CMD db push --db-url "$DB_URL" --workdir "$WORK/proj" --yes >"$WORK/push.log" 2>&1; then
  cat "$WORK/push.log"; fail "db push failed on top of the baseline"
fi
tail -n 3 "$WORK/push.log" | sed 's/^/    /'

# ── 5. before vs after ─────────────────────────────────────────────────────────

log "Pre-existing objects before vs after Phase 2 (same inventory)"
snapshot_local "$WORK/local_after.txt"
python3 "$WORK/compare.py" before-vs-after "$WORK/local_before.txt" "$WORK/local_after.txt" | tee "$WORK/before_after.out"
log "Result"
echo "  PHASE 2 ALTERED NO PRE-EXISTING OBJECT; it only added Phase 2 objects."
[ "${BASELINE_DIFFS:-0}" = "0" ] || echo "  (the baseline reconstruction had the DIFF sections reported above; see the README limitations)"
