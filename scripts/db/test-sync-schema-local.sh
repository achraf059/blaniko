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
# Phase 3A (collection tombstones) is layered on top, in this order:
#   3b. Static review of 20261008090000_add_collection_tombstones.sql, then it is applied with the real CLI
#       after the Phase 2 checks; the catalog delta against the Phase 2 state is printed and must touch only
#       the collection / item objects; pre-existing non-Phase-2 objects must still be identical.
#   4.  (the pgTAP files now include 21_collection_tombstones.test.sql)
#   8b. Tombstone rollback reference: refuses while a tombstone exists (and changes nothing), succeeds when none
#       does and restores the Phase 2 catalog exactly, and the migration re-applies to the Phase 3A catalog exactly.
#   3c. Phase 3B (outing tombstones, 20261008090002_add_outing_tombstones.sql) is layered on the same way: static review,
#       real-CLI apply after Phase 3A, identical pre-existing catalog, a delta that may touch ONLY user_outings objects
#       (the collection Phase 3A catalog must stay exactly as it was), then the pgTAP files (31_outing_tombstones.test.sql).
#   8c. Outing tombstone rollback: refuses while a tombstone exists (and changes nothing), restores the exact collection-only
#       Phase 3A catalog when none does, and re-applies exactly; then the collection rollback restores the exact Phase 2 catalog.
#       It also shows what happens if a Phase 2 rollback is run BEFORE the matching tombstone rollback (reverse-order requirement).
# Two-session concurrency is proved by scripts/db/test-collection-tombstone-concurrency-local.sh and
# scripts/db/test-outing-tombstone-concurrency-local.sh.
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
P3A_NAME=add_collection_tombstones
NEW_FUNCTIONS_P2="'set_updated_at','is_valid_outing_payload_v1','taste_array_is_valid'"
NEW_FUNCTIONS_P3A="'user_collections_tombstone_guard','user_collections_purge_items','user_collection_items_lock_parent','user_collection_items_bump_parent_on_insert','user_collection_items_bump_parent_on_delete'"
P3B_NAME=add_outing_tombstones
NEW_FUNCTIONS_P3B="'user_outings_tombstone_guard'"
NEW_FUNCTIONS="$NEW_FUNCTIONS_P2,$NEW_FUNCTIONS_P3A,$NEW_FUNCTIONS_P3B"   # every object the snapshot treats as "ours"

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

P3A_MATCHES=("$REPO_ROOT"/supabase/migrations/*_"$P3A_NAME".sql)
[ "${#P3A_MATCHES[@]}" -eq 1 ] && [ -f "${P3A_MATCHES[0]}" ] || fail "expected exactly one migration for $P3A_NAME"
P3A_FILE="${P3A_MATCHES[0]}"
P3B_MATCHES=("$REPO_ROOT"/supabase/migrations/*_"$P3B_NAME".sql)
[ "${#P3B_MATCHES[@]}" -eq 1 ] && [ -f "${P3B_MATCHES[0]}" ] || fail "expected exactly one migration for $P3B_NAME"
P3B_FILE="${P3B_MATCHES[0]}"

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

log "Static review of the Phase 3A migration ($(basename "$P3A_FILE"))"
p3a_body="$(strip_comments "$P3A_FILE")"
p3a_fail=0
p3a_forbid() { if printf '%s\n' "$p3a_body" | grep -iE "$2" >/dev/null; then printf '  [p3a] forbidden: %s\n' "$1"; p3a_fail=1; fi; }
p3a_count() { # description, regex, expected count
  local n; n="$(printf '%s\n' "$p3a_body" | grep -oiE "$2" | wc -l | tr -d ' ')"
  if [ "$n" != "$3" ]; then printf '  [p3a] expected %s x %s, found %s\n' "$3" "$1" "$n"; p3a_fail=1; fi
}
p3a_forbid "alter default privileges"            'alter[[:space:]]+default[[:space:]]+privileges'
p3a_forbid "drop of anything but the one policy"  'drop[[:space:]]+(table|schema|extension|function|trigger|index|column|constraint|type)'
p3a_forbid "truncate"                             'truncate'
p3a_forbid "disabling a trigger"                  'disable[[:space:]]+trigger'
p3a_forbid "broad USING/WITH CHECK (true)"        'using[[:space:]]*\([[:space:]]*true[[:space:]]*\)|with[[:space:]]+check[[:space:]]*\([[:space:]]*true[[:space:]]*\)'
p3a_forbid "grant to anon / public"               'grant[^;]*[[:space:]]to[[:space:]]+[^;]*(^|[^a-z_])(anon|public)([^a-z_]|$)'
p3a_forbid "any GRANT other than UPDATE (deleted_at)" 'grant[[:space:]]+(all|select|insert|delete|references|trigger|truncate|execute)'
p3a_forbid "touches handle_new_user, storage or a trigger on auth" 'handle_new_user|storage\.|[[:space:]]on[[:space:]]+auth\.'
p3a_forbid "touches an unrelated Phase 2 table"   'user_outings|user_saved_venues|user_taste_profiles'
p3a_forbid "machine path or project ref"          '/Users/|vptjbfoaqmbdjdqwloae|supabase\.co'
dyn_sql=$'execute[[:space:]]+(format|immediate|\'|"|\\$|[a-z_]+[[:space:]]*;)'   # "execute function ..." (CREATE TRIGGER) does not match
p3a_forbid "dynamic SQL (EXECUTE of a string)"    "$dyn_sql"
p3a_count "SECURITY DEFINER function clause"      'language[[:space:]]+plpgsql[[:space:]]+security[[:space:]]+definer' 2   # the clause, not the words inside a COMMENT string
p3a_count "pinned search_path = ''"               "set[[:space:]]+search_path[[:space:]]*=[[:space:]]*''" 5
p3a_count "REVOKE ALL ON FUNCTION"                'revoke[[:space:]]+all[[:space:]]+on[[:space:]]+function' 5
p3a_count "DROP POLICY (the collections DELETE policy only)" 'drop[[:space:]]+policy[[:space:]]+"authenticated users can delete own collections"[[:space:]]+on[[:space:]]+public\.user_collections' 1
p3a_count "DROP POLICY (total)"                   'drop[[:space:]]+policy' 1
p3a_count "REVOKE DELETE"                         'revoke[[:space:]]+delete[[:space:]]+on[[:space:]]+table[[:space:]]+public\.user_collections[[:space:]]+from[[:space:]]+(authenticated|service_role)' 2
p3a_count "REVOKE UPDATE on items from service_role" 'revoke[[:space:]]+update[[:space:]]+on[[:space:]]+table[[:space:]]+public\.user_collection_items[[:space:]]+from[[:space:]]+service_role' 1
p3a_count "GRANT UPDATE (deleted_at)"             'grant[[:space:]]+update[[:space:]]*\([[:space:]]*deleted_at[[:space:]]*\)[[:space:]]+on[[:space:]]+table[[:space:]]+public\.user_collections[[:space:]]+to[[:space:]]+authenticated' 1
[ "$p3a_fail" -eq 0 ] || fail "static review of the Phase 3A migration found problems"
echo "  ok: exactly 2 SECURITY DEFINER functions, 5 pinned search_paths, 5 EXECUTE revokes, 1 policy dropped, no dynamic SQL, no broad grants"

log "Static review of the Phase 3B migration ($(basename "$P3B_FILE"))"
p3b_body="$(strip_comments "$P3B_FILE")"
p3b_fail=0
p3b_forbid() { if printf '%s\n' "$p3b_body" | grep -iE "$2" >/dev/null; then printf '  [p3b] forbidden: %s\n' "$1"; p3b_fail=1; fi; }
p3b_count() {
  local n; n="$(printf '%s\n' "$p3b_body" | grep -oiE "$2" | wc -l | tr -d ' ')"
  if [ "$n" != "$3" ]; then printf '  [p3b] expected %s x %s, found %s\n' "$3" "$1" "$n"; p3b_fail=1; fi
}
p3b_forbid "alter default privileges"            'alter[[:space:]]+default[[:space:]]+privileges'
p3b_forbid "drop of anything but the one policy"  'drop[[:space:]]+(table|schema|extension|function|trigger|index|column|constraint|type)'
p3b_forbid "truncate"                             'truncate'
p3b_forbid "disabling a trigger"                  'disable[[:space:]]+trigger'
p3b_forbid "SECURITY DEFINER (the outing migration needs none)" 'security[[:space:]]+definer'
p3b_forbid "broad USING/WITH CHECK (true)"        'using[[:space:]]*\([[:space:]]*true[[:space:]]*\)|with[[:space:]]+check[[:space:]]*\([[:space:]]*true[[:space:]]*\)'
p3b_forbid "grant to anon / public"               'grant[^;]*[[:space:]]to[[:space:]]+[^;]*(^|[^a-z_])(anon|public)([^a-z_]|$)'
p3b_forbid "any GRANT other than UPDATE (deleted_at)" 'grant[[:space:]]+(all|select|insert|delete|references|trigger|truncate|execute)'
p3b_forbid "touches handle_new_user, storage or a trigger on auth" 'handle_new_user|storage\.|[[:space:]]on[[:space:]]+auth\.'
p3b_forbid "touches collections, items, saved venues or taste profiles" 'user_collection|user_saved_venues|user_taste_profiles'
p3b_forbid "machine path or project ref"          '/Users/|vptjbfoaqmbdjdqwloae|supabase\.co'
p3b_forbid "dynamic SQL (EXECUTE of a string)"    "$dyn_sql"
p3b_count "pinned search_path = ''"               "set[[:space:]]+search_path[[:space:]]*=[[:space:]]*''" 1
p3b_count "REVOKE ALL ON FUNCTION"                'revoke[[:space:]]+all[[:space:]]+on[[:space:]]+function' 1
p3b_count "DROP POLICY (the outings DELETE policy only)" 'drop[[:space:]]+policy[[:space:]]+"authenticated users can delete own outings"[[:space:]]+on[[:space:]]+public\.user_outings' 1
p3b_count "DROP POLICY (total)"                   'drop[[:space:]]+policy' 1
p3b_count "REVOKE DELETE"                         'revoke[[:space:]]+delete[[:space:]]+on[[:space:]]+table[[:space:]]+public\.user_outings[[:space:]]+from[[:space:]]+(authenticated|service_role)' 2
p3b_count "GRANT UPDATE (deleted_at)"             'grant[[:space:]]+update[[:space:]]*\([[:space:]]*deleted_at[[:space:]]*\)[[:space:]]+on[[:space:]]+table[[:space:]]+public\.user_outings[[:space:]]+to[[:space:]]+authenticated' 1
[ "$p3b_fail" -eq 0 ] || fail "static review of the Phase 3B migration found problems"
echo "  ok: no SECURITY DEFINER, 1 pinned search_path, 1 EXECUTE revoke, 1 policy dropped, no dynamic SQL, no broad grants, collections untouched"

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

# Detailed inventory of the Phase 2 objects (columns, constraints, indexes, triggers, policies, grants, functions,
# comments). Used to prove exactly what Phase 3A changes and that its rollback restores the previous state.
inventory() { docker exec -i -e PGPASSWORD="$PASSWORD" -e PGOPTIONS='-c search_path=public,extensions' "$CONTAINER" \
  psql -X -q -tA -v ON_ERROR_STOP=1 -U supabase_admin -d postgres <<SQL
select line from (
  select 'rel|' || c.relname || '|' || c.relkind::text || '|rls=' || c.relrowsecurity || '|force=' || c.relforcerowsecurity || '|owner=' || pg_get_userbyid(c.relowner) || '|acl=' || coalesce(c.relacl::text, '') as line
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname in ($NEW_TABLES)
  union all
  select 'col|' || c.relname || '|' || a.attname || '|' || format_type(a.atttypid, a.atttypmod) || '|nn=' || a.attnotnull || '|def=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '') || '|acl=' || coalesce(a.attacl::text, '')
    from pg_attribute a join pg_class c on c.oid = a.attrelid left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where c.relnamespace = 'public'::regnamespace and c.relname in ($NEW_TABLES) and a.attnum > 0 and not a.attisdropped
  union all
  select 'con|' || c.relname || '|' || k.conname || '|' || pg_get_constraintdef(k.oid)
    from pg_constraint k join pg_class c on c.oid = k.conrelid where c.relnamespace = 'public'::regnamespace and c.relname in ($NEW_TABLES)
  union all
  select 'idx|' || tablename || '|' || indexdef from pg_indexes where schemaname = 'public' and tablename in ($NEW_TABLES)
  union all
  select 'trg|' || c.relname || '|' || t.tgname || '|en=' || t.tgenabled::text || '|' || pg_get_triggerdef(t.oid)
    from pg_trigger t join pg_class c on c.oid = t.tgrelid where not t.tgisinternal and c.relnamespace = 'public'::regnamespace and c.relname in ($NEW_TABLES)
  union all
  select 'pol|' || tablename || '|' || policyname || '|' || cmd || '|' || roles::text || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '')
    from pg_policies where schemaname = 'public' and tablename in ($NEW_TABLES)
  union all
  select 'fn|' || p.oid::regprocedure::text || '|owner=' || pg_get_userbyid(p.proowner) || '|secdef=' || p.prosecdef || '|cfg=' || coalesce(p.proconfig::text, '') || '|acl=' || coalesce(p.proacl::text, '') || '|vol=' || p.provolatile::text
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ($NEW_FUNCTIONS)
  union all
  select 'cmt|' || c.relname || '|' || coalesce(a.attname, '') || '|' || d.description
    from pg_description d join pg_class c on c.oid = d.objoid and d.classoid = 'pg_class'::regclass
    left join pg_attribute a on a.attrelid = c.oid and a.attnum = d.objsubid and d.objsubid > 0
   where c.relnamespace = 'public'::regnamespace and c.relname in ($NEW_TABLES)
) x order by 1;
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

# ── 3b. Phase 3A: collection tombstones, applied on top of Phase 2 ──────────────

log "Applying the Phase 3A collection-tombstone migration with the real CLI (on top of Phase 2)"
inventory > "$WORK/inventory.p2"
make_workdir "${MIGRATION_FILES[@]}" "$P3A_FILE"
cli_push >"$WORK/push3a.log" 2>&1 || { cat "$WORK/push3a.log"; fail "db push of the Phase 3A migration failed"; }
tail -n 4 "$WORK/push3a.log" | sed 's/^/    /'
versions="$(sql_admin -c "select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations")"
expected="$expected,$(basename "$P3A_FILE" | cut -d_ -f1)"
[ "$versions" = "$expected" ] || fail "migration history mismatch after Phase 3A: got $versions, expected $expected"
echo "  ok: recorded versions = $versions"
if cli_push >"$WORK/push3a2.log" 2>&1 && grep -qiE 'up to date|no change' "$WORK/push3a2.log"; then
  echo "  ok: second push is a no-op"
else
  cat "$WORK/push3a2.log"; fail "second push after Phase 3A was not a clean no-op"
fi

log "Pre-existing (non-Phase-2, non-Phase-3A) objects must still be identical"
snapshot > "$WORK/snapshot.after3a"
diff -u "$WORK/snapshot.after" "$WORK/snapshot.after3a" >"$WORK/snapshot3a.diff" \
  || { cat "$WORK/snapshot3a.diff"; fail "Phase 3A changed an object outside the Phase 2 / Phase 3A set"; }
echo "  ok: $(wc -l < "$WORK/snapshot.after" | tr -d ' ') catalog rows compared, identical"

log "Catalog delta of Phase 3A against the Phase 2 state (must touch only collection / item objects)"
inventory > "$WORK/inventory.p3a"
diff "$WORK/inventory.p2" "$WORK/inventory.p3a" | grep -E '^[<>]' > "$WORK/inventory.delta" || true
foreign="$(grep -vE 'user_collection' "$WORK/inventory.delta" || true)"
if [ -n "$foreign" ]; then printf '%s\n' "$foreign" | cut -c1-200; fail "Phase 3A changed an object that is not a collection / item object"; fi
echo "  removed/changed rows (Phase 2 state):"; grep '^<' "$WORK/inventory.delta" | cut -c1-210 | sed 's/^/    /'
echo "  added rows (Phase 3A state): $(grep -c '^>' "$WORK/inventory.delta")"
grep '^>' "$WORK/inventory.delta" | cut -c1-170 | sed 's/^/    /'
for must in "col|user_collections|deleted_at|timestamp with time zone" "con|user_collections|user_collections_tombstone_scrubbed" \
            "trg|user_collections|user_collections_tombstone_guard" "trg|user_collections|user_collections_purge_items" \
            "trg|user_collection_items|user_collection_items_lock_parent" "trg|user_collection_items|user_collection_items_bump_parent_on_insert" \
            "trg|user_collection_items|user_collection_items_bump_parent_on_delete"; do
  grep -qF -- "> $must" "$WORK/inventory.delta" || fail "expected added row not in the delta: $must"
done
grep -qF -- "< pol|user_collections|authenticated users can delete own collections|DELETE" "$WORK/inventory.delta" || fail "the DELETE policy removal is not in the delta"
grep -qE -- "^< rel\|user_collection_items\|.*service_role=arwd/postgres" "$WORK/inventory.delta" && grep -qE -- "^> rel\|user_collection_items\|.*service_role=ard/postgres" "$WORK/inventory.delta" \
  || fail "the service_role UPDATE revocation on user_collection_items is not in the delta"
grep -E -- "^[<>] rel\|user_collection_items\|" "$WORK/inventory.delta" | grep -E 'authenticated=' | grep -qvE 'authenticated=ard/postgres' && fail "the items delta changed authenticated's item privileges"
echo "  ok: service_role UPDATE on user_collection_items revoked; authenticated's item privileges (ard) unchanged"
echo "  ok: the delta contains the intended additions and the policy removal, and nothing else"

# ── 3c. Phase 3B: outing tombstones, applied on top of Phase 3A ──────────────────

log "Applying the Phase 3B outing-tombstone migration with the real CLI (on top of Phase 3A)"
make_workdir "${MIGRATION_FILES[@]}" "$P3A_FILE" "$P3B_FILE"
cli_push >"$WORK/push3b.log" 2>&1 || { cat "$WORK/push3b.log"; fail "db push of the Phase 3B migration failed"; }
tail -n 4 "$WORK/push3b.log" | sed 's/^/    /'
versions="$(sql_admin -c "select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations")"
expected="$expected,$(basename "$P3B_FILE" | cut -d_ -f1)"
[ "$versions" = "$expected" ] || fail "migration history mismatch after Phase 3B: got $versions, expected $expected"
echo "  ok: recorded versions = $versions"
if cli_push >"$WORK/push3b2.log" 2>&1 && grep -qiE 'up to date|no change' "$WORK/push3b2.log"; then
  echo "  ok: second push is a no-op"
else
  cat "$WORK/push3b2.log"; fail "second push after Phase 3B was not a clean no-op"
fi

log "Pre-existing (non-Phase-2, non-Phase-3) objects must still be identical"
snapshot > "$WORK/snapshot.after3b"
diff -u "$WORK/snapshot.after" "$WORK/snapshot.after3b" >"$WORK/snapshot3b.diff" \
  || { cat "$WORK/snapshot3b.diff"; fail "Phase 3B changed an object outside the Phase 2 / Phase 3 set"; }
echo "  ok: $(wc -l < "$WORK/snapshot.after" | tr -d ' ') catalog rows compared, identical"

log "Catalog delta of Phase 3B against the collection-only Phase 3A state (must touch only user_outings objects)"
inventory > "$WORK/inventory.p3b"
diff "$WORK/inventory.p3a" "$WORK/inventory.p3b" | grep -E '^[<>]' > "$WORK/inventory.delta3b" || true
foreign="$(grep -vE 'user_outings' "$WORK/inventory.delta3b" || true)"
if [ -n "$foreign" ]; then printf '%s\n' "$foreign" | cut -c1-200; fail "Phase 3B changed an object that is not an outing object (the collection Phase 3A catalog must stay unchanged)"; fi
echo "  removed/changed rows (Phase 3A state):"; grep '^<' "$WORK/inventory.delta3b" | cut -c1-210 | sed 's/^/    /'
echo "  added rows (Phase 3B state): $(grep -c '^>' "$WORK/inventory.delta3b")"
grep '^>' "$WORK/inventory.delta3b" | cut -c1-170 | sed 's/^/    /'
for must in "col|user_outings|deleted_at|timestamp with time zone" "con|user_outings|user_outings_tombstone_scrubbed" \
            "trg|user_outings|user_outings_tombstone_guard" "fn|user_outings_tombstone_guard()"; do
  grep -qF -- "> $must" "$WORK/inventory.delta3b" || fail "expected added row not in the delta: $must"
done
grep -qF -- "< pol|user_outings|authenticated users can delete own outings|DELETE" "$WORK/inventory.delta3b" || fail "the outing DELETE policy removal is not in the delta"
grep -qE -- "^< rel\|user_outings\|.*authenticated=ard/postgres,service_role=arwd/postgres" "$WORK/inventory.delta3b" && grep -qE -- "^> rel\|user_outings\|.*authenticated=ar/postgres,service_role=arw/postgres" "$WORK/inventory.delta3b" \
  || fail "the DELETE revocations on user_outings are not in the delta"
echo "  ok: the delta contains the intended additions, the policy removal and the DELETE revocations, and nothing else"

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
[ "${#ROLLBACKS[@]}" -eq 7 ] || fail "expected 7 rollback files"
for rb in "${ROLLBACKS[@]}"; do grep -q 'LOCAL / EMERGENCY REFERENCE ONLY' "$rb" || fail "$(basename "$rb") lacks the reference-only banner"; done
echo "  ok: all seven carry the LOCAL / EMERGENCY REFERENCE ONLY banner and sit outside supabase/migrations/"
[ "$(count_new)" = "14" ] || fail "expected 5 tables + 9 functions before the rollback, got $(count_new)"
rollback_file() { local m=("$REPO_ROOT"/supabase/rollbacks/*_"$1".down.sql); [ -f "${m[0]}" ] || fail "no rollback file for $1"; printf '%s' "${m[0]}"; }
# Wrong order: dropping the shared function first must fail with the dependency error and change nothing.
wrong_out="$(sql_owner < "$(rollback_file create_set_updated_at_function)" 2>&1 || true)"
printf '%s\n' "$wrong_out" | grep -qiE 'cannot drop function (public\.)?set_updated_at\(\) because other objects depend on it' \
  || { printf '%s\n' "$wrong_out"; fail "the wrong-order rollback did not fail with the expected dependency error"; }
[ "$(count_new)" = "14" ] || fail "the wrong-order rollback changed something"
echo "  ok: the wrong order (function first) fails with the dependency error and changes nothing"

# Reverse-order requirement, shown inside a transaction that is rolled back: running a Phase 2 rollback BEFORE the matching
# tombstone rollback drops the table but leaves the tombstone trigger functions behind (plpgsql bodies create no dependency).
orphans_after() { # phase-2 rollback name, function-name regex
  { echo "begin;"; cat "$(rollback_file "$1")"; echo "select 'ORPHANS=' || count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname ~ '$2'; rollback;"; } | sql_owner | grep -o 'ORPHANS=[0-9]*'
}
o1="$(orphans_after create_user_outings '^user_outings_tombstone_guard$')"
o2="$(orphans_after create_user_collections_and_items '^(user_collections_(tombstone_guard|purge_items)|user_collection_items_(lock_parent|bump_parent_on_(insert|delete)))$')"
echo "  reverse-order demonstration (rolled back, nothing kept): Phase 2 outings rollback first leaves $o1 ; Phase 2 collections rollback first leaves $o2"
[ "$o1" = "ORPHANS=1" ] && [ "$o2" = "ORPHANS=5" ] || fail "unexpected orphan counts from the reverse-order demonstration ($o1 / $o2)"
[ "$(count_new)" = "14" ] || fail "the rolled-back demonstration changed the object count"
echo "  ok: the tombstone rollbacks must run BEFORE the Phase 2 rollbacks (otherwise their functions are orphaned); the demonstration was rolled back"

# Phase 3B (outing tombstone) rollback: fail closed while a tombstone exists, restore the collection-only Phase 3A catalog exactly, re-apply exactly.
P3B_DOWN="$(rollback_file "$P3B_NAME")"
inventory > "$WORK/inventory.b_before"
sql_admin <<'SQL'
insert into auth.users (id) values ('88888888-8888-4888-8888-888888888881'), ('88888888-8888-4888-8888-888888888882');
insert into public.user_outings (id, user_id, schema_version, payload) values
  ('88000000-0000-4000-8000-000000000001', '88888888-8888-4888-8888-888888888881', 1, '{"name":{"en":"will be tombstoned"},"stopIds":["BLK-0001"],"answers":{}}'),
  ('88000000-0000-4000-8000-000000000002', '88888888-8888-4888-8888-888888888882', 1, '{"name":{"en":"stays live"},"stopIds":["BLK-0002"],"answers":{}}');
update public.user_outings set deleted_at = now() where id = '88000000-0000-4000-8000-000000000001';
SQL
rb_out="$(sql_owner < "$P3B_DOWN" 2>&1)" && fail "the Phase 3B rollback ran although a tombstone exists"
printf '%s\n' "$rb_out" | grep -q 'refusing to roll back outing tombstones: 1 tombstoned outing' || { printf '%s\n' "$rb_out"; fail "the Phase 3B rollback refused for the wrong reason"; }
inventory > "$WORK/inventory.b_refused"
diff -u "$WORK/inventory.b_before" "$WORK/inventory.b_refused" >/dev/null || fail "the refused outing rollback changed the catalog"
[ "$(sql_admin -c "select count(*) from public.user_outings where deleted_at is not null")" = "1" ] || fail "the outing tombstone did not survive the refused rollback"
echo "  ok: the Phase 3B rollback REFUSES while an outing tombstone exists ('refusing to roll back outing tombstones: 1 ...'), changes nothing, and the tombstone survives"
sql_admin -c "delete from auth.users where id = '88888888-8888-4888-8888-888888888881'"
[ "$(sql_admin -c "select count(*) from public.user_outings where deleted_at is not null")" = "0" ] || fail "account deletion left an outing tombstone"
sql_owner < "$P3B_DOWN" >"$WORK/rb3b.out" 2>&1 || { cat "$WORK/rb3b.out"; fail "the Phase 3B rollback failed although no tombstone exists"; }
inventory > "$WORK/inventory.b_down"
diff -u "$WORK/inventory.p3a" "$WORK/inventory.b_down" >"$WORK/inventory.b_down.diff" || { cat "$WORK/inventory.b_down.diff"; fail "the Phase 3B rollback did not restore the collection-only Phase 3A catalog exactly"; }
[ "$(sql_admin -c "select count(*) from public.user_outings where payload -> 'name' ->> 'en' = 'stays live'")" = "1" ] || fail "the outing rollback lost a live outing"
echo "  ok: with no outing tombstone the rollback succeeds and restores the collection-only Phase 3A catalog EXACTLY ($(wc -l < "$WORK/inventory.p3a" | tr -d ' ') rows), keeping live data"
sql_owner < "$P3B_FILE" >"$WORK/reapply3b.out" 2>&1 || { cat "$WORK/reapply3b.out"; fail "re-applying the Phase 3B migration failed"; }
inventory > "$WORK/inventory.b_reapplied"
diff -u "$WORK/inventory.p3b" "$WORK/inventory.b_reapplied" >"$WORK/inventory.b_reapply.diff" || { cat "$WORK/inventory.b_reapply.diff"; fail "up, down, up did not return to the Phase 3B catalog exactly"; }
echo "  ok: outing migration -> rollback -> migration returns to the Phase 3B catalog exactly"
sql_owner < "$P3B_DOWN" >/dev/null || fail "second outing rollback failed"
inventory > "$WORK/inventory.b_down2"
diff -u "$WORK/inventory.p3a" "$WORK/inventory.b_down2" >/dev/null || fail "the second outing rollback did not restore the Phase 3A catalog exactly"
sql_admin -c "delete from auth.users where id = '88888888-8888-4888-8888-888888888882'"
[ "$(count_new)" = "13" ] || fail "expected 5 tables + 8 functions after the outing rollback, got $(count_new)"

# Phase 3A rollback: it must fail closed while a tombstone exists, restore Phase 2 exactly when none does, and re-apply exactly.
P3A_DOWN="$(rollback_file "$P3A_NAME")"
inventory > "$WORK/inventory.before_rb"
sql_admin <<'SQL'
insert into auth.users (id) values ('99999999-9999-4999-8999-999999999991'), ('99999999-9999-4999-8999-999999999992');
insert into public.user_collections (id, user_id, name) values
  ('99000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999991', 'will be tombstoned'),
  ('99000000-0000-4000-8000-000000000002', '99999999-9999-4999-8999-999999999992', 'stays live');
insert into public.user_collection_items (collection_id, user_id, venue_id) values
  ('99000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999991', 'BLK-0001'),
  ('99000000-0000-4000-8000-000000000002', '99999999-9999-4999-8999-999999999992', 'BLK-0002');
update public.user_collections set deleted_at = now() where id = '99000000-0000-4000-8000-000000000001';
SQL
rb_out="$(sql_owner < "$P3A_DOWN" 2>&1)" && fail "the Phase 3A rollback ran although a tombstone exists"
printf '%s\n' "$rb_out" | grep -q 'refusing to roll back collection tombstones: 1 tombstoned collection' \
  || { printf '%s\n' "$rb_out"; fail "the Phase 3A rollback refused for the wrong reason"; }
inventory > "$WORK/inventory.after_refusal"
diff -u "$WORK/inventory.before_rb" "$WORK/inventory.after_refusal" >/dev/null || fail "the refused rollback changed the catalog"
[ "$(sql_admin -c "select count(*) from public.user_collections where deleted_at is not null")" = "1" ] || fail "the tombstone did not survive the refused rollback"
[ "$(count_new)" = "13" ] || fail "the refused rollback changed the object count"
echo "  ok: the Phase 3A rollback REFUSES while a tombstone exists ('refusing to roll back collection tombstones: 1 ...'), changes nothing, and the tombstone survives"
# remove the tombstone's owner (account deletion cascades the tombstone and its user's rows); keep the other user's LIVE collection + item
sql_admin -c "delete from auth.users where id = '99999999-9999-4999-8999-999999999991'"
[ "$(sql_admin -c "select count(*) from public.user_collections where deleted_at is not null")" = "0" ] || fail "account deletion left a tombstone"
sql_owner < "$P3A_DOWN" >"$WORK/rb3a.out" 2>&1 || { cat "$WORK/rb3a.out"; fail "the Phase 3A rollback failed although no tombstone exists"; }
inventory > "$WORK/inventory.after_down"
diff -u "$WORK/inventory.p2" "$WORK/inventory.after_down" >"$WORK/inventory.down.diff" || { cat "$WORK/inventory.down.diff"; fail "the Phase 3A rollback did not restore the Phase 2 catalog exactly"; }
[ "$(sql_admin -c "select count(*) from public.user_collections where name = 'stays live'")" = "1" ] || fail "the rollback lost a live collection"
[ "$(sql_admin -c "select count(*) from public.user_collection_items where venue_id = 'BLK-0002'")" = "1" ] || fail "the rollback lost a live item"
echo "  ok: with no tombstone the rollback succeeds, restores the Phase 2 catalog EXACTLY ($(wc -l < "$WORK/inventory.p2" | tr -d ' ') inventory rows), and keeps live data"
sql_owner < "$P3A_FILE" >"$WORK/reapply3a.out" 2>&1 || { cat "$WORK/reapply3a.out"; fail "re-applying the Phase 3A migration after its rollback failed"; }
inventory > "$WORK/inventory.reapplied"
diff -u "$WORK/inventory.p3a" "$WORK/inventory.reapplied" >"$WORK/inventory.reapply.diff" || { cat "$WORK/inventory.reapply.diff"; fail "up, down, up did not return to the Phase 3A catalog exactly"; }
echo "  ok: migration -> rollback -> migration returns to the Phase 3A catalog exactly"
sql_admin -c "delete from auth.users where id = '99999999-9999-4999-8999-999999999992'"
# Right order: (Phase 3B, already done above), Phase 3A, taste profiles, outings, collections+items, saved venues, function.
# (the Phase 3B outing rollback already ran above, in its own tested step, so the remaining chain starts at Phase 3A)
for pattern in "$P3A_NAME" create_user_taste_profiles create_user_outings create_user_collections_and_items create_user_saved_venues create_set_updated_at_function; do
  sql_owner < "$(rollback_file "$pattern")" >/dev/null || fail "rollback $pattern failed"
done
[ "$(count_new)" = "0" ] || fail "objects remain after the rollbacks"
snapshot > "$WORK/snapshot.rolledback"
diff -u "$WORK/snapshot.before" "$WORK/snapshot.rolledback" >"$WORK/snapshot.rb.diff" || { cat "$WORK/snapshot.rb.diff"; fail "rollback left the catalog different"; }
echo "  ok: the right order removes all 5 tables and the 8 remaining functions (the outing guard was rolled back in its own step); the catalog matches the pre-Phase-2 snapshot"

log "Summary"
echo "  assertions passed: $total_ok, failed: $total_not_ok, files with problems: $problems"
[ "${PROBE_NONATOMIC:-0}" = "0" ] || echo "  note: the failed-migration probe reported a non-atomic CLI behaviour (see above)"
[ "$problems" -eq 0 ] || exit 1
echo "  ALL PHASE 2 LOCAL CHECKS PASSED"
