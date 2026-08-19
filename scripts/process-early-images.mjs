/**
 * process-early-images.mjs
 *
 * Processes the early-batch source images into staged WebP assets, driven ENTIRELY
 * by scripts/venue-image-source-map-early.json (never by folder number).
 *
 * Standard (matches the BLK-0050..BLK-0100 browser-approved batch):
 *   CARD   → WebP q90, width capped at 1200px (never upscale), aspect preserved, metadata stripped.
 *   DETAIL → WebP q92, native resolution (capped at 2400px only for huge sources),
 *            never upscale, aspect preserved, metadata stripped.
 *
 * Output (gitignored):  venue-images/BLK-XXXX/{card,detail}.webp
 * Only READY venues are processed. REMOVED / MISSING_IMAGES / NO_VENUE /
 * ALREADY_PROCESSED are skipped. No AI/generative modification. No pre-crop.
 *
 * Usage:
 *   node scripts/process-early-images.mjs           # process
 *   node scripts/process-early-images.mjs --dry-run # print plan only
 */

import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const MANIFEST = join(REPO_ROOT, "scripts", "venue-image-source-map-early.json");
const OUT_ROOT = join(REPO_ROOT, "venue-images");

// Resolve the local source archive portably (the manifest stores only a
// machine-neutral label, never an absolute path):
//   1. BLANIKO_SOURCE_DIR env var (explicit override, highest priority)
//   2. else ~/Desktop/Pictures for Blaniko  (folder name has a TRAILING SPACE)
const SOURCE_DIR = process.env.BLANIKO_SOURCE_DIR
  ? process.env.BLANIKO_SOURCE_DIR
  : join(homedir(), "Desktop", "Pictures for Blaniko ");

const DRY_RUN = process.argv.includes("--dry-run");

const CARD_QUALITY = 90;
const CARD_MAX_W = 1200;
const DETAIL_QUALITY = 92;
const DETAIL_MAX_W = 2400;

const manifest = JSON.parse(readFileSync(MANIFEST, "utf-8"));
const srcDir = SOURCE_DIR;

function dimsFor(entry, filename) {
  const img = entry.source_images.find((i) => i.file === filename);
  return img ? { width: img.width, height: img.height } : { width: 0, height: 0 };
}

function encode(srcFile, outFile, quality, maxWidth, srcWidth) {
  const args = ["-quiet", "-q", String(quality), "-m", "6", "-mt"];
  // Never upscale: only downscale when the source exceeds the cap.
  if (srcWidth > maxWidth) args.push("-resize", String(maxWidth), "0");
  args.push(srcFile, "-o", outFile);
  execFileSync("cwebp", args, { stdio: ["ignore", "ignore", "pipe"] });
}

const ready = manifest.venues.filter((v) => v.status === "READY");
let made = 0;
console.log(`${DRY_RUN ? "[DRY-RUN] " : ""}Processing ${ready.length} READY venues → ${ready.length * 2} webps`);
console.log(`Source archive: ${srcDir}`);
console.log("─".repeat(70));

for (const v of ready) {
  const folder = join(srcDir, v.source_desktop_folder);
  const cardSrc = join(folder, v.card_source);
  const detailSrc = join(folder, v.detail_source);
  const outDir = join(OUT_ROOT, v.external_id);
  const cardOut = join(outDir, "card.webp");
  const detailOut = join(outDir, "detail.webp");

  const cardDims = dimsFor(v, v.card_source);
  const detailDims = dimsFor(v, v.detail_source);

  if (!existsSync(cardSrc) || !existsSync(detailSrc)) {
    console.error(`  ✗ ${v.external_id}: source missing — ${cardSrc} / ${detailSrc}`);
    process.exit(1);
  }

  console.log(
    `${v.external_id}  card←${cardDims.width}px (${v.card_source.slice(0, 28)}…)  detail←${detailDims.width}px (${v.detail_source.slice(0, 28)}…)`
  );

  if (DRY_RUN) continue;

  mkdirSync(outDir, { recursive: true });
  encode(cardSrc, cardOut, CARD_QUALITY, CARD_MAX_W, cardDims.width);
  encode(detailSrc, detailOut, DETAIL_QUALITY, DETAIL_MAX_W, detailDims.width);
  made += 2;
}

console.log("─".repeat(70));
console.log(DRY_RUN ? `[DRY-RUN] would create ${ready.length * 2} webps` : `Created ${made} webps for ${ready.length} venues`);
