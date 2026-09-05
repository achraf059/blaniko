/**
 * upload-early-batch-images.mjs
 *
 * Durable, collision-safe uploader for the EARLY batch (BLK-0001..BLK-0049) venue
 * images. Models the proven BLK-0050..BLK-0100 workflow: Supabase Storage CLI,
 * exact-key collision checking, NEVER overwrite/delete, dry-run first.
 *
 * Targets ONLY the 46 READY venues from scripts/venue-image-source-map-early.json.
 * Never targets: BLK-0020, BLK-0037, BLK-0045, BLK-0050.
 *
 * Object layout (public bucket `venue-images`):
 *   venue-images/BLK-XXXX/card.webp    → venues.image_url
 *   venue-images/BLK-XXXX/detail.webp  → venues.detail_image_url
 *
 * Modes (MODE env var, default "dry"):
 *   MODE=dry     Local validation + read-only remote collision check. No writes.
 *   MODE=upload  Upload only NON-existing keys (aborts if ANY target already exists).
 *   MODE=verify  Read-only: confirm both keys exist for all 46 venues.
 *
 * Usage:
 *   node scripts/upload-early-batch-images.mjs               # dry (default)
 *   MODE=verify node scripts/upload-early-batch-images.mjs
 *   MODE=upload node scripts/upload-early-batch-images.mjs   # only after approval
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const MANIFEST = join(REPO_ROOT, "scripts", "venue-image-source-map-early.json");
const BUCKET = "venue-images";
const CONTENT_TYPE = "image/webp";
const MODE = (process.env.MODE || "dry").toLowerCase();

const EXPECTED_VENUES = 46;
const EXPECTED_FILES = 92;
const NEVER_TARGET = new Set(["BLK-0020", "BLK-0037", "BLK-0045", "BLK-0050"]);

if (!["dry", "upload", "verify"].includes(MODE)) {
  console.error(`ERROR: invalid MODE='${MODE}'. Use dry | upload | verify.`);
  process.exit(1);
}

function sb(args) {
  // Runs `supabase storage ...` with --linked --experimental, returns stdout.
  return execFileSync("supabase", [...args, "--linked", "--experimental"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// Normalize `supabase storage ls` text output → set of object basenames (.webp only).
function listRemote(prefix) {
  let out = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      out = sb(["storage", "ls", `ss:///${BUCKET}/${prefix}`]);
      break;
    } catch (e) {
      if (attempt === 3) throw e;
    }
  }
  return new Set(
    out
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[\w.-]+\.webp$/.test(l))
  );
}

// ── Build target list from the manifest (source of truth) ───────────────────
const manifest = JSON.parse(readFileSync(MANIFEST, "utf-8"));
const ready = manifest.venues.filter((v) => v.status === "READY");

const targets = [];
for (const v of ready) {
  if (NEVER_TARGET.has(v.external_id)) {
    console.error(`ERROR: ${v.external_id} is in the never-target set but marked READY. Aborting.`);
    process.exit(1);
  }
  for (const role of ["card", "detail"]) {
    targets.push({
      id: v.external_id,
      role,
      local: join(REPO_ROOT, "venue-images", v.external_id, `${role}.webp`),
      key: `${v.external_id}/${role}.webp`,
    });
  }
}

console.log("─".repeat(66));
console.log(`Blaniko early-batch image uploader — MODE=${MODE}`);
console.log(`Bucket: ${BUCKET}  |  venues: ${ready.length}  |  files: ${targets.length}`);
console.log("─".repeat(66));

// ── 1. Local validation ─────────────────────────────────────────────────────
if (ready.length !== EXPECTED_VENUES || targets.length !== EXPECTED_FILES) {
  console.error(`ERROR: expected ${EXPECTED_VENUES} venues / ${EXPECTED_FILES} files, got ${ready.length} / ${targets.length}.`);
  process.exit(1);
}
const missingLocal = targets.filter((t) => !existsSync(t.local));
if (missingLocal.length) {
  console.error(`ERROR: ${missingLocal.length} local file(s) missing:`);
  missingLocal.forEach((t) => console.error(`  ✗ ${t.local}`));
  process.exit(1);
}
console.log(`[1] Local validation OK: ${targets.length} files present (card.webp + detail.webp per venue).`);

// ── 2. Remote state (collision check) ───────────────────────────────────────
console.log(`[2] Checking remote state for ${ready.length} venue prefixes…`);
const existing = [];
for (const v of ready) {
  const remote = listRemote(`${v.external_id}/`);
  for (const role of ["card", "detail"]) {
    if (remote.has(`${role}.webp`)) existing.push(`${v.external_id}/${role}.webp`);
  }
}

if (MODE === "verify") {
  const present = new Set(existing);
  const missing = targets.filter((t) => !present.has(t.key));
  console.log(`    Remote objects found: ${existing.length} / ${targets.length}`);
  if (missing.length) {
    console.error(`✗ VERIFY FAILED: ${missing.length} key(s) missing remotely:`);
    missing.forEach((t) => console.error(`  ✗ ${t.key}`));
    process.exit(1);
  }
  console.log("✓ VERIFY OK: all 92 keys exist remotely.");
  process.exit(0);
}

// dry / upload: any pre-existing target key is an unexpected collision → abort.
if (existing.length > 0) {
  console.error(`✗ COLLISION: ${existing.length} target key(s) already exist. Refusing to overwrite:`);
  existing.forEach((k) => console.error(`  ✗ ${k}`));
  console.error("Investigate before proceeding. No writes performed.");
  process.exit(1);
}
console.log(`[2] Collision check OK: none of the ${targets.length} target keys exist remotely.`);

if (MODE === "dry") {
  console.log("\n[DRY] Would upload the following (content-type image/webp):");
  for (const t of targets.slice(0, 4)) console.log(`  ${t.local}  →  ss:///${BUCKET}/${t.key}`);
  console.log(`  … (${targets.length} files total)`);
  console.log("\n✓ DRY complete. No writes performed. Re-run with MODE=upload to apply (after approval).");
  process.exit(0);
}

// ── 3. Upload (MODE=upload only) ────────────────────────────────────────────
console.log(`[3] Uploading ${targets.length} files…`);
let done = 0;
for (const t of targets) {
  sb(["storage", "cp", t.local, `ss:///${BUCKET}/${t.key}`, "--content-type", CONTENT_TYPE]);
  done++;
  if (done % 10 === 0) console.log(`    …${done}/${targets.length}`);
}
console.log(`✓ Uploaded ${done} files. Run MODE=verify to confirm deterministically.`);
