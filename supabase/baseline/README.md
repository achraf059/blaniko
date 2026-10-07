# Pre-Phase-2 production baseline

> **BLANIKO BASELINE — REFERENCE / LOCAL BOOTSTRAP ONLY. DO NOT APPLY TO PRODUCTION.**
> This is **not** a migration. It must **never** be moved under `supabase/migrations/`, and it has no
> automatic production application path.

| | |
|---|---|
| What | The **pre-Phase-2** state of the Blaniko production database, for regression comparison |
| Supabase project ref | `vptjbfoaqmbdjdqwloae` (Postgres 17.6.1.111) |
| Captured | 2026-10-07 |
| Production migrations at capture | **15** (all match `supabase/migrations/` 1:1) |
| Latest production migration | `20260818000001` (`create_venue_images_storage_bucket`) |

## Why this exists

`public.venues` has **no `CREATE TABLE` migration** (migration `20260629000000` already `ALTER`s it), so the
migration chain cannot rebuild the database from zero. The capture also found live objects that no migration
defines: the `public.rls_auto_enable()` function with its `ensure_rls` event trigger, and production's narrower
default privileges for new `public` objects. A baseline outside `supabase/migrations/` gives a **clear before-state**
so the Phase 2 account-sync migrations can be proven not to alter anything that already exists, without rewriting
the 15 applied migrations and without inserting a fake historical migration.

## Files

| File | What it is |
|---|---|
| `public_schema_20261007.sql` | **A. Public schema:** default privileges, tables, constraints, indexes, RLS, policies, table grants, `handle_new_user()` and `rls_auto_enable()`, and the `ensure_rls` event trigger. |
| `auth_integration_20261007.sql` | **B. Auth hook:** only the `on_auth_user_created` trigger on `auth.users` that calls `public.handle_new_user()`. |
| `storage_metadata_20261007.sql` | **C. Storage:** the `venue-images` bucket configuration row only. |
| `verify_baseline.sql` | **D. Verification:** 20 catalog-only `SELECT` statements. **READ ONLY / SAFE FOR PRODUCTION CATALOG VERIFICATION.** |
| `catalog_snapshot_20261007.txt` | The recorded **live** output of `verify_baseline.sql` before Phase 2 (metadata only). |

## How each artifact was captured

Everything was read through `supabase db query --linked` (the Management API). Stated precisely:

* **All SQL submitted to production was `SELECT`-only.** The baseline capture queries (the 20 inventory statements and
  the structured queries used to generate the SQL artifacts) each ran as a single statement inside a `READ ONLY`
  transaction (`transaction_read_only` was confirmed `on`), behind a statement guard that refused anything but one
  `SELECT`/`WITH`. One early identity probe (a single `SELECT` returning the database name, the connected role and the
  count of applied migrations) ran *before* that read-only wrapper existed; it too was a plain `SELECT`.
* **No production `DDL` or `DML` was run, and no migration was applied.** No `db push`, no `db dump`.
* **Credentials:** none were manually created, requested or read, and none are printed or stored here. The CLI used its
  own existing login.
* **Platform-side effect (not claimed to be zero):** when the CLI opened linked database access it printed
  `Initialising login role...`. That is the CLI's own managed login-role initialization. It was not requested by us and
  we did not run or inspect the underlying call, so we do not claim that production saw no platform-side connection
  effect from it.
* The **public schema** file is **generated from the live catalogs** (`pg_attribute`, `pg_constraint`, `pg_indexes`,
  `pg_policies`, `pg_class` ACLs via `aclexplode`, `pg_get_functiondef`, `pg_default_acl`, ...), not from `pg_dump`:
  `supabase db dump --linked` needs a database login or password that the capture deliberately did not use. Its fidelity
  is proven by the regression comparison below: 14 compared inventory sections match production exactly.
* The **auth integration** file comes from `pg_get_triggerdef()` of the one non-internal trigger on `auth.users` that
  calls `public.handle_new_user()`.
* The **storage metadata** file comes from `storage.buckets` (configuration columns only).
* The **catalog snapshot** is `verify_baseline.sql` run against production, in a deterministic, sorted, diffable form.

## What is excluded

No table rows (no `waitlist_emails`, `venue_claims`, `venues`, `profiles` or `user_favorites` data), no `auth.users` rows
and no `auth` schema, no `storage.objects` rows or file contents, no signed or public URLs, no owner ids, no role
passwords, no access tokens or keys, and no migration statement bodies (only the version and name of each applied
migration). The artifacts were scanned for email-like strings, keys, passwords, URLs, UUID literals and machine paths;
none are present.

## Safety guards inside the files

Each SQL file starts with `BLANIKO BASELINE — REFERENCE / LOCAL BOOTSTRAP ONLY / DO NOT APPLY TO PRODUCTION` and refuses
to run against a populated database (`public.venues` exists; `auth.users` has the trigger or rows; `storage.objects` has
rows). The tables are created without `IF NOT EXISTS`, so a second load fails too.

## Live objects and settings discovered (not in the historical source migration chain)

The 15 source migrations do not define the following, but production contains them. They are part of the pre-Phase-2
baseline (see `public_schema_20261007.sql` and sections 12-16 of `catalog_snapshot_20261007.txt`). **No historical
migration is added for them** in this work.

* **`public.rls_auto_enable()`**: an event-trigger function (`SECURITY DEFINER`, `search_path=pg_catalog`, owner
  `postgres`) that runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on every table created in `public`.
* **The `ensure_rls` event trigger**: `ddl_command_end` for `CREATE TABLE`, `CREATE TABLE AS` and `SELECT INTO`,
  executing `public.rls_auto_enable()`; owner `postgres`, enabled.
* **Production default ACLs** (`pg_default_acl`) for objects that role `postgres` creates in schema `public`:
  * tables: `anon`, `authenticated` and `service_role` inherit only `TRUNCATE`, `REFERENCES`, `TRIGGER` and `MAINTAIN`
    (no `SELECT`/`INSERT`/`UPDATE`/`DELETE`); `postgres` has everything;
  * sequences: `anon`, `authenticated` and `service_role` inherit `UPDATE`; `postgres` has `SELECT`, `UPDATE`, `USAGE`;
  * functions: only `postgres` has an explicit `EXECUTE` entry.
  This is narrower than a stock Supabase image's, which grants those roles full privileges on new tables.
* The five existing tables hold those inherited structural privileges for `anon` and `authenticated`; `anon` has no
  `INSERT` on `waitlist_emails` or `venue_claims`.
* `public.handle_new_user()` has the default (NULL) ACL, so it is executable through `PUBLIC`.

## Regression comparison

```sh
SUPABASE_CMD="supabase" bash scripts/db/regress-phase2-against-baseline-local.sh
```

It starts a disposable container, loads the baseline, runs `verify_baseline.sql`, **compares it section by section with
`catalog_snapshot_20261007.txt`**, applies only the five Phase 2 migrations with the real CLI, runs the inventory again,
and proves every pre-existing row is unchanged and that every added row belongs to a Phase 2 object. It only ever
connects to the container it starts. Recorded result (2026-10-07): the reconstruction matches production in every
compared section, and Phase 2 added 305 inventory rows, all Phase 2 objects, and changed none.

A **local disposable environment** may use the baseline the same way: apply `public_schema_*.sql`, then
`auth_integration_*.sql`, as `supabase_admin` (the guard and the event trigger need a superuser), into a database that
already has the Supabase roles and `auth` schema; then run the Phase 2 migrations.

## Limitations (reported, not faked)

* **Storage:** the bare Postgres image has an empty `storage` schema (the Storage service creates its tables), so
  `storage_metadata_*.sql` cannot be loaded and sections 18 and 19 cannot be compared locally. The bucket is recorded
  from production: public, no size limit, no MIME restriction, AVIF autodetect off, type `STANDARD`; `storage.objects`
  has RLS enabled and no policies.
* **Event trigger owner:** production's `ensure_rls` is owned by `postgres`; PostgreSQL requires a superuser-owned event
  trigger to call a superuser-owned function, so a local load owns the trigger by the loading superuser (the function
  stays owned by `postgres`). Compared sections ignore the owner field.
* **Skipped as platform-managed:** the migration history table, extensions and their versions, roles, and the `auth` /
  `storage` schema ACLs. The managed event triggers are not recreated.
* **`handle_new_user()` ACL:** live is the default ACL; a local load applies the local defaults. The effective `EXECUTE`
  privileges (section 13) match exactly.
* The default-privilege statements reproduce the `postgres` / `public` rows only.

## SYNC-GATE-1 is independent

This baseline concerns **schema regression only**. **SYNC-GATE-1** (see `docs/database/sync-schema.md`) still applies:
no mobile or web cloud sync may ship until deletion propagation for collections and outings has a resolved and
tested strategy.
