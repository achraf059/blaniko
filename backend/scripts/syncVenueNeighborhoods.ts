/**
 * syncVenueNeighborhoods.ts — Phase 2 of the Blaniko venue-area migration.
 *
 * Synchronizes the canonical 96 `neighborhood` values from the approved migration
 * input (scripts/venue-quartier-map-v3.json) into the production Supabase `venues`
 * table. This is a SURGICAL, single-column sync — the ONLY column it ever writes is
 * `neighborhood`, matched by `external_id`.
 *
 *   DRY RUN (default):   tsx backend/scripts/syncVenueNeighborhoods.ts
 *   APPLY:               tsx backend/scripts/syncVenueNeighborhoods.ts --apply
 *
 * Hard safety guarantees (by construction):
 *   - never calls replace_venues_v3 or any RPC
 *   - never inserts / deletes / upserts
 *   - never sends a full venue object — only { neighborhood } patches
 *   - refuses to touch retired/reserved IDs (BLK-0020, BLK-0037, BLK-0044, BLK-0045)
 *   - refuses to overwrite a non-null neighborhood that differs (CONFLICT → STOP)
 *   - asserts exactly one row is affected per update
 *   - re-reads and diffs all protected fields after write (only neighborhood may change)
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ─── Constants ──────────────────────────────────────────────────────────────

const EXPECTED_COUNT = 96;
// Retired (BLK-0020, BLK-0044, BLK-0045) + reserved gap (BLK-0037). Must never be updated.
const FORBIDDEN_IDS = new Set(["BLK-0020", "BLK-0037", "BLK-0044", "BLK-0045"]);

// Protected fields — snapshotted before write and proven unchanged afterward.
// `neighborhood` is intentionally NOT in this list (it is the one allowed change).
const PROTECTED_FIELDS = [
  "external_id",
  "name",
  "slug",
  "location_text",
  "address",
  "lat",
  "lng",
  "category",
  "subcategory",
  "image_url",
  "detail_image_url",
  "price",
  "price_details",
  "price_level",
  "is_active",
] as const;

const SELECT_COLUMNS = [...PROTECTED_FIELDS, "id", "neighborhood"].join(", ");

const CRITICAL_IDS = [
  "BLK-0001", "BLK-0003", "BLK-0046", "BLK-0049", "BLK-0050",
  "BLK-0051", "BLK-0052", "BLK-0053", "BLK-0056", "BLK-0060", "BLK-0069",
  "BLK-0080", "BLK-0100",
];

// Expected area values for the critical IDs (independent post-write assertion).
const CRITICAL_EXPECTED: Record<string, string> = {
  "BLK-0046": "Zenata",
  "BLK-0049": "Sbata",
  "BLK-0050": "Almaz",
  "BLK-0051": "Oasis",
  "BLK-0052": "Oued Hassar",
  "BLK-0053": "Aïn Diab",
  "BLK-0056": "Aïn Diab",
  "BLK-0060": "Aïn Diab",
  "BLK-0069": "Aïn Diab",
  "BLK-0080": "Aïn Diab",
  "BLK-0100": "Maârif",
};

const DRY_RUN = !process.argv.includes("--apply");

// ─── Types ──────────────────────────────────────────────────────────────────

type VenueRow = Record<string, unknown> & {
  id: number;
  external_id: string;
  name: string;
  neighborhood: string | null;
};

type MappingEntry = { external_id: string; name: string; quartier: string };

// ─── Helpers ────────────────────────────────────────────────────────────────

function die(msg: string): never {
  console.error(`\n✗ STOP: ${msg}`);
  process.exit(1);
}

/** Conservative identity normalization: unicode NFC, collapse whitespace, casefold. */
function normName(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}

function normNeighborhood(s: string | null): string {
  return (s ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function loadMapping(): MappingEntry[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const mapPath = path.resolve(here, "../../scripts/venue-quartier-map-v3.json");
  const raw = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const venues = raw.venues as MappingEntry[];
  if (!Array.isArray(venues)) die("mapping file has no `venues` array");

  // Structural validation.
  if (venues.length !== EXPECTED_COUNT)
    die(`mapping has ${venues.length} entries, expected ${EXPECTED_COUNT}`);
  const ids = new Set<string>();
  for (const v of venues) {
    if (!v.external_id || !/^BLK-\d{4}$/.test(v.external_id))
      die(`invalid external_id in mapping: ${JSON.stringify(v.external_id)}`);
    if (FORBIDDEN_IDS.has(v.external_id))
      die(`mapping contains forbidden retired/reserved ID: ${v.external_id}`);
    if (ids.has(v.external_id)) die(`duplicate external_id in mapping: ${v.external_id}`);
    ids.add(v.external_id);
    if (!v.quartier || !v.quartier.trim()) die(`blank quartier for ${v.external_id}`);
    if (!v.name || !v.name.trim()) die(`blank name for ${v.external_id}`);
  }
  return venues;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey)
    die("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in backend/.env");
  // Never log the URL or key.
  const supabase = createClient(supabaseUrl!, supabaseKey!, {
    auth: { persistSession: false },
  });

  console.log("─".repeat(64));
  console.log("Blaniko — Phase 2: sync venue neighborhoods (single column)");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "APPLY (production write)"}`);
  console.log("─".repeat(64));

  // ── Step 2: validate migration input ──
  const mapping = loadMapping();
  const mapById = new Map(mapping.map((m) => [m.external_id, m]));
  console.log(`\n[input] mapping validated: ${mapping.length} entries, unique IDs, no forbidden IDs, no blanks.`);

  // ── Step 1: read production (read-only) ──
  console.log("\n[db] fetching all venue rows…");
  const { data: allRows, error: fetchErr } = await supabase
    .from("venues")
    .select(SELECT_COLUMNS)
    .order("external_id", { ascending: true });
  if (fetchErr || !allRows) die(`fetch failed: ${fetchErr?.message ?? "no data"}`);

  const rows = allRows as unknown as VenueRow[];
  const activeRows = rows.filter((r) => r.is_active === true);
  const allIds = new Set(rows.map((r) => r.external_id));

  // Retired / reserved must be entirely absent.
  const presentForbidden = [...FORBIDDEN_IDS].filter((id) => allIds.has(id));
  console.log(`  total rows: ${rows.length} | active rows: ${activeRows.length}`);
  console.log(`  forbidden IDs present (BLK-0020/0037/0044/0045): ${presentForbidden.length ? presentForbidden.join(", ") : "none"} ✓`);
  if (presentForbidden.length)
    die(`retired/reserved IDs exist in production: ${presentForbidden.join(", ")}`);
  if (activeRows.length !== EXPECTED_COUNT)
    die(`production has ${activeRows.length} active venues, expected ${EXPECTED_COUNT}`);

  const prodById = new Map(activeRows.map((r) => [r.external_id, r]));
  const uniqueActive = new Set(activeRows.map((r) => r.external_id));
  if (uniqueActive.size !== EXPECTED_COUNT)
    die(`production active external_ids not unique: ${uniqueActive.size}`);

  // ── Step 2 (cont.): ID-set comparison ──
  const missingInMapping = [...uniqueActive].filter((id) => !mapById.has(id));
  const unexpectedInMapping = mapping.map((m) => m.external_id).filter((id) => !uniqueActive.has(id));
  console.log(`\n[idset] missing_in_mapping: ${missingInMapping.length} | unexpected_in_mapping: ${unexpectedInMapping.length}`);
  if (missingInMapping.length) die(`IDs in production but not mapping: ${missingInMapping.join(", ")}`);
  if (unexpectedInMapping.length) die(`IDs in mapping but not production: ${unexpectedInMapping.join(", ")}`);

  // ── Step 3: identity verification (external_id + name) ──
  const identityMismatches: string[] = [];
  for (const m of mapping) {
    const row = prodById.get(m.external_id)!;
    if (normName(m.name) !== normName(row.name))
      identityMismatches.push(`${m.external_id}: mapping=${JSON.stringify(m.name)} db=${JSON.stringify(row.name)}`);
  }
  console.log(`[identity] matches: ${mapping.length - identityMismatches.length}/${mapping.length} | mismatches: ${identityMismatches.length}`);
  if (identityMismatches.length) {
    identityMismatches.forEach((x) => console.error("   ✗ " + x));
    die("identity mismatch — refusing to write");
  }

  // ── Current neighborhood state ──
  const nullCount = activeRows.filter((r) => !normNeighborhood(r.neighborhood)).length;
  const nonNullCount = activeRows.length - nullCount;
  const uniqueCurrent = [...new Set(activeRows.map((r) => normNeighborhood(r.neighborhood)).filter(Boolean))].sort();
  console.log(`\n[state] neighborhood NULL/blank: ${nullCount} | non-null: ${nonNullCount}`);
  console.log(`[state] unique current non-null values (${uniqueCurrent.length}): ${uniqueCurrent.length ? uniqueCurrent.join(", ") : "—"}`);

  // ── Step 5/6: classify UNCHANGED / WILL_UPDATE / CONFLICT ──
  const unchanged: string[] = [];
  const willUpdate: { id: number; external_id: string; from: string | null; to: string }[] = [];
  const conflicts: { external_id: string; current: string; approved: string }[] = [];

  for (const m of mapping) {
    const row = prodById.get(m.external_id)!;
    const current = normNeighborhood(row.neighborhood);
    const approved = normNeighborhood(m.quartier);
    if (current === approved) {
      unchanged.push(m.external_id);
    } else if (current === "") {
      willUpdate.push({ id: row.id, external_id: m.external_id, from: row.neighborhood, to: approved });
    } else {
      conflicts.push({ external_id: m.external_id, current, approved });
    }
  }

  console.log(`\n[classify] UNCHANGED: ${unchanged.length} | WILL_UPDATE: ${willUpdate.length} | CONFLICT: ${conflicts.length}`);

  // Concise sample including all critical IDs.
  console.log("\n[sample] critical IDs (external_id | name | current → approved | class):");
  for (const id of CRITICAL_IDS) {
    const m = mapById.get(id)!;
    const row = prodById.get(id)!;
    const current = normNeighborhood(row.neighborhood);
    const approved = normNeighborhood(m.quartier);
    const cls = current === approved ? "UNCHANGED" : current === "" ? "WILL_UPDATE" : "CONFLICT";
    console.log(`   ${id}  ${String(row.name).slice(0, 30).padEnd(30)}  ${(current || "—").padEnd(16)} → ${approved.padEnd(16)}  ${cls}`);
  }

  if (conflicts.length) {
    console.error(`\n✗ ${conflicts.length} CONFLICT(s) — existing non-null neighborhood differs from approved value:`);
    conflicts.forEach((c) => console.error(`   ${c.external_id}: current=${JSON.stringify(c.current)} approved=${JSON.stringify(c.approved)}`));
    die("conflicts present — will NOT overwrite. Report to Achraf.");
  }

  // ── Dry run stops here ──
  if (DRY_RUN) {
    console.log(`\n✓ DRY RUN complete. ${willUpdate.length} rows would be updated, ${unchanged.length} already correct.`);
    console.log("Re-run with --apply to write.");
    return;
  }

  // ── Step 4: snapshot protected fields before write (gitignored) ──
  const backupsDir = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../backups");
  fs.mkdirSync(backupsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotPath = path.join(backupsDir, `venues-neighborhood-pre-sync-${ts}.json`);
  const snapshot = activeRows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const f of [...PROTECTED_FIELDS, "neighborhood"]) o[f] = r[f];
    return o;
  });
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  const preById = new Map(activeRows.map((r) => [r.external_id, r]));
  console.log(`\n[snapshot] wrote pre-sync snapshot: ${snapshotPath}`);

  if (willUpdate.length === 0) {
    console.log("\n✓ Nothing to apply — all 96 neighborhoods already correct.");
    return;
  }

  // ── Step 7: apply, one row at a time, asserting exactly one affected ──
  console.log(`\n[apply] updating ${willUpdate.length} rows (neighborhood only)…`);
  let ok = 0;
  for (const u of willUpdate) {
    if (FORBIDDEN_IDS.has(u.external_id)) die(`refusing forbidden ID at write time: ${u.external_id}`);
    const { data: affected, error } = await supabase
      .from("venues")
      .update({ neighborhood: u.to }) // ONLY neighborhood
      .eq("external_id", u.external_id)
      .eq("is_active", true)
      .select("external_id");
    if (error) die(`update failed for ${u.external_id}: ${error.message}`);
    if (!affected || affected.length !== 1)
      die(`update for ${u.external_id} affected ${affected?.length ?? 0} rows (expected exactly 1)`);
    ok++;
  }
  console.log(`  ✓ applied ${ok}/${willUpdate.length} updates`);

  // ── Step 8: independent post-write verification ──
  console.log("\n[verify] re-reading all rows…");
  const { data: postRowsRaw, error: postErr } = await supabase
    .from("venues")
    .select(SELECT_COLUMNS)
    .order("external_id", { ascending: true });
  if (postErr || !postRowsRaw) die(`post-read failed: ${postErr?.message ?? "no data"}`);
  const postActive = (postRowsRaw as unknown as VenueRow[]).filter((r) => r.is_active === true);
  if (postActive.length !== EXPECTED_COUNT) die(`post-sync active count = ${postActive.length}`);
  const postById = new Map(postActive.map((r) => [r.external_id, r]));

  let nullAfter = 0, mismatchAfter = 0;
  for (const m of mapping) {
    const row = postById.get(m.external_id)!;
    if (!normNeighborhood(row.neighborhood)) nullAfter++;
    else if (normNeighborhood(row.neighborhood) !== normNeighborhood(m.quartier)) mismatchAfter++;
  }
  console.log(`  neighborhood null after: ${nullAfter} | mismatches vs mapping: ${mismatchAfter}`);
  if (nullAfter || mismatchAfter) die("post-sync verification failed");

  // Critical ID explicit checks.
  let criticalBad = 0;
  for (const [id, expected] of Object.entries(CRITICAL_EXPECTED)) {
    const got = normNeighborhood(postById.get(id)!.neighborhood);
    const good = got === normNeighborhood(expected);
    if (!good) criticalBad++;
    console.log(`   ${id} → ${got}${good ? " ✓" : ` ✗ (expected ${expected})`}`);
  }
  if (criticalBad) die(`${criticalBad} critical ID area mismatches`);

  // ── Step 9: protected-field diff (only neighborhood may change) ──
  const protectedDiffs: string[] = [];
  for (const m of mapping) {
    const before = preById.get(m.external_id)!;
    const after = postById.get(m.external_id)!;
    for (const f of PROTECTED_FIELDS) {
      if (JSON.stringify(before[f]) !== JSON.stringify(after[f]))
        protectedDiffs.push(`${m.external_id}.${f}: ${JSON.stringify(before[f])} → ${JSON.stringify(after[f])}`);
    }
  }
  console.log(`\n[protected-diff] changed protected fields: ${protectedDiffs.length}`);
  if (protectedDiffs.length) {
    protectedDiffs.forEach((d) => console.error("   ✗ " + d));
    die("protected field changed — investigate immediately (NO auto-repair)");
  }

  console.log(`\n✓ APPLY complete: ${ok} updated, ${unchanged.length} already correct, all protected fields unchanged.`);
  console.log(`  snapshot: ${snapshotPath}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
