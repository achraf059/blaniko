// Regression / characterization tests for the pure recommendation engine.
//
// These tests LOCK the CURRENT product behavior of recommendationEngine.ts; they
// are not a redesign. They assert product invariants (WHAT the user selects wins
// for the MAIN stop, HOW it feels cannot override that, price/area are inert,
// output is deterministic) — not internal score numbers or private helpers.
//
// The engine is a pure module: no Date, no Math.random, no shuffle. Given a fixed
// seed, seededHash(slug, seed) is fully deterministic, so every test below is
// stable. Fixtures are minimal hand-built Venues (only the fields the engine
// reads); the 97-venue production dataset is never imported (mockData is a
// type-only import here, erased at runtime).

import { describe, it, expect } from "vitest";
import type { Venue } from "../data/mockData";
import {
  buildInitialSelection,
  scoreVenuesWithSeed,
  mapQuizAnswersToStyle,
  type RecommendationStyle,
  type EngineStop,
} from "./recommendationEngine";
import type { DiscoveryCompanion, DiscoveryMood } from "./discoveryInsights";
import type { QuizAnswers } from "../hooks/recommendationState";

// Fixed seed keeps the seeded-hash tie-break deterministic across the whole file.
const SEED = 7;

// Minimal Venue: only the fields the engine actually reads matter (slug,
// categorySlug, plus optional tag/text signals). Everything else is filler that
// satisfies the Venue type.
function makeVenue(
  overrides: Partial<Venue> & { slug: string; categorySlug: string },
): Venue {
  return {
    name: overrides.slug,
    category: overrides.categorySlug,
    area: "Casablanca",
    description: "",
    ...overrides,
  } as Venue;
}

// Neutral plan style: every candidate category is role-eligible and there are no
// boosts, so nothing skews the MAIN pick except the explicit-category constraint
// and the deterministic hash tie-break.
const ALL_CATEGORIES = [
  "sports",
  "gaming",
  "activities",
  "outdoor",
  "family",
  "wellness",
];

function makeStyle(
  overrides: Partial<RecommendationStyle> = {},
): RecommendationStyle {
  return {
    id: "friends-hangout",
    roleCategories: {
      start: [...ALL_CATEGORIES],
      main: [...ALL_CATEGORIES],
      end: [...ALL_CATEGORIES],
    },
    ...overrides,
  };
}

// Two venues per category so that even after START consumes one venue of the
// selected category, MAIN still has an eligible venue of that category — the
// invariant we want to lock ("eligible venue exists" is genuinely true).
function buildPool(): Venue[] {
  const categories = ["sports", "gaming", "activities", "outdoor", "family"];
  return categories.flatMap((categorySlug) => [
    makeVenue({ slug: `${categorySlug}-a`, categorySlug }),
    makeVenue({ slug: `${categorySlug}-b`, categorySlug }),
  ]);
}

function runSelection(opts: {
  pool: Venue[];
  selectedCategory: string;
  style?: RecommendationStyle;
  mood?: DiscoveryMood;
  companion?: DiscoveryCompanion;
  seed?: number;
}): EngineStop[] {
  const seed = opts.seed ?? SEED;
  const style = opts.style ?? makeStyle();
  const scored = scoreVenuesWithSeed(opts.pool, seed, {
    companion: opts.companion,
    mood: opts.mood,
    style,
  });
  return buildInitialSelection({
    scoredVenues: scored,
    rolePreferences: style.roleCategories,
    style,
    mood: opts.mood,
    selectedCategory: opts.selectedCategory,
  });
}

function mainOf(selection: EngineStop[]): EngineStop | undefined {
  return selection.find((stop) => stop.roleKey === "main");
}

function slugsOf(selection: EngineStop[]): Record<string, string> {
  return Object.fromEntries(
    selection.map((stop) => [stop.roleKey, stop.venue.slug]),
  );
}

// ─── Core category invariant ───────────────────────────────────────────────────

describe("MAIN category invariant — explicit category wins when eligible venues exist", () => {
  it("sports selection → MAIN is a sports venue", () => {
    const selection = runSelection({
      pool: buildPool(),
      selectedCategory: "sports",
    });
    const main = mainOf(selection);
    expect(main).toBeDefined();
    expect(main!.venue.categorySlug).toBe("sports");
  });

  it("gaming selection → MAIN is a gaming venue", () => {
    const selection = runSelection({
      pool: buildPool(),
      selectedCategory: "gaming",
    });
    const main = mainOf(selection);
    expect(main).toBeDefined();
    expect(main!.venue.categorySlug).toBe("gaming");
  });

  it("family selection → MAIN is a family venue", () => {
    const selection = runSelection({
      pool: buildPool(),
      selectedCategory: "family",
    });
    const main = mainOf(selection);
    expect(main).toBeDefined();
    expect(main!.venue.categorySlug).toBe("family");
  });
});

// ─── Style / vibe cannot override the explicit category ─────────────────────────

describe("Plan style does not override the explicit category", () => {
  it("a strongly style-matched gaming venue still does NOT become MAIN when sports is selected", () => {
    // A gaming venue engineered to score highest on every non-category signal:
    // social atmosphere (mood), Friends/Groups audience (companion), and a
    // keyword-boost hit. The sports venues carry none of these.
    const starGaming = makeVenue({
      slug: "gaming-star",
      categorySlug: "gaming",
      atmosphereTags: ["Social", "Lively"],
      audienceTags: ["Friends / Groups"],
      description: "friends groups social hangout",
    });
    const pool: Venue[] = [
      starGaming,
      makeVenue({ slug: "gaming-plain", categorySlug: "gaming" }),
      makeVenue({ slug: "sports-a", categorySlug: "sports" }),
      makeVenue({ slug: "sports-b", categorySlug: "sports" }),
    ];

    const style = makeStyle({
      categoryBoosts: ["gaming"],
      keywordBoosts: ["friends", "social"],
    });

    // Sanity: without the category constraint the gaming venue is the global #1,
    // proving the constraint (not the score) is what keeps MAIN on sports.
    const scored = scoreVenuesWithSeed(pool, SEED, {
      companion: "friends",
      mood: "social",
      style,
    });
    expect(scored[0].venue.slug).toBe("gaming-star");

    const selection = runSelection({
      pool,
      selectedCategory: "sports",
      style,
      companion: "friends",
      mood: "social",
    });
    const main = mainOf(selection);
    expect(main).toBeDefined();
    // WHAT the user asked for (sports) beats HOW well another category fits the vibe.
    expect(main!.venue.categorySlug).toBe("sports");
  });
});

// ─── Fallback: no eligible venue in the selected category ───────────────────────

describe("Fallback when the selected category has no eligible venue", () => {
  it("does not crash and produces a valid MAIN from the available pool", () => {
    // Pool intentionally contains NO 'wellness' venue.
    const pool = [
      makeVenue({ slug: "sports-a", categorySlug: "sports" }),
      makeVenue({ slug: "gaming-a", categorySlug: "gaming" }),
      makeVenue({ slug: "activities-a", categorySlug: "activities" }),
    ];

    let selection: EngineStop[] = [];
    expect(() => {
      selection = runSelection({ pool, selectedCategory: "wellness" });
    }).not.toThrow();

    const main = mainOf(selection);
    // Current behavior: applyMainCategoryConstraint returns the full pool when the
    // selected category is empty, so MAIN falls back to a normally-ranked venue.
    expect(main).toBeDefined();
    expect(main!.venue.categorySlug).not.toBe("wellness");
    expect(pool.map((v) => v.slug)).toContain(main!.venue.slug);
  });
});

// ─── Price safety: price must NOT influence ranking (yet) ────────────────────────

describe("Price does not influence recommendation ranking", () => {
  it("swapping only priceLevel between two eligible venues does not change MAIN", () => {
    // Two sports venues identical except slug and price. Which one wins MAIN is
    // decided purely by the seeded-hash tie-break — never by price.
    const cheapFirst = [
      makeVenue({ slug: "sports-a", categorySlug: "sports", priceLevel: "$" }),
      makeVenue({
        slug: "sports-b",
        categorySlug: "sports",
        priceLevel: "$$$$",
      }),
    ];
    const priceSwapped = [
      makeVenue({
        slug: "sports-a",
        categorySlug: "sports",
        priceLevel: "$$$$",
      }),
      makeVenue({ slug: "sports-b", categorySlug: "sports", priceLevel: "$" }),
    ];

    const mainBefore = mainOf(
      runSelection({ pool: cheapFirst, selectedCategory: "sports" }),
    );
    const mainAfter = mainOf(
      runSelection({ pool: priceSwapped, selectedCategory: "sports" }),
    );

    expect(mainBefore!.venue.slug).toBe(mainAfter!.venue.slug);
  });

  it("changing every venue's priceLevel leaves the whole selection identical", () => {
    const base = buildPool();
    const repriced = buildPool().map((venue) =>
      makeVenue({ ...venue, slug: venue.slug, priceLevel: "$$$$$" }),
    );

    const before = slugsOf(runSelection({ pool: base, selectedCategory: "sports" }));
    const after = slugsOf(
      runSelection({ pool: repriced, selectedCategory: "sports" }),
    );

    expect(after).toEqual(before);
  });
});

// ─── Area / neighborhood is non-blocking ────────────────────────────────────────

describe("Area / neighborhood does not filter or reorder venues", () => {
  it("changing every venue's area leaves the whole selection identical", () => {
    const base = buildPool();
    const relocated = buildPool().map((venue, index) =>
      makeVenue({
        ...venue,
        slug: venue.slug,
        area: `Neighborhood-${index}`,
        neighborhood: `Neighborhood-${index}`,
      }),
    );

    const before = slugsOf(runSelection({ pool: base, selectedCategory: "sports" }));
    const after = slugsOf(
      runSelection({ pool: relocated, selectedCategory: "sports" }),
    );

    // MAIN stays a sports venue and the exact selection is unchanged by area.
    expect(after).toEqual(before);
    const main = mainOf(runSelection({ pool: relocated, selectedCategory: "sports" }));
    expect(main!.venue.categorySlug).toBe("sports");
  });

  it("the user's area answer alone does not change the plan style (except the documented partner+ain-diab case)", () => {
    const base: QuizAnswers = {
      companion: "friends",
      category: "sports",
      budget: "all",
      area: "any",
      vibe: "social",
    };
    const styleAny = mapQuizAnswersToStyle(base);
    const styleMaarif = mapQuizAnswersToStyle({ ...base, area: "maarif" });
    const styleAinDiab = mapQuizAnswersToStyle({ ...base, area: "ain diab" });

    // For a non-partner companion, area is inert in style mapping.
    expect(styleMaarif).toBe(styleAny);
    expect(styleAinDiab).toBe(styleAny);
  });
});

// ─── Retired-ID responsibility boundary (characterization) ──────────────────────

describe("Retired-ID exclusion is a DATA-SOURCE invariant, not a recommender one", () => {
  // The engine ranks whatever venue array it is handed; it never inspects
  // externalId / isActive and has no knowledge of BLK-0020 / BLK-0037 / BLK-0045.
  // Excluding retired IDs is guaranteed upstream (the V3 extractor: EXPECTED_COUNT
  // = 97, RETIRED_IDS, BLK-0037 absent) / importer / DB — NOT here. This test
  // documents that boundary; it deliberately does NOT assert the engine filters
  // retired IDs, because it does not and must not.
  it("selects a venue carrying a retired external_id when every eligible candidate is retired (proving no engine-level filter)", () => {
    // Both eligible sports venues carry retired external_ids, so whichever survives
    // START to become MAIN is necessarily a retired-ID venue. If the engine filtered
    // retired IDs, MAIN could never be one of these.
    const retiredIds = ["BLK-0020", "BLK-0045"];
    const pool = [
      makeVenue({ slug: "retired-a", categorySlug: "sports", externalId: "BLK-0020" }),
      makeVenue({ slug: "retired-b", categorySlug: "sports", externalId: "BLK-0045" }),
      makeVenue({ slug: "gaming-a", categorySlug: "gaming" }),
    ];

    const main = mainOf(runSelection({ pool, selectedCategory: "sports" }));
    expect(main).toBeDefined();
    expect(main!.venue.categorySlug).toBe("sports");
    // The engine happily surfaces a retired-ID venue → retired IDs must be kept out upstream.
    expect(retiredIds).toContain(main!.venue.externalId);
  });
});

// ─── Determinism ────────────────────────────────────────────────────────────────

describe("Determinism", () => {
  it("identical inputs and seed produce identical selections across runs", () => {
    const poolA = buildPool();
    const poolB = buildPool();
    const first = slugsOf(runSelection({ pool: poolA, selectedCategory: "sports", seed: 42 }));
    const second = slugsOf(runSelection({ pool: poolB, selectedCategory: "sports", seed: 42 }));
    expect(second).toEqual(first);
  });

  it("mapQuizAnswersToStyle is a pure function of its answers", () => {
    const answers: QuizAnswers = {
      companion: "partner",
      category: "activities",
      budget: "all",
      area: "ain diab",
      vibe: "romantic",
    };
    expect(mapQuizAnswersToStyle(answers)).toBe(mapQuizAnswersToStyle({ ...answers }));
    // The one documented area-sensitive branch: partner + ain diab → sunset-plan.
    expect(mapQuizAnswersToStyle(answers)).toBe("sunset-plan");
  });
});
