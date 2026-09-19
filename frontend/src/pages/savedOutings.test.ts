// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  MAX_SAVED_OUTINGS,
  mergeSavedOuting,
  readCurrentSavedOutings,
  removeSavedOuting,
  sanitizeSavedOutings,
  type SavedOuting,
} from "./savedOutings";
import { installControllableStorage } from "../test/storageTestUtils";

// Regression coverage for B04 D3: one malformed saved outing must never crash the
// /plan route, and every genuinely well-formed outing (including ones referencing a
// stale/retired venue — that is not this sanitizer's concern) must survive intact.
//
// Policy: every field is validated against its actual declared type in SavedOuting —
// this app has never written anything else there (see savedOutings.ts's header for why
// that costs nothing for real data). `category`/`planStyle` stay optional, matching
// their existing, documented optionality; every other field is required.

function validOuting(overrides: Partial<SavedOuting> = {}): SavedOuting {
  return {
    id: "outing-1",
    title: "Friends hangout • Casablanca",
    summary: "A social city run",
    createdAt: "2026-09-01T10:00:00.000Z",
    withWho: "friends",
    mood: "social",
    budget: "all",
    area: "any",
    stops: [
      { role: "start", roleHint: "Start", slug: "venue-a", name: "Venue A", area: "maarif", category: "gaming" },
      { role: "end", roleHint: "End", slug: "venue-b", name: "Venue B", area: "gauthier", category: "sports" },
    ],
    ...overrides,
  };
}

describe("sanitizeSavedOutings — normal data", () => {
  it("preserves a single valid outing exactly", () => {
    const outing = validOuting();
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("preserves multiple valid outings in order", () => {
    const a = validOuting({ id: "a" });
    const b = validOuting({ id: "b" });
    const c = validOuting({ id: "c" });
    expect(sanitizeSavedOutings([a, b, c])).toEqual([a, b, c]);
  });

  it("preserves a valid outing with category/planStyle present", () => {
    const outing = validOuting({ category: "gaming", planStyle: "friends-hangout" });
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("preserves a valid outing missing category/planStyle (documented pre-existing optionality)", () => {
    const outing = validOuting();
    expect(outing.category).toBeUndefined();
    expect(outing.planStyle).toBeUndefined();
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("preserves a valid outing with lockedRoles present", () => {
    const outing = validOuting({ lockedRoles: ["start", "end"] });
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("preserves an outing with an empty stops array (opens a fresh plan, not resurrected)", () => {
    const outing = validOuting({ stops: [] });
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("preserves a stop with only slug/name — role/roleHint/area/category are write-only and optional", () => {
    // Matches the minimal shape PR #240's own saved-outing tests already store.
    const outing = validOuting({ stops: [{ slug: "venue-a", name: "Venue A" }] });
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("preserves unknown extra properties on the outing", () => {
    const outing = { ...validOuting(), rating: 5, __future: { a: 1 } };
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("preserves duplicate stops (not this sanitizer's concern)", () => {
    const dup = { role: "start", roleHint: "Start", slug: "venue-a", name: "Venue A", area: "maarif", category: "gaming" };
    const outing = validOuting({ stops: [dup, dup] });
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("preserves duplicate outing ids across separate entries (not this sanitizer's concern)", () => {
    const a = validOuting({ id: "dup", title: "First" });
    const b = validOuting({ id: "dup", title: "Second" });
    expect(sanitizeSavedOutings([a, b])).toEqual([a, b]);
  });

  it("preserves an outing referencing a stale/unknown venue slug — not this sanitizer's job", () => {
    // Stale-venue detection happens later, against the live venue set. A stale or
    // retired slug is still a genuine string, so it satisfies `stop.slug: string` just
    // like any current venue's slug — structurally this outing is perfectly valid.
    const outing = validOuting({
      stops: [{ role: "start", roleHint: "Start", slug: "ghost-venue-blk-9999", name: "Gone venue", area: "maarif", category: "gaming" }],
    });
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("preserves an outing referencing a retired venue slug — never resurrected, never rejected here", () => {
    const outing = validOuting({
      stops: [{ role: "start", roleHint: "Start", slug: "e-blue-gaming-center-blk-0020", name: "Retired venue", area: "maarif", category: "gaming" }],
    });
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("preserves an invalid-looking but genuinely stringy createdAt (date parsing is formatSavedDate's job, not this sanitizer's)", () => {
    const outing = validOuting({ createdAt: "not-a-real-date" });
    expect(sanitizeSavedOutings([outing])).toEqual([outing]);
  });

  it("returns [] for a non-array top-level value (unrelated to per-entry validation)", () => {
    expect(sanitizeSavedOutings(null)).toEqual([]);
    expect(sanitizeSavedOutings({})).toEqual([]);
    expect(sanitizeSavedOutings("not an array")).toEqual([]);
  });

  it("returns [] for an empty array", () => {
    expect(sanitizeSavedOutings([])).toEqual([]);
  });
});

describe("sanitizeSavedOutings — structural recovery (drops only the malformed entry)", () => {
  const cases: Array<[string, unknown]> = [
    ["outing is null", null],
    ["outing is a string", "just a string"],
    ["outing is a number", 42],
    ["outing is an array", ["a", "b"]],
    ["stops missing entirely", { ...validOuting(), stops: undefined }],
    ["stops is null", { ...validOuting(), stops: null }],
    ["stops is a string", { ...validOuting(), stops: "not-an-array" }],
    ["stops is a plain object", { ...validOuting(), stops: { a: 1 } }],
    ["stops contains a null entry", { ...validOuting(), stops: [null, validOuting().stops[0]] }],
    ["stops contains a string entry", { ...validOuting(), stops: ["not-a-stop"] }],
    ["a stop is an array", { ...validOuting(), stops: [["a"]] }],
    ["a stop is missing its slug", { ...validOuting(), stops: [{ name: "No slug" }] }],
    ["a stop's slug is a number", { ...validOuting(), stops: [{ ...validOuting().stops[0], slug: 12345 }] }],
    ["a stop's name is an object", { ...validOuting(), stops: [{ ...validOuting().stops[0], name: { a: 1 } }] }],
    ["a stop's name is an array", { ...validOuting(), stops: [{ ...validOuting().stops[0], name: ["x"] }] }],
    ["a stop's name is missing", { ...validOuting(), stops: [{ slug: "venue-a" }] }],
    ["title is an object", { ...validOuting(), title: { en: "x" } }],
    ["title is an array", { ...validOuting(), title: ["x"] }],
    ["title is a number", { ...validOuting(), title: 42 }],
    ["title is missing", { ...validOuting(), title: undefined }],
    ["summary is an object", { ...validOuting(), summary: { en: "x" } }],
    ["summary is missing", { ...validOuting(), summary: undefined }],
    ["createdAt is missing", { ...validOuting(), createdAt: undefined }],
    ["createdAt is an object", { ...validOuting(), createdAt: { not: "a date" } }],
    ["budget is a number", { ...validOuting(), budget: 5 }],
    ["area is null", { ...validOuting(), area: null }],
    ["withWho is missing", { ...validOuting(), withWho: undefined }],
    ["mood is an object", { ...validOuting(), mood: { x: 1 } }],
    ["category is a number", { ...validOuting(), category: 5 }],
    ["planStyle is an object", { ...validOuting(), planStyle: {} }],
    ["lockedRoles is a string", { ...validOuting(), lockedRoles: "main" }],
    ["lockedRoles is a plain object with a length", { ...validOuting(), lockedRoles: { length: 2 } }],
    ["lockedRoles contains an unrecognized role", { ...validOuting(), lockedRoles: ["main", "diagonal"] }],
    ["lockedRoles contains a non-string element", { ...validOuting(), lockedRoles: ["main", 7] }],
    ["id is missing", { ...validOuting(), id: undefined }],
    ["id is an empty string", { ...validOuting(), id: "" }],
    ["id is a number", { ...validOuting(), id: 7 }],
  ];

  for (const [label, malformed] of cases) {
    it(`drops "${label}" without throwing`, () => {
      expect(() => sanitizeSavedOutings([malformed])).not.toThrow();
      expect(sanitizeSavedOutings([malformed])).toEqual([]);
    });
  }
});

describe("sanitizeSavedOutings — mixed lists", () => {
  it("preserves valid outings and drops only the malformed ones, in order", () => {
    const good1 = validOuting({ id: "good-1" });
    const good2 = validOuting({ id: "good-2" });
    const good3 = validOuting({ id: "good-3" });
    const bad1 = null;
    const bad2 = { ...validOuting(), stops: null };

    const result = sanitizeSavedOutings([good1, bad1, good2, bad2, good3]);
    expect(result).toEqual([good1, good2, good3]);
  });

  it("a run of several malformed entries mixed with valid ones preserves every valid entry", () => {
    const good = validOuting({ id: "the-good-one" });
    const list = [
      { ...validOuting(), title: {} },
      "a string outing",
      42,
      good,
      null,
      { ...validOuting(), lockedRoles: "main" },
      [1, 2, 3],
    ];
    expect(sanitizeSavedOutings(list)).toEqual([good]);
  });

  it("a malformed-only list sanitizes down to an empty array", () => {
    const list = [null, "x", 1, { stops: null }, { ...validOuting(), title: {} }];
    expect(sanitizeSavedOutings(list)).toEqual([]);
  });
});

// ─── Cross-tab-safe mutation helpers (B04 D5) ──────────────────────────────────────

const KEY = "blaniko:saved-outings:v1";
const storage = installControllableStorage();

function outing(id: string): SavedOuting {
  return {
    id,
    title: `Plan ${id}`,
    summary: "s",
    createdAt: "2026-09-01T10:00:00.000Z",
    withWho: "friends",
    mood: "social",
    budget: "all",
    area: "any",
    stops: [{ slug: "venue-a", name: "Venue A" }],
  };
}

beforeEach(() => {
  storage.reset();
});

describe("readCurrentSavedOutings", () => {
  it("reads and sanitizes a valid stored list", () => {
    storage.seed(KEY, JSON.stringify([outing("a")]));
    expect(readCurrentSavedOutings(KEY)).toEqual({ ok: true, outings: [outing("a")] });
  });

  it("reports ok:true with an empty list for a genuinely absent key", () => {
    expect(readCurrentSavedOutings(KEY)).toEqual({ ok: true, outings: [] });
  });

  it("reports ok:true with an empty list for invalid JSON (distinct from a read failure)", () => {
    storage.seed(KEY, "{not json");
    expect(readCurrentSavedOutings(KEY)).toEqual({ ok: true, outings: [] });
  });

  it("drops only malformed entries, preserving valid ones", () => {
    storage.seed(KEY, JSON.stringify([outing("a"), { stops: null }, outing("b")]));
    expect(readCurrentSavedOutings(KEY)).toEqual({ ok: true, outings: [outing("a"), outing("b")] });
  });

  it("reports ok:false when the read itself fails — never confused with a genuinely empty read", () => {
    storage.seed(KEY, JSON.stringify([outing("a")]));
    storage.failure = "read";
    expect(readCurrentSavedOutings(KEY)).toEqual({ ok: false });
  });

  it("reports ok:false when storage access itself throws", () => {
    storage.failure = "access";
    expect(readCurrentSavedOutings(KEY)).toEqual({ ok: false });
  });
});

describe("mergeSavedOuting", () => {
  it("prepends the new outing ahead of the current list", () => {
    expect(mergeSavedOuting([outing("a")], outing("b"))).toEqual([outing("b"), outing("a")]);
  });

  it("preserves the existing order of everything else", () => {
    const current = [outing("a"), outing("b"), outing("c")];
    expect(mergeSavedOuting(current, outing("d"))).toEqual([outing("d"), outing("a"), outing("b"), outing("c")]);
  });

  it("caps at MAX_SAVED_OUTINGS, dropping the oldest (last) entries — same as the pre-D5 behavior", () => {
    const current = Array.from({ length: MAX_SAVED_OUTINGS }, (_, i) => outing(`existing-${i}`));
    const result = mergeSavedOuting(current, outing("new"));
    expect(result).toHaveLength(MAX_SAVED_OUTINGS);
    expect(result[0]).toEqual(outing("new"));
    expect(result.map((o) => o.id)).not.toContain(`existing-${MAX_SAVED_OUTINGS - 1}`);
  });

  it("does not mutate the input array", () => {
    const current = [outing("a")];
    mergeSavedOuting(current, outing("b"));
    expect(current).toEqual([outing("a")]);
  });
});

describe("removeSavedOuting", () => {
  it("removes only the matching id", () => {
    const current = [outing("a"), outing("b"), outing("c")];
    expect(removeSavedOuting(current, "b")).toEqual([outing("a"), outing("c")]);
  });

  it("is a no-op if the id is not present", () => {
    const current = [outing("a")];
    expect(removeSavedOuting(current, "missing")).toEqual([outing("a")]);
  });

  it("does not mutate the input array", () => {
    const current = [outing("a"), outing("b")];
    removeSavedOuting(current, "a");
    expect(current).toEqual([outing("a"), outing("b")]);
  });
});
