/**
 * deleteSelectedVenues.ts
 *
 * Safe, selective venue deletion tool for Blaniko.
 * Accepts an explicit list of external_ids to delete.
 * Never deletes by broad conditions — only by exact ID match.
 *
 * Usage:
 *   Dry run (prints what would be deleted, no writes):
 *     tsx scripts/deleteSelectedVenues.ts --dry-run --ids BLK-0018,BLK-0037
 *
 *   Real deletion (requires explicit --confirm-delete flag):
 *     tsx scripts/deleteSelectedVenues.ts --confirm-delete --ids BLK-0018,BLK-0037
 *
 * Run from the backend/ directory so dotenv finds backend/.env
 */

import "dotenv/config";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// ─── Parse args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CONFIRM_DELETE = args.includes("--confirm-delete");

if (!DRY_RUN && !CONFIRM_DELETE) {
  console.error(
    "ERROR: You must pass either --dry-run or --confirm-delete.\n" +
    "  Dry run:  tsx scripts/deleteSelectedVenues.ts --dry-run --ids BLK-0018,BLK-0037\n" +
    "  Real del: tsx scripts/deleteSelectedVenues.ts --confirm-delete --ids BLK-0018,BLK-0037"
  );
  process.exit(1);
}

if (DRY_RUN && CONFIRM_DELETE) {
  console.error("ERROR: Cannot pass both --dry-run and --confirm-delete.");
  process.exit(1);
}

// ─── Parse --ids ──────────────────────────────────────────────────────────────

const idsArg = args.find((a) => a.startsWith("--ids=")) ?? args[args.indexOf("--ids") + 1];

if (!idsArg || idsArg.startsWith("--")) {
  console.error(
    "ERROR: You must pass --ids with a comma-separated list of external_ids.\n" +
    "  Example: --ids BLK-0018,BLK-0037"
  );
  process.exit(1);
}

// Accept both --ids=BLK-0018,BLK-0037 and --ids BLK-0018,BLK-0037
const rawIds = idsArg.startsWith("--ids=") ? idsArg.slice(6) : idsArg;
const targetIds: string[] = rawIds
  .split(",")
  .map((id) => id.trim().toUpperCase())
  .filter(Boolean);

if (targetIds.length === 0) {
  console.error("ERROR: --ids list is empty.");
  process.exit(1);
}

// ─── Validate external_id format ─────────────────────────────────────────────

const validIdPattern = /^BLK-\d{4}$/;
const invalidIds = targetIds.filter((id) => !validIdPattern.test(id));
if (invalidIds.length > 0) {
  console.error(
    `ERROR: The following IDs do not match the expected format BLK-XXXX:\n  ${invalidIds.join(", ")}`
  );
  process.exit(1);
}

// ─── Backup path ─────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backupsDir = join(__dirname, "../backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupPath = join(backupsDir, `deleted-venues-${timestamp}.json`);

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("─".repeat(60));
  console.log(`Blaniko — venue deletion tool`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE DELETION"}`);
  console.log(`Target IDs: ${targetIds.join(", ")}`);
  console.log("─".repeat(60));

  // 1. Connection check
  console.log("\n[1/4] Checking Supabase connection…");
  const { error: pingError } = await supabase.from("venues").select("id").limit(1);
  if (pingError) {
    console.error("  ✗ Connection failed:", pingError.message);
    process.exit(1);
  }
  console.log("  ✓ Connected");

  // 2. Fetch matching rows (both active and inactive — we want full picture)
  console.log("\n[2/4] Fetching target venues…");
  const { data: rows, error: fetchError } = await supabase
    .from("venues")
    .select("*")
    .in("external_id", targetIds);

  if (fetchError || !rows) {
    console.error("  ✗ Fetch failed:", fetchError?.message ?? "no data");
    process.exit(1);
  }

  // Identify which IDs were not found
  const foundIds = rows.map((r) => String(r.external_id));
  const notFound = targetIds.filter((id) => !foundIds.includes(id));

  if (notFound.length > 0) {
    console.warn(`  ⚠  Not found in DB (will be skipped): ${notFound.join(", ")}`);
  }

  if (rows.length === 0) {
    console.log("\n✓ No matching venues found. Nothing to delete.");
    return;
  }

  // 3. Print planned deletions
  console.log(`\n[3/4] Venues that will be permanently deleted (${rows.length} row${rows.length !== 1 ? "s" : ""}):`);
  console.log("─".repeat(60));
  for (const row of rows) {
    console.log(`  ${row.external_id}  ${String(row.name).padEnd(40)}  active=${row.is_active}`);
    console.log(`         neighborhood: ${row.neighborhood ?? "null"}  subcategory: ${row.subcategory ?? "null"}`);
    console.log(`         short_desc:   ${String(row.short_description ?? "").slice(0, 80)}`);
    console.log();
  }
  console.log("─".repeat(60));

  if (DRY_RUN) {
    console.log(`\nDRY RUN complete. ${rows.length} row(s) would be permanently deleted.`);
    console.log("Re-run with --confirm-delete to apply.\n");
    return;
  }

  // 4. Backup before deletion
  console.log("\n[4/4] Creating backup before deletion…");
  const backup = {
    deletedAt: new Date().toISOString(),
    mode: "LIVE_DELETION",
    targetIds,
    rows,
  };

  try {
    writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf-8");
    console.log(`  ✓ Backup written: ${backupPath}`);
  } catch (err) {
    console.error("  ✗ Failed to write backup:", (err as Error).message);
    console.error("  Aborting — no deletion performed.");
    process.exit(1);
  }

  // 5. Delete
  console.log("\n[5/4] Deleting venues…");
  const { error: deleteError } = await supabase
    .from("venues")
    .delete()
    .in("external_id", targetIds);

  if (deleteError) {
    console.error("  ✗ Deletion failed:", deleteError.message);
    console.error(`  Backup is preserved at: ${backupPath}`);
    process.exit(1);
  }

  console.log(`  ✓ Deleted ${rows.length} row(s) from Supabase`);

  // 6. Verify
  console.log("\n─── Verification ─────────────────────────────────────────");
  const { count: totalActive } = await supabase
    .from("venues")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: totalAll } = await supabase
    .from("venues")
    .select("*", { count: "exact", head: true });

  console.log(`  Total active venues remaining: ${totalActive ?? "?"}`);
  console.log(`  Total venues (all) remaining:  ${totalAll ?? "?"}`);

  // Confirm deletion
  const { data: check } = await supabase
    .from("venues")
    .select("external_id")
    .in("external_id", targetIds);

  if (check && check.length > 0) {
    console.warn(`  ⚠  These IDs still exist (deletion may have failed): ${check.map((r) => r.external_id).join(", ")}`);
  } else {
    console.log(`  ✓ Confirmed: all target IDs are gone from Supabase`);
  }

  console.log(`\n  Backup file: ${backupPath}`);
  console.log("─".repeat(60));
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
