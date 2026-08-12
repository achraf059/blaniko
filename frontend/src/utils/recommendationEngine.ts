// Pure recommendation engine extracted from PlanPage.tsx.
//
// This module holds ONLY the recommendation behavior and data structures — no
// React state, no URL/searchParams, no localStorage, no window, and no i18n
// display copy. UI concerns (role-hint labels, plan-style display strings,
// narrative text, persistence) remain in PlanPage.tsx / the i18n layer.
//
// Behavior is a byte-for-byte move of the previous inline PlanPage logic:
// every weight, the stableHash tie-break, the MAIN category constraint, and the
// sequential START → MAIN → FINISH selection are preserved exactly.

import { type Venue } from "../data/mockData";
import {
  categorySupportsMood,
  venueMatchesMood,
  type DiscoveryCompanion,
  type DiscoveryMood,
} from "./discoveryInsights";
import { type QuizAnswers } from "../hooks/recommendationState";

// ─── Shared plan-style identifiers / stop roles ────────────────────────────────

export type PlanStyleId =
  | "date-night"
  | "friends-hangout"
  | "chill-solo-reset"
  | "under-100-mad"
  | "sunset-plan"
  | "family-afternoon";

export type StopRoleKey = "start" | "main" | "end";

export const stopRoleOrder: StopRoleKey[] = ["start", "main", "end"];

// Structural view of a plan style — only the scoring-relevant fields the engine
// reads. PlanPage's fuller PlanStyleConfig (which also carries UI copy) is
// structurally assignable to this, so no copy needs to enter the engine.
export type RecommendationStyle = {
  id: PlanStyleId;
  roleCategories: {
    start: string[];
    main: string[];
    end: string[];
  };
  categoryBoosts?: string[];
  keywordBoosts?: string[];
  weighting?: {
    mood: number;
    budget: number;
    area: number;
  };
};

export type ScoredVenue = { venue: Venue; score: number };

// A slot selection without any UI copy. PlanPage attaches localized role/roleHint
// strings when converting these into rendered OutingStops.
export type EngineStop = { roleKey: StopRoleKey; venue: Venue };

// ─── Companion free-text keyword map ───────────────────────────────────────────

export const companionKeywordMap: Record<DiscoveryCompanion, string[]> = {
  alone: ["solo", "freelancer", "remote", "professional", "quiet"],
  friends: ["friends", "groups", "students", "social", "gamers"],
  family: ["family", "parents", "children", "kids", "safe"],
  partner: ["couples", "romantic", "intimate", "date"],
};

// ─── Recommendation V2: structured-first companion / mood matching ──────────────
//
// Smallest high-confidence structured mappings from the V3 audit. Each quiz
// companion maps to exactly one canonical `audienceTags` value; each mapped mood
// maps to a small set of canonical `atmosphereTags` values. These replace (do not
// stack with) the equivalent legacy free-text signal when the structured field is
// present — see venueMatchesCompanion / venueMatchesRecommendationMood.
//
// Deliberately conservative: no Children/Teenagers/Young Adults/Parents on
// companions, and no `romantic` mood mapping (no safe literal "Romantic"
// atmosphere tag exists — romantic stays on the legacy path).

const companionAudienceTagMap: Record<DiscoveryCompanion, string> = {
  friends: "Friends / Groups",
  partner: "Couples",
  alone: "Solo Visitors",
  family: "Families",
};

const moodAtmosphereTagMap: Partial<Record<DiscoveryMood, string[]>> = {
  social: ["Social", "Lively"],
  chill: ["Relaxed", "Quiet", "Cozy"],
  active: ["Sport-Focused", "Energetic", "Competitive", "Adventurous"],
  "family-friendly": ["Family-Friendly", "Playful", "Colorful"],
  // romantic: intentionally omitted — no safe structured mapping (legacy fallback).
};

// Minimal safe tag comparison: trim + case-insensitive only. No fuzzy/semantic
// normalization, no synonym inference, no translation.
function normalizeRecommendationTag(tag: string): string {
  return tag.trim().toLowerCase();
}

// Companion fit as a single capped signal.
// Structured-first: when the venue has usable audienceTags, the result is decided
// purely by the mapped structured tag (the legacy free-text keywords are NOT also
// evaluated — no double counting). Legacy free-text is used only when audienceTags
// is absent/empty.
export function venueMatchesCompanion(
  venue: Venue,
  companion: DiscoveryCompanion,
): boolean {
  const tags = venue.audienceTags;
  if (Array.isArray(tags) && tags.length > 0) {
    const target = normalizeRecommendationTag(companionAudienceTagMap[companion]);
    return tags.some((tag) => normalizeRecommendationTag(tag) === target);
  }

  // Fallback: legacy companion free-text keyword match (unchanged).
  const keywords = companionKeywordMap[companion];
  const audienceText =
    `${venue.audience ?? ""} ${venue.description}`.toLowerCase();
  return keywords.some((keyword) => audienceText.includes(keyword));
}

// Venue mood fit as a single capped signal, mirroring venueMatchesMood's shape.
// Structured-first: for a mood with a safe atmosphere mapping AND a venue that has
// usable atmosphereTags, the noisy venue-specific free-text evidence is replaced by
// structured atmosphere evidence. The category-level assumption
// (categorySupportsMood) is preserved unchanged in every branch. Moods without a
// mapping (romantic) or venues without atmosphereTags fall back to legacy
// venueMatchesMood exactly.
export function venueMatchesRecommendationMood(
  venue: Venue,
  mood?: DiscoveryMood,
): boolean {
  if (!mood) {
    return true;
  }

  const mapped = moodAtmosphereTagMap[mood];
  const tags = venue.atmosphereTags;
  if (mapped && Array.isArray(tags) && tags.length > 0) {
    const targets = mapped.map(normalizeRecommendationTag);
    const structuredMatch = tags.some((tag) =>
      targets.includes(normalizeRecommendationTag(tag)),
    );
    // Structured venue evidence OR the (preserved) category-level mood support.
    return structuredMatch || categorySupportsMood(venue.categorySlug, mood);
  }

  // Fallback: legacy free-text + category mood match (unchanged).
  return venueMatchesMood(venue, mood);
}

// Dead fallback preserved from PlanPage: every plan style already defines
// roleCategories, so this mood-based fallback never actually runs — kept verbatim
// so extraction changes no behavior.
export function createRoleCategoryPreferences(mood?: DiscoveryMood): {
  start: string[];
  main: string[];
  end: string[];
} {
  switch (mood) {
    case "active":
      return {
        start: ["outdoor", "activities"],
        main: ["sports", "activities", "outdoor"],
        end: ["outdoor", "activities", "sports"],
      };
    case "romantic":
      return {
        start: ["outdoor", "activities"],
        main: ["outdoor", "activities"],
        end: ["outdoor", "activities"],
      };
    case "family-friendly":
      return {
        start: ["family", "activities"],
        main: ["family", "activities", "outdoor"],
        end: ["family", "outdoor", "activities"],
      };
    case "social":
      return {
        start: ["gaming", "activities", "sports"],
        main: ["gaming", "activities", "sports"],
        end: ["outdoor", "activities", "sports"],
      };
    default:
      return {
        start: ["outdoor", "activities"],
        main: ["activities", "sports", "outdoor"],
        end: ["outdoor", "activities", "sports"],
      };
  }
}

// ─── Base scoring ──────────────────────────────────────────────────────────────

export function rankVenue(
  venue: Venue,
  options: {
    companion?: DiscoveryCompanion;
    mood?: DiscoveryMood;
    style?: RecommendationStyle;
  },
): number {
  let score = 0;
  const styleWeighting = options.style?.weighting;
  const moodWeight = styleWeighting?.mood ?? 1;

  // V3 price safety: budget scoring disabled until verified prices exist.
  score += 1;

  // V3 area safety: neighborhood-level area scoring is disabled until verified venue
  // neighborhoods exist. Every V3 venue resolves to "Casablanca", so this boost could
  // never differentiate real areas (Maârif / Ain Diab / …) and choosing an area does
  // not change ranking.

  // Mood: structured-first (atmosphereTags) with legacy free-text fallback.
  // Same magnitude and single capped contribution as before.
  if (options.mood && venueMatchesRecommendationMood(venue, options.mood)) {
    score += 3 * moodWeight;
  }

  // Companion: structured-first (audienceTags) with legacy free-text fallback.
  // Same +2 magnitude, single capped contribution (no per-tag stacking).
  if (options.companion && venueMatchesCompanion(venue, options.companion)) {
    score += 2;
  }

  const style = options.style;
  if (style) {
    if (style.categoryBoosts?.includes(venue.categorySlug)) {
      score += 2;
    }

    // V3 price safety: preferredPriceLevels disabled until verified prices exist.
    // V3 area safety: preferredAreas bonuses disabled until verified venue neighborhoods exist.

    if (style.keywordBoosts?.length) {
      const text =
        `${venue.audience ?? ""} ${venue.vibe ?? ""} ${venue.description}`.toLowerCase();
      if (
        style.keywordBoosts.some((keyword) =>
          text.includes(keyword.toLowerCase()),
        )
      ) {
        score += 2;
      }
    }
  }

  return Math.round(score * 100) / 100;
}

export function stableHash(input: string): number {
  return [...input].reduce(
    (accumulator, char) => accumulator + char.charCodeAt(0),
    0,
  );
}

// ─── Role scoring ──────────────────────────────────────────────────────────────

export function rankVenueForRole(
  venue: Venue,
  role: StopRoleKey,
  preferredCategories: string[],
  baseScore: number,
  options: {
    style: RecommendationStyle;
    mood?: DiscoveryMood;
    selectedCategory?: string;
  },
): number {
  let score = baseScore;

  if (preferredCategories.includes(venue.categorySlug)) {
    score += role === "main" ? 5 : 4;
  }

  if (options.style.categoryBoosts?.includes(venue.categorySlug)) {
    score += role === "main" ? 3 : 2;
  }

  // MAIN mood: same structured-first decision as the base score, same +2.
  if (
    role === "main" &&
    options.mood &&
    venueMatchesRecommendationMood(venue, options.mood)
  ) {
    score += 2;
  }

  // The user's explicit "Looking for" category acts as a small tie-break preference on
  // the start/end stops (the main stop is already hard-constrained to it during picking).
  // +0.5 is deliberately smaller than any role bonus (role match = +4/+5, categoryBoost
  // = +2/+3), so it only decides between otherwise-tied candidates and never overrides a
  // genuinely more role-appropriate venue — preserving 3-stop variety.
  if (
    options.selectedCategory &&
    options.selectedCategory !== "any" &&
    venue.categorySlug === options.selectedCategory
  ) {
    score += 0.5;
  }

  // V3 price safety: budgetStrict penalty disabled until verified prices exist.

  return score;
}

// ─── MAIN category constraint ──────────────────────────────────────────────────

// Enforces the product rule: the MAIN stop is hard-constrained to the user's explicit
// "Looking for" category — but only when that category actually has an eligible
// (still-available) venue. If none remain (or no category was selected), it returns the
// full pool so the main stop falls back to the existing unrestricted logic. START/END are
// never hard-constrained here, preserving 3-stop variety.
export function applyMainCategoryConstraint<T extends { venue: Venue }>(
  role: StopRoleKey,
  pool: T[],
  selectedCategory: string,
): T[] {
  if (role !== "main" || selectedCategory === "any") {
    return pool;
  }
  const eligible = pool.filter(
    (item) => item.venue.categorySlug === selectedCategory,
  );
  return eligible.length > 0 ? eligible : pool;
}

// ─── Quiz answers → plan style ─────────────────────────────────────────────────

// Maps the quiz answers from OutingQuiz onto a PlanStyleId.
// Priority: specific companion+area combos → companion → default.
export function mapQuizAnswersToStyle(answers: QuizAnswers): PlanStyleId {
  const { companion, category, area, vibe } = answers;

  // Partner in Ain Diab → sunset coastal route
  if (companion === "partner" && area === "ain diab") return "sunset-plan";
  // Partner elsewhere → date night
  if (companion === "partner" || vibe === "romantic") return "date-night";
  // Family companion or family category
  if (companion === "family" || category === "family") return "family-afternoon";
  // Solo
  if (companion === "alone") return "chill-solo-reset";
  // V3 price safety: budget-first style disabled until verified prices exist.
  // Friends + sports/gaming → friends hangout (default social)
  return "friends-hangout";
}

// ─── Seeded scoring ────────────────────────────────────────────────────────────

export function scoreVenuesWithSeed(
  venues: Venue[],
  seed: number,
  context: {
    companion?: DiscoveryCompanion;
    mood?: DiscoveryMood;
    style?: RecommendationStyle;
  },
): ScoredVenue[] {
  return venues
    .map((venue) => ({
      venue,
      score: rankVenue(venue, {
        companion: context.companion,
        mood: context.mood,
        style: context.style,
      }),
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return (
        ((stableHash(second.venue.slug) + seed) % 11) -
        ((stableHash(first.venue.slug) + seed) % 11)
      );
    });
}

// ─── Initial START → MAIN → FINISH selection ───────────────────────────────────

// Sequential greedy selection mirroring PlanPage's original pickVenue loop.
// Consumes used slugs + categories across the three slots in order.
export function buildInitialSelection(options: {
  scoredVenues: ScoredVenue[];
  rolePreferences: { start: string[]; main: string[]; end: string[] };
  style: RecommendationStyle;
  mood?: DiscoveryMood;
  selectedCategory: string;
}): EngineStop[] {
  const { scoredVenues, rolePreferences, style, mood, selectedCategory } =
    options;
  const used = new Set<string>();
  const usedCategories = new Set<string>();

  const pickVenue = (
    role: StopRoleKey,
    preferredCategories: string[],
  ): Venue | undefined => {
    const available = scoredVenues.filter(({ venue }) => !used.has(venue.slug));
    // MAIN stop: restrict to the explicit category when it has eligible venues.
    const pool = applyMainCategoryConstraint(role, available, selectedCategory);
    const ranked = pool
      .map(({ venue, score }) => ({
        venue,
        roleScore: rankVenueForRole(venue, role, preferredCategories, score, {
          style,
          mood,
          selectedCategory,
        }),
        hasCategoryDuplication: usedCategories.has(venue.categorySlug),
      }))
      .sort((first, second) => {
        if (second.roleScore !== first.roleScore) {
          return second.roleScore - first.roleScore;
        }

        if (first.hasCategoryDuplication !== second.hasCategoryDuplication) {
          return first.hasCategoryDuplication ? 1 : -1;
        }

        return 0;
      });

    const best = ranked[0];
    if (!best) {
      return undefined;
    }

    used.add(best.venue.slug);
    usedCategories.add(best.venue.categorySlug);
    return best.venue;
  };

  const start = pickVenue("start", rolePreferences.start);
  const main = pickVenue("main", rolePreferences.main);
  const end = pickVenue("end", rolePreferences.end);

  const selection: EngineStop[] = [];
  if (start) selection.push({ roleKey: "start", venue: start });
  if (main) selection.push({ roleKey: "main", venue: main });
  if (end) selection.push({ roleKey: "end", venue: end });
  return selection;
}

// ─── Lock / replace / shuffle refinement ───────────────────────────────────────

// Pure port of PlanPage's buildRefinedStops. Operates on an EngineStop[] base
// selection (locked / replace semantics unchanged) and returns an EngineStop[];
// PlanPage re-attaches localized copy afterwards. Only venue identity is
// observable downstream (the URL persists slugs), so dropping copy here changes
// no behavior.
export function buildRefinedSelection(options: {
  rankedVenues: ScoredVenue[];
  baseSelection: EngineStop[];
  locked: StopRoleKey[];
  replaceRole?: StopRoleKey;
  rolePreferences: { start: string[]; main: string[]; end: string[] };
  style: RecommendationStyle;
  mood?: DiscoveryMood;
  selectedCategory: string;
}): EngineStop[] {
  const {
    rankedVenues,
    baseSelection,
    locked,
    replaceRole,
    rolePreferences,
    style,
    mood,
    selectedCategory,
  } = options;

  const usedSlugs = new Set<string>();
  const usedCategories = new Set<string>();
  const output: Array<EngineStop | undefined> = new Array(
    baseSelection.length,
  ).fill(undefined);
  const lockedSet = new Set(locked);

  baseSelection.forEach((stop, index) => {
    const roleKey = stopRoleOrder[Math.min(index, stopRoleOrder.length - 1)];
    const keepExisting =
      lockedSet.has(roleKey) ||
      (replaceRole !== undefined && replaceRole !== roleKey);

    if (!keepExisting) {
      return;
    }

    output[index] = stop;
    usedSlugs.add(stop.venue.slug);
    usedCategories.add(stop.venue.categorySlug);
  });

  baseSelection.forEach((existingStop, index) => {
    if (output[index]) {
      return;
    }

    const roleKey = stopRoleOrder[Math.min(index, stopRoleOrder.length - 1)];
    const preferredCategories = rolePreferences[roleKey];
    const avoidSlug =
      replaceRole === roleKey ? existingStop.venue.slug : undefined;

    const availableCandidates = rankedVenues.filter(
      ({ venue }) => !usedSlugs.has(venue.slug) && venue.slug !== avoidSlug,
    );
    // MAIN stop keeps the explicit-category constraint through refinement/shuffle too.
    const candidatePool = applyMainCategoryConstraint(
      roleKey,
      availableCandidates,
      selectedCategory,
    );
    const rankedCandidates = candidatePool
      .map(({ venue, score }) => ({
        venue,
        roleScore: rankVenueForRole(venue, roleKey, preferredCategories, score, {
          style,
          mood,
          selectedCategory,
        }),
        hasCategoryDuplication: usedCategories.has(venue.categorySlug),
      }))
      .sort((first, second) => {
        if (second.roleScore !== first.roleScore) {
          return second.roleScore - first.roleScore;
        }

        if (first.hasCategoryDuplication !== second.hasCategoryDuplication) {
          return first.hasCategoryDuplication ? 1 : -1;
        }

        return 0;
      });

    const picked = rankedCandidates[0]?.venue;

    if (!picked) {
      output[index] = existingStop;
      usedSlugs.add(existingStop.venue.slug);
      usedCategories.add(existingStop.venue.categorySlug);
      return;
    }

    output[index] = { roleKey, venue: picked };
    usedSlugs.add(picked.slug);
    usedCategories.add(picked.categorySlug);
  });

  return output.filter((stop): stop is EngineStop => Boolean(stop));
}
