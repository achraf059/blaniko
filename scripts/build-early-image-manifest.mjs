/**
 * build-early-image-manifest.mjs
 *
 * Builds a DURABLE mapping manifest for the early venue batch (BLK-0001..BLK-0049)
 * that records the corrected Desktop-folder → authoritative-BLK mapping discovered
 * in the identity audit (a +1 folder-numbering shift after the phantom BLK-0037).
 *
 * READ-ONLY with respect to the Desktop source archive. It only READS the immutable
 * source folders + the authoritative payload, and WRITES a single manifest json:
 *   scripts/venue-image-source-map-early.json
 *
 * It NEVER renames/moves/deletes source images and NEVER touches venue-images/.
 *
 * Usage:
 *   node scripts/build-early-image-manifest.mjs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, openSync, readSync, closeSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// Machine-neutral descriptor persisted in the manifest (folder name has a
// TRAILING SPACE — verified). Consumers resolve the real archive portably too.
const SOURCE_ARCHIVE_LABEL = "Desktop/Pictures for Blaniko ";

// The immutable source archive on the local machine. Resolve portably:
//   1. BLANIKO_SOURCE_DIR env var (explicit override, highest priority)
//   2. else ~/Desktop/Pictures for Blaniko  (derived from the user's home dir)
const DESKTOP_DIR = process.env.BLANIKO_SOURCE_DIR
  ? process.env.BLANIKO_SOURCE_DIR
  : join(homedir(), "Desktop", "Pictures for Blaniko ");

console.log(`Source archive resolved to: ${DESKTOP_DIR}`);

const PAYLOAD_PATH = join(REPO_ROOT, "scripts", "v3_venues_payload.json");
const OUT_PATH = join(REPO_ROOT, "scripts", "venue-image-source-map-early.json");

// ── Final decisions (approved) ──────────────────────────────────────────────
const REMOVED_IDS = new Set(["BLK-0020", "BLK-0045"]);          // removed from MVP
const ALREADY_PROCESSED_IDS = new Set(["BLK-0050"]);            // live, do not touch
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

// Manually-confirmed card/detail assignments (override the automatic source order).
// Achraf reviewed these individually; the flagged ordering warning is cleared.
const CONFIRMED_ASSIGNMENTS = {
  "BLK-0028": {
    card: "enhanced_playground.png",
    detail: "enhanced_playroom.png",
    note: "Manually confirmed by Achraf: playground = card (stronger activity-focused image); playroom = detail/hero (wider environmental composition).",
  },
};

// ── Desktop folder → authoritative id (approved corrected mapping) ──────────
// Desktop 0001..0036 map 1:1. Because authoritative BLK-0037 does not exist,
// Desktop 0037..0049 are shifted +1 → authoritative 0038..0050.
function authIdForDesktopNum(n) {
  return n <= 36 ? n : n + 1;
}
// Inverse: authoritative id → Desktop source folder number ("" if none)
function desktopNumForAuthNum(a) {
  if (a === 37) return null;      // phantom, never existed
  return a <= 36 ? a : a - 1;
}
const pad = (n) => "BLK-" + String(n).padStart(4, "0");

// ── PNG/JPEG dimension reader (no deps) ─────────────────────────────────────
function readDims(file) {
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.alloc(32);
    readSync(fd, buf, 0, 32, 0);
    // PNG: 89 50 4E 47 ... IHDR then width(4) height(4) at offset 16/20
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    // JPEG: scan markers for SOF
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      const stat = readFileSync(file);
      let off = 2;
      while (off < stat.length) {
        if (stat[off] !== 0xff) { off++; continue; }
        const marker = stat[off + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: stat.readUInt16BE(off + 5), width: stat.readUInt16BE(off + 7) };
        }
        off += 2 + stat.readUInt16BE(off + 2);
      }
    }
    return { width: 0, height: 0 };
  } finally {
    closeSync(fd);
  }
}

// Recursive image discovery (subfolders included), returned in deterministic
// selection order so the FIRST source → card and the SECOND source → detail,
// matching the BLK-0050..0100 convention.
function listImages(folder) {
  if (!existsSync(folder)) return [];
  const found = [];
  const walk = (dir, rel) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith("._") || ent.name === ".DS_Store") continue;
      const abs = join(dir, ent.name);
      const relPath = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(abs, relPath);
      else if (IMAGE_EXT.test(ent.name)) {
        const { width, height } = readDims(abs);
        found.push({ file: relPath, width, height, aspect: height ? width / height : 0, order: orderKey(relPath) });
      }
    }
  };
  walk(folder, "");
  found.sort((a, b) => cmpOrder(a.order, b.order) || a.file.localeCompare(b.file));
  return found;
}

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

/**
 * Comparable selection-order key from a filename (intended order Achraf saved them in):
 *   - ChatGPT "…Mon D, YYYY, HH_MM_SS AM/PM…" → ["T", epochMillis] (chronological = generation order)
 *   - explicit ordinal "(N)" or trailing "_N"  → ["O", N]          (numbered order; base/unnumbered = 1)
 */
function orderKey(name) {
  const ts = name.match(/(\w{3}) (\d{1,2}), (\d{4}), (\d{2})_(\d{2})_(\d{2})\s*(AM|PM)/i);
  if (ts && MONTHS[ts[1]] !== undefined) {
    let hh = parseInt(ts[4], 10);
    const ap = ts[7].toUpperCase();
    if (ap === "PM" && hh !== 12) hh += 12;
    if (ap === "AM" && hh === 12) hh = 0;
    return ["T", Date.UTC(+ts[3], MONTHS[ts[1]], +ts[2], hh, +ts[5], +ts[6])];
  }
  const paren = name.match(/\((\d+)\)/);
  if (paren) return ["O", parseInt(paren[1], 10)];
  const suffix = name.match(/_(\d+)\.(?:png|jpe?g|webp)$/i);
  if (suffix) return ["O", parseInt(suffix[1], 10)];
  return ["O", 1];
}
function cmpOrder(a, b) {
  if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
  return a[1] - b[1];
}
function orderBasis(images) {
  if (images[0].order[0] === "T") return "chronological timestamp in filename";
  if (images.some((i) => /\(\d+\)|_\d+\.(?:png|jpe?g|webp)$/i.test(i.file))) return "numeric ordinal in filename";
  return "filename sort (no timestamp/ordinal — REVIEW ORDER)";
}

/**
 * Card vs detail assignment by DETERMINISTIC SOURCE ORDER (not resolution):
 *   first source → card, second source → detail/hero.
 * Resolution only governs how each chosen image is later encoded.
 * Returns { card, detail, method } or { ambiguous: true } when the two cannot be ordered.
 */
function assign(images) {
  if (images.length !== 2) return { ambiguous: true, reason: `expected 2 images, found ${images.length}` };
  const [first, second] = images;
  if (cmpOrder(first.order, second.order) === 0 && first.file === second.file) {
    return { ambiguous: true, reason: "identical order keys and names" };
  }
  const basis = orderBasis(images);
  return {
    card: first.file,
    detail: second.file,
    method: `source order (first=card, second=detail; ${basis})`,
    order_review: basis.includes("REVIEW ORDER"),
  };
}

// ── Build ───────────────────────────────────────────────────────────────────
const payload = JSON.parse(readFileSync(PAYLOAD_PATH, "utf-8"));
const byId = new Map(payload.map((v) => [v.external_id, v]));

const entries = [];
let readyCount = 0;
let webpExpected = 0;

for (let a = 1; a <= 50; a++) {
  const authId = pad(a);

  if (a === 37) {
    entries.push({
      external_id: "BLK-0037",
      name: null,
      status: "NO_VENUE",
      note: "Authoritative BLK-0037 never existed. A Desktop folder named BLK-0037 exists but its images belong to BLK-0038. This id must NEVER become a venue.",
      source_desktop_folder: "BLK-0037",
      card_source: null,
      detail_source: null,
    });
    continue;
  }

  const v = byId.get(authId);
  const dtNum = desktopNumForAuthNum(a);
  const dtFolder = dtNum == null ? null : pad(dtNum);
  const srcPath = dtFolder ? join(DESKTOP_DIR, dtFolder) : null;
  const images = srcPath ? listImages(srcPath) : [];

  let status;
  if (ALREADY_PROCESSED_IDS.has(authId)) status = "ALREADY_PROCESSED";
  else if (REMOVED_IDS.has(authId)) status = "REMOVED";
  else if (images.length < 2) status = "MISSING_IMAGES";
  else status = "READY";

  let assignment = null;
  let confirmedNote = null;
  if (status === "READY") {
    const override = CONFIRMED_ASSIGNMENTS[authId];
    if (override) {
      const names = new Set(images.map((i) => i.file));
      if (!names.has(override.card) || !names.has(override.detail)) {
        throw new Error(`${authId}: confirmed override references missing source (${override.card} / ${override.detail})`);
      }
      assignment = { card: override.card, detail: override.detail, method: "manually confirmed (Achraf)", order_review: false };
      confirmedNote = override.note;
    } else {
      assignment = assign(images);
    }
    if (assignment.ambiguous) {
      status = "AMBIGUOUS";
    } else {
      readyCount++;
      webpExpected += 2;
    }
  }

  // Soft encoding flag (non-blocking): notes when a chosen source is small. Does NOT
  // affect which image gets which role — role is purely source order.
  let lowResFlag = null;
  if (assignment && !assignment.ambiguous) {
    const cd = images.find((i) => i.file === assignment.card);
    const dd = images.find((i) => i.file === assignment.detail);
    const flags = [];
    if (dd && dd.width < 1200) flags.push(`hero source ${dd.width}px < 1200`);
    if (cd && cd.width < 1000) flags.push(`card source ${cd.width}px < 1000`);
    if (flags.length) lowResFlag = flags.join("; ");
  }
  if (assignment && assignment.order_review) {
    lowResFlag = (lowResFlag ? lowResFlag + "; " : "") + "order basis is filename sort (no timestamp/ordinal)";
  }

  entries.push({
    external_id: authId,
    name: v ? v.name : null,
    subcategory: v ? v.subcategory : null,
    status,
    source_desktop_folder: dtFolder,
    source_images: images.map((i) => ({ file: i.file, width: i.width, height: i.height })),
    card_source: assignment && !assignment.ambiguous ? assignment.card : null,
    detail_source: assignment && !assignment.ambiguous ? assignment.detail : null,
    assignment_method: assignment ? (assignment.ambiguous ? `AMBIGUOUS: ${assignment.reason}` : assignment.method) : null,
    manually_confirmed: confirmedNote ? true : undefined,
    review_flag: lowResFlag,
    note:
      status === "REMOVED"
        ? (authId === "BLK-0045"
            ? "Removed from MVP (editorial decision). Source folder (Desktop BLK-0044) is empty; never processable."
            : "Removed from MVP (permanently closed). Source folder empty.")
        : status === "MISSING_IMAGES"
        ? "Active venue with no source imagery. image_url/detail_image_url stay NULL; 'Photo coming soon' fallback remains."
        : status === "ALREADY_PROCESSED"
        ? "AREA SPORTS & EVENTS CENTER — already processed, uploaded, linked and merged. DO NOT TOUCH. Excluded from this batch."
        : confirmedNote || undefined,
  });
}

const manifest = {
  generated_at: new Date().toISOString(),
  description:
    "Corrected source→authoritative image mapping for the early venue batch (BLK-0001..BLK-0049). " +
    "Accounts for the +1 Desktop-folder shift after the phantom BLK-0037. Do not rely on folder number alone.",
  source_archive: SOURCE_ARCHIVE_LABEL,
  mapping_rule:
    "Desktop 0001-0036 → authoritative 1:1; Desktop 0037-0049 → authoritative +1 (0038-0050).",
  card_detail_rule:
    "DETERMINISTIC SOURCE ORDER (matches BLK-0050..0100): first source → CARD, second source → DETAIL/hero. Order key is the in-filename ChatGPT timestamp (chronological = generation/selection order) or a numeric ordinal ((N) / _N); resolution NEVER decides the role, only how the chosen image is encoded. review_flag notes small sources (encoding only) and any venue ordered by plain filename sort (no timestamp/ordinal).",
  processing_standard: {
    card: { format: "webp", quality: 90, target_width: 1200, upscale: false, strip_metadata: true },
    detail: { format: "webp", quality: 92, native_resolution: true, max_width_cap: 2400, upscale: false, strip_metadata: true },
  },
  counts: {
    active_early_venues: 46,
    removed: 2,
    missing_image_active: 0,
    processable_venues: readyCount,
    expected_new_webps: webpExpected,
  },
  excluded_from_processing: ["BLK-0020", "BLK-0037", "BLK-0045", "BLK-0050"],
  venues: entries,
};

writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
console.log(`Wrote ${OUT_PATH}`);
console.log(`READY venues: ${readyCount}  |  expected new webps: ${webpExpected}`);
const byStatus = {};
for (const e of entries) byStatus[e.status] = (byStatus[e.status] || 0) + 1;
console.log("Status breakdown:", byStatus);
