/**
 * linkEarlyBatchImageUrls.ts
 *
 * Safely links the 45 early-batch venue image URLs into public.venues.
 * Targets by external_id ONLY. Reads the durable manifest
 * (scripts/venue-image-source-map-early.json) as source of truth.
 *
 * For each of the 45 READY venues it sets:
 *   image_url        = <base>/venue-images/BLK-XXXX/card.webp
 *   detail_image_url = <base>/venue-images/BLK-XXXX/detail.webp
 *
 * Explicitly excludes: BLK-0020, BLK-0037, BLK-0044, BLK-0045, BLK-0050.
 *
 * Pre-flight validation (aborts rather than partially updating):
 *   - exactly 45 target rows exist
 *   - every target row currently has image_url = NULL and detail_image_url = NULL
 *     (early batch was never linked before; refuse to clobber existing URLs)
 *   - none of the excluded IDs are in the target set
 *
 * Modes:
 *   (default)   DRY — validate + print plan, NO writes
 *   --apply     perform the updates, then re-verify all 45 rows
 *
 * Run from backend/ so dotenv finds backend/.env:
 *   npx tsx scripts/linkEarlyBatchImageUrls.ts            # dry
 *   npx tsx scripts/linkEarlyBatchImageUrls.ts --apply    # only after approval
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { supabase } from "../src/lib/supabase";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.resolve(__dirname, "..", "..", "scripts", "venue-image-source-map-early.json");
const STORAGE_BASE =
  "https://vptjbfoaqmbdjdqwloae.supabase.co/storage/v1/object/public/venue-images";

const NEVER_TARGET = new Set(["BLK-0020", "BLK-0037", "BLK-0044", "BLK-0045", "BLK-0050"]);
const EXPECTED = 45;

const APPLY = process.argv.includes("--apply");

interface ManifestVenue {
  external_id: string;
  status: string;
}

function cardUrl(id: string) {
  return `${STORAGE_BASE}/${id}/card.webp`;
}
function detailUrl(id: string) {
  return `${STORAGE_BASE}/${id}/detail.webp`;
}

async function main() {
  console.log("─".repeat(64));
  console.log(`Blaniko early-batch image URL linker — ${APPLY ? "APPLY" : "DRY (no writes)"}`);
  console.log("─".repeat(64));

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf-8")) as {
    venues: ManifestVenue[];
  };
  const ready = manifest.venues.filter((v) => v.status === "READY");
  const ids = ready.map((v) => v.external_id);

  // Guard: never target excluded IDs; expect exactly 45.
  const illegal = ids.filter((id) => NEVER_TARGET.has(id));
  if (illegal.length) {
    console.error(`ERROR: target set includes excluded IDs: ${illegal.join(", ")}`);
    process.exit(1);
  }
  if (ids.length !== EXPECTED) {
    console.error(`ERROR: expected ${EXPECTED} READY venues, got ${ids.length}.`);
    process.exit(1);
  }
  console.log(`Target venues: ${ids.length} (excludes ${[...NEVER_TARGET].join(", ")})`);

  // Connection + fetch current state.
  const { data: rows, error } = await supabase
    .from("venues")
    .select("external_id, name, image_url, detail_image_url")
    .in("external_id", ids);
  if (error) {
    console.error(`ERROR: fetch failed: ${error.message}`);
    process.exit(1);
  }

  // Validate row count.
  const foundIds = new Set((rows ?? []).map((r) => r.external_id));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length) {
    console.error(`ERROR: ${missing.length} target row(s) not found in DB: ${missing.join(", ")}`);
    process.exit(1);
  }
  if ((rows ?? []).length !== EXPECTED) {
    console.error(`ERROR: expected ${EXPECTED} rows, got ${(rows ?? []).length}.`);
    process.exit(1);
  }

  // Validate current URL state — must be NULL (refuse to clobber).
  const alreadySet = (rows ?? []).filter((r) => r.image_url || r.detail_image_url);
  if (alreadySet.length) {
    console.error(`ERROR: ${alreadySet.length} row(s) already have an image URL. Refusing to overwrite:`);
    alreadySet.forEach((r) => console.error(`  ✗ ${r.external_id}  image_url=${r.image_url ?? "null"}  detail_image_url=${r.detail_image_url ?? "null"}`));
    process.exit(1);
  }
  console.log(`✓ Pre-flight OK: all ${EXPECTED} rows exist and have NULL image_url / detail_image_url.`);

  if (!APPLY) {
    console.log("\n[DRY] Would set, for each target (samples):");
    for (const id of ids.slice(0, 3)) {
      console.log(`  ${id}`);
      console.log(`     image_url        = ${cardUrl(id)}`);
      console.log(`     detail_image_url = ${detailUrl(id)}`);
    }
    console.log(`  … (${ids.length} venues total)`);
    console.log("\n✓ DRY complete. No writes performed. Re-run with --apply after approval.");
    return;
  }

  // Apply: update each row by external_id.
  console.log(`\nApplying ${ids.length} updates…`);
  let updated = 0;
  for (const id of ids) {
    const { error: upErr } = await supabase
      .from("venues")
      .update({ image_url: cardUrl(id), detail_image_url: detailUrl(id) })
      .eq("external_id", id);
    if (upErr) {
      console.error(`  ✗ ${id}: update failed: ${upErr.message}`);
      console.error("  Aborting (partial update may have occurred — investigate).");
      process.exit(1);
    }
    updated++;
  }
  console.log(`✓ Updated ${updated} rows.`);

  // Re-verify.
  const { data: post } = await supabase
    .from("venues")
    .select("external_id, image_url, detail_image_url")
    .in("external_id", ids);
  const bad = (post ?? []).filter(
    (r) => r.image_url !== cardUrl(r.external_id) || r.detail_image_url !== detailUrl(r.external_id)
  );
  if (bad.length) {
    console.error(`✗ VERIFY FAILED: ${bad.length} row(s) not linked correctly.`);
    process.exit(1);
  }
  console.log("✓ VERIFY OK: all 45 venues linked to card.webp + detail.webp.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
