# Account-sync schema tests (LOCAL ONLY)

pgTAP tests for the Phase 2 account-sync tables (`user_saved_venues`, `user_collections`,
`user_collection_items`, `user_outings`, `user_taste_profiles`) and their helper functions.
Contract: `docs/database/sync-schema.md`.

## How to run

```sh
SUPABASE_CMD="supabase" bash scripts/db/test-sync-schema-local.sh
```

Requires Docker and the Supabase CLI. The script starts a **disposable** Postgres container
(the Supabase image at the production Postgres version), applies **only the five Phase 2
migrations** with the real CLI, and then runs every `*.test.sql` here. It never touches a
hosted project: it connects only to the container it starts and passes `--db-url` (never
`--linked`). See the header of the script for everything it checks.

## Layout

| File | Purpose |
|---|---|
| `_helpers.sql` | Preamble the runner **prepends** to each test: harness guard, pgTAP, role-switching helpers, fixture users. Not a test. |
| `00_semantics.test.sql` | Proves the PostgreSQL / Supabase behaviours the design relies on (default ACLs, `REVOKE ALL` incl. PG17 `MAINTAIN`, trigger firing without EXECUTE, CHECK-function EXECUTE, upsert semantics). |
| `01_privileges_rls_policies.test.sql` | Exact RLS / policy / table / column / function privilege matrix. |
| `10_…` – `40_…` | Per-table behaviour: validation, isolation, immutability, anon, service_role. |
| `21_collection_tombstones.test.sql` | Phase 3A collection tombstones: `deleted_at`, scrub, immutability (`TS002`), privileges, RLS, child purge, the live-parent guard (`TS001`), the parent revision bump, trigger / function posture, account-deletion cascade. |
| `50_updated_at_and_account_deletion.test.sql` | `updated_at` maintenance and account-deletion cascades. |

## Real concurrency (not in this directory)

pgTAP runs inside one transaction, so it cannot show how two clients interact. The two-session lock proofs for
collection tombstones (item INSERT / DELETE / rename vs tombstone, both orderings, with `READ COMMITTED` recorded and
real lock waits verified through `pg_blocking_pids()`) are in `scripts/db/test-collection-tombstone-concurrency-local.sh`.

## Why these are not under `supabase/tests/`

`supabase test db` discovers `supabase/tests/` and can be pointed at a linked project. These
files need the harness preamble and a throwaway database, so they live elsewhere, and the
preamble **refuses to run** unless the runner set the `blaniko.local_test_harness` marker.
Every test runs in one transaction that is rolled back.
