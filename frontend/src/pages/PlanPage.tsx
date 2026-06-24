import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { FilterChips } from "../components/discovery/FilterChips";
import { HomeHeader } from "../components/home/HomeHeader";
import { type Venue } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import type { AppLanguage } from "../i18n/types";
import { formatFlowText, getFlowTexts, getPlanStyleDisplay } from "../i18n/flowTexts";
import {
  getDiscoveryCompanionLabel,
  getDiscoveryMoodLabel,
  isDiscoveryMood,
  type DiscoveryCompanion,
  type DiscoveryMood,
  venueMatchesMood,
} from "../utils/discoveryInsights";
import { getBestForBadges } from "../utils/venuePersonality";
import { VenueImage } from "../components/home/VenueImage";
import { getVenueImageSrc } from "../utils/venueImage";
import "./PlanPage.css";

type OutingStop = {
  role: string;
  roleHint: string;
  venue: Venue;
};

type SavedOutingStop = {
  role: string;
  roleHint: string;
  slug: string;
  name: string;
  area: string;
  category: string;
};

type SavedOuting = {
  id: string;
  title: string;
  summary: string;
  planStyle?: string;
  area: string;
  budget: string;
  withWho: string;
  mood: string;
  lockedRoles?: StopRoleKey[];
  stops: SavedOutingStop[];
  createdAt: string;
};

type StopRoleKey = "start" | "main" | "end";

const stopRoleOrder: StopRoleKey[] = ["start", "main", "end"];

const SAVED_OUTINGS_KEY = "blaniko_saved_outings_v1";

const companionOptions = [
  { value: "alone", label: "Alone" },
  { value: "friends", label: "Friends" },
  { value: "family", label: "Family" },
  { value: "partner", label: "Partner" },
];

const moodOptions = [
  { value: "chill", label: "Chill" },
  { value: "social", label: "Social" },
  { value: "active", label: "Active" },
  { value: "romantic", label: "Romantic" },
  { value: "family-friendly", label: "Family-friendly" },
];

const budgetOptions = [
  { value: "all", label: "All" },
  { value: "$", label: "$" },
  { value: "$$", label: "$$" },
  { value: "$$$", label: "$$$" },
];

const areaOptions = [
  { value: "any", label: "Any area" },
  { value: "maarif", label: "Maarif" },
  { value: "gauthier", label: "Gauthier" },
  { value: "ain diab", label: "Ain Diab" },
  { value: "racine", label: "Racine" },
  { value: "anfa", label: "Anfa" },
  { value: "old medina", label: "Old Medina" },
  { value: "marina", label: "Marina" },
  { value: "bourgogne", label: "Bourgogne" },
];

type PlanStyleId =
  | "date-night"
  | "friends-hangout"
  | "chill-solo-reset"
  | "under-100-mad"
  | "sunset-plan"
  | "family-afternoon";

type PlanStyleConfig = {
  id: PlanStyleId;
  label: string;
  subtitle: string;
  vibeLine: string;
  defaults: {
    withWho: string;
    mood: string;
    budget: string;
    area: string;
  };
  roleCategories: {
    start: string[];
    main: string[];
    end: string[];
  };
  roleHints: {
    start: string;
    main: string;
    end: string;
  };
  categoryBoosts?: string[];
  keywordBoosts?: string[];
  preferredPriceLevels?: string[];
  preferredAreas?: string[];
  weighting?: {
    mood: number;
    budget: number;
    area: number;
  };
  budgetStrict?: boolean;
  explanationChips?: string[];
  summaryTone: {
    pace: string;
    moment: string;
  };
  resultSubtitle: string;
};

const planStyleOptions: PlanStyleConfig[] = [
  {
    id: "date-night",
    label: "Date night",
    subtitle: "Soft pace, romantic vibe, intimate stops.",
    vibeLine: "Intentional romance",
    defaults: {
      withWho: "partner",
      mood: "romantic",
      budget: "$$$",
      area: "racine",
    },
    roleCategories: {
      start: ["outdoor", "activities"],
      main: ["activities", "outdoor"],
      end: ["outdoor", "activities"],
    },
    roleHints: {
      start: "Warm connection",
      main: "Signature shared moment",
      end: "Soft afterglow",
    },
    categoryBoosts: ["outdoor", "activities"],
    keywordBoosts: ["romantic", "intimate", "couples"],
    preferredPriceLevels: ["$$", "$$$"],
    weighting: { mood: 1.5, budget: 1.2, area: 1 },
    explanationChips: ["Romantic pacing", "Intimate-friendly picks"],
    summaryTone: { pace: "relaxed evening", moment: "cozy" },
    resultSubtitle:
      "Sequenced for chemistry: gentle opener, romantic highlight, easy finish.",
  },
  {
    id: "friends-hangout",
    label: "Friends hangout",
    subtitle: "Social energy with easy group flow.",
    vibeLine: "Group energy",
    defaults: {
      withWho: "friends",
      mood: "social",
      budget: "$$",
      area: "maarif",
    },
    roleCategories: {
      start: ["gaming", "activities", "sports"],
      main: ["gaming", "sports", "activities"],
      end: ["outdoor", "activities", "sports"],
    },
    roleHints: {
      start: "Group warm-up",
      main: "Social peak",
      end: "Easy follow-up",
    },
    categoryBoosts: ["gaming", "sports", "activities"],
    keywordBoosts: ["friends", "groups", "social"],
    preferredPriceLevels: ["$", "$$"],
    weighting: { mood: 1.3, budget: 1.15, area: 1 },
    explanationChips: ["Group-friendly categories", "Easy social transitions"],
    summaryTone: { pace: "social city run", moment: "lively" },
    resultSubtitle:
      "Built for groups: quick start, high-energy main stop, then a no-stress wrap-up.",
  },
  {
    id: "chill-solo-reset",
    label: "Chill solo reset",
    subtitle: "Quiet, low-pressure flow for one.",
    vibeLine: "Low-noise reset",
    defaults: { withWho: "alone", mood: "chill", budget: "$$", area: "any" },
    roleCategories: {
      start: ["outdoor", "activities"],
      main: ["outdoor", "activities"],
      end: ["outdoor", "activities"],
    },
    roleHints: {
      start: "Slow start",
      main: "Reset block",
      end: "Gentle close",
    },
    categoryBoosts: ["outdoor", "activities"],
    keywordBoosts: ["quiet", "focused", "calm", "solo", "remote"],
    preferredPriceLevels: ["$", "$$"],
    weighting: { mood: 1.4, budget: 1.1, area: 0.95 },
    explanationChips: ["Quiet-first spots", "Low-pressure flow"],
    summaryTone: { pace: "quiet reset", moment: "calm" },
    resultSubtitle:
      "A minimal plan: quiet opener, focused center, and a soft close.",
  },
  {
    id: "under-100-mad",
    label: "Under 100 MAD",
    subtitle: "Budget-first without losing quality.",
    vibeLine: "Value mode",
    defaults: { withWho: "friends", mood: "social", budget: "$", area: "any" },
    roleCategories: {
      start: ["outdoor", "activities"],
      main: ["activities", "outdoor", "family"],
      end: ["outdoor", "activities", "sports"],
    },
    roleHints: {
      start: "Low-cost warm-up",
      main: "Value highlight",
      end: "Budget-friendly finish",
    },
    preferredPriceLevels: ["$"],
    categoryBoosts: ["outdoor", "activities"],
    weighting: { mood: 1.1, budget: 1.8, area: 0.9 },
    budgetStrict: true,
    explanationChips: ["Price-sensitive picks", "Repeatable low-cost route"],
    summaryTone: { pace: "budget-friendly afternoon", moment: "practical" },
    resultSubtitle:
      "Value-first sequencing with simple, repeatable city stops.",
  },
  {
    id: "sunset-plan",
    label: "Sunset plan",
    subtitle: "Golden-hour route with coastal energy.",
    vibeLine: "Golden-hour flow",
    defaults: {
      withWho: "partner",
      mood: "romantic",
      budget: "$$",
      area: "ain diab",
    },
    roleCategories: {
      start: ["outdoor", "activities"],
      main: ["outdoor", "activities", "sports"],
      end: ["outdoor", "activities"],
    },
    roleHints: {
      start: "Golden-hour start",
      main: "Sunset main stop",
      end: "Night glide",
    },
    categoryBoosts: ["outdoor", "activities"],
    keywordBoosts: ["sunset", "coastal", "sea", "scenic"],
    preferredAreas: ["ain diab", "marina"],
    preferredPriceLevels: ["$", "$$"],
    weighting: { mood: 1.3, budget: 1.05, area: 1.4 },
    explanationChips: ["Sunset-friendly areas", "Scenic sequence"],
    summaryTone: { pace: "sunset route", moment: "scenic" },
    resultSubtitle:
      "Timed for golden hour: coastal opener, view-heavy middle, smooth evening end.",
  },
  {
    id: "family-afternoon",
    label: "Family afternoon",
    subtitle: "Kid-friendly rhythm with easy logistics.",
    vibeLine: "Family comfort",
    defaults: {
      withWho: "family",
      mood: "family-friendly",
      budget: "$$",
      area: "anfa",
    },
    roleCategories: {
      start: ["family", "activities"],
      main: ["family", "activities", "outdoor"],
      end: ["family", "outdoor", "activities"],
    },
    roleHints: {
      start: "Easy start",
      main: "Family highlight",
      end: "Calm close",
    },
    categoryBoosts: ["family", "activities", "outdoor"],
    keywordBoosts: ["family", "children", "kids", "safe", "parents"],
    preferredPriceLevels: ["$", "$$"],
    weighting: { mood: 1.35, budget: 1.15, area: 1.05 },
    explanationChips: ["Kid-friendly bias", "Low-friction transitions"],
    summaryTone: { pace: "family-friendly afternoon", moment: "comfortable" },
    resultSubtitle:
      "Structured for families: low-friction start, kid-friendly core, calm finish.",
  },
];

const defaultPlanStyleId: PlanStyleId = "friends-hangout";

const companionKeywordMap: Record<DiscoveryCompanion, string[]> = {
  alone: ["solo", "freelancer", "remote", "professional", "quiet"],
  friends: ["friends", "groups", "students", "social", "gamers"],
  family: ["family", "parents", "children", "kids", "safe"],
  partner: ["couples", "romantic", "intimate", "date"],
};

function createRoleCategoryPreferences(mood?: DiscoveryMood): {
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

function createRoleHints(
  language: AppLanguage,
  mood?: DiscoveryMood,
): {
  start: string;
  main: string;
  end: string;
} {
  const text = getFlowTexts(language);
  const hints = text.planPage.moodRoleHints;
  const key = (mood ?? "default") as keyof typeof hints;
  return hints[key] ?? hints.default;
}

function rankVenue(
  venue: Venue,
  options: {
    companion?: DiscoveryCompanion;
    mood?: DiscoveryMood;
    budget: string;
    area: string;
    style?: PlanStyleConfig;
  },
): number {
  let score = 0;
  const styleWeighting = options.style?.weighting;
  const budgetWeight = styleWeighting?.budget ?? 1;
  const moodWeight = styleWeighting?.mood ?? 1;
  const areaWeight = styleWeighting?.area ?? 1;

  if (options.budget === "all") {
    score += 1;
  } else if (venue.priceLevel === options.budget) {
    score += 3 * budgetWeight;
  } else if (
    options.style?.budgetStrict &&
    options.budget === "$" &&
    venue.priceLevel !== "$"
  ) {
    score -= 4;
  }

  if (
    options.area !== "any" &&
    venue.area.toLowerCase().includes(options.area)
  ) {
    score += 3 * areaWeight;
  }

  if (options.mood && venueMatchesMood(venue, options.mood)) {
    score += 3 * moodWeight;
  }

  if (options.companion) {
    const keywords = companionKeywordMap[options.companion];
    const audienceText =
      `${venue.audience ?? ""} ${venue.description}`.toLowerCase();

    if (keywords.some((keyword) => audienceText.includes(keyword))) {
      score += 2;
    }
  }

  const style = options.style;
  if (style) {
    if (style.categoryBoosts?.includes(venue.categorySlug)) {
      score += 2;
    }

    if (style.preferredPriceLevels?.includes(venue.priceLevel ?? "")) {
      score += 2;
    }

    if (
      style.preferredAreas?.some((preferredArea) =>
        venue.area.toLowerCase().includes(preferredArea.toLowerCase()),
      )
    ) {
      score += 2;
    }

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

function stableHash(input: string): number {
  return [...input].reduce(
    (accumulator, char) => accumulator + char.charCodeAt(0),
    0,
  );
}

function parseCompanion(value: string | null): string {
  return companionOptions.some((option) => option.value === value)
    ? (value as string)
    : "friends";
}

function parseMood(value: string | null): string {
  return moodOptions.some((option) => option.value === value)
    ? (value as string)
    : "social";
}

function parseBudget(value: string | null): string {
  return budgetOptions.some((option) => option.value === value)
    ? (value as string)
    : "$$";
}

function parseArea(value: string | null): string {
  return areaOptions.some((option) => option.value === value)
    ? (value as string)
    : "any";
}

function parsePlanStyle(value: string | null): PlanStyleId {
  return planStyleOptions.some((style) => style.id === value)
    ? (value as PlanStyleId)
    : defaultPlanStyleId;
}

function parseSeed(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function parseLockedRoles(value: string | null): StopRoleKey[] {
  if (!value) {
    return [];
  }

  const output: StopRoleKey[] = [];

  value
    .split(",")
    .map((item) => item.trim())
    .forEach((item) => {
      if (
        (item === "start" || item === "main" || item === "end") &&
        !output.includes(item)
      ) {
        output.push(item);
      }
    });

  return output;
}

function buildPlanUrl(options: {
  withWho: string;
  mood: string;
  budget: string;
  area: string;
  style: string;
  seed: number;
  stopSlugs: string[];
  lockedRoles?: StopRoleKey[];
}): string {
  const params = new URLSearchParams();
  params.set("with", options.withWho);
  params.set("mood", options.mood);
  params.set("budget", options.budget);
  params.set("area", options.area);
  params.set("style", options.style);
  params.set("seed", String(options.seed));

  if (options.stopSlugs.length > 0) {
    params.set("stops", options.stopSlugs.join(","));
  }

  if (options.lockedRoles && options.lockedRoles.length > 0) {
    params.set("locks", options.lockedRoles.join(","));
  }

  return `/plan?${params.toString()}`;
}

function getPlanStyleById(id: PlanStyleId): PlanStyleConfig {
  return (
    planStyleOptions.find((style) => style.id === id) ?? planStyleOptions[0]
  );
}

function buildOutingNarrative(options: {
  style: PlanStyleConfig;
  areaLabel: string;
  budget: string;
  companionLabel: string;
  stops: OutingStop[];
  language: AppLanguage;
}): string {
  const text = getFlowTexts(options.language);
  const display = getPlanStyleDisplay(options.language, options.style.id);
  const budgetMap = text.planPage.budgetText;
  const budgetKey = options.budget as keyof typeof budgetMap;
  const budgetText = budgetMap[budgetKey] ?? budgetMap.default;

  const startHint = options.stops[0]?.roleHint.toLowerCase() ?? display.roleHints.start.toLowerCase();
  const mainHint = options.stops[1]?.roleHint.toLowerCase() ?? display.roleHints.main.toLowerCase();
  const endHint = options.stops[2]?.roleHint.toLowerCase() ?? display.roleHints.end.toLowerCase();

  if (options.stops.length >= 3) {
    return formatFlowText(text.planPage.narrative3Stops, {
      pace: display.summaryTone.pace,
      area: options.areaLabel,
      companion: options.companionLabel.toLowerCase(),
      start: startHint,
      main: mainHint,
      end: endHint,
      budget: budgetText,
    });
  }

  if (options.stops.length === 2) {
    return formatFlowText(text.planPage.narrative2Stops, {
      pace: display.summaryTone.pace,
      area: options.areaLabel,
      companion: options.companionLabel.toLowerCase(),
      start: startHint,
      main: mainHint,
      budget: budgetText,
    });
  }

  return formatFlowText(text.planPage.narrative1Stop, {
    pace: display.summaryTone.pace,
    area: options.areaLabel,
    companion: options.companionLabel.toLowerCase(),
    moment: display.summaryTone.moment,
    budget: budgetText,
  });
}

function rankVenueForRole(
  venue: Venue,
  role: StopRoleKey,
  preferredCategories: string[],
  baseScore: number,
  options: {
    style: PlanStyleConfig;
    mood?: DiscoveryMood;
    budget: string;
  },
): number {
  let score = baseScore;

  if (preferredCategories.includes(venue.categorySlug)) {
    score += role === "main" ? 5 : 4;
  }

  if (options.style.categoryBoosts?.includes(venue.categorySlug)) {
    score += role === "main" ? 3 : 2;
  }

  if (
    role === "main" &&
    options.mood &&
    venueMatchesMood(venue, options.mood)
  ) {
    score += 2;
  }

  if (
    options.style.budgetStrict &&
    options.budget === "$" &&
    venue.priceLevel !== "$"
  ) {
    score -= role === "main" ? 5 : 3;
  }

  return score;
}

function formatSavedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

export default function PlanPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const moodLabels = getDiscoveryMoodLabel(language);
  const companionLabels = getDiscoveryCompanionLabel(language);
  const location = useLocation();
  const { venues } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { trackActivity } = useRecentActivity();
  const [searchParams, setSearchParams] = useSearchParams();

  const companion = parseCompanion(searchParams.get("with"));
  const mood = parseMood(searchParams.get("mood"));
  const budget = parseBudget(searchParams.get("budget"));
  const area = parseArea(searchParams.get("area"));
  const planStyle = parsePlanStyle(searchParams.get("style"));
  const selectedPlanStyle = getPlanStyleById(planStyle);
  const displayPlanStyle = getPlanStyleDisplay(language, planStyle);
  const displayStyles = planStyleOptions.reduce(
    (acc, style) => {
      acc[style.id] = getPlanStyleDisplay(language, style.id);
      return acc;
    },
    {} as Record<string, ReturnType<typeof getPlanStyleDisplay>>,
  );
  const refreshSeed = parseSeed(searchParams.get("seed"));
  const parsedLockedRoles = parseLockedRoles(searchParams.get("locks"));
  const [shareFeedback, setShareFeedback] = useState<
    "idle" | "copied" | "failed"
  >("idle");
  const [saveFeedback, setSaveFeedback] = useState<"idle" | "saved">("idle");
  const [refineFeedback, setRefineFeedback] = useState<string>("");
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const VIBE_EMOJIS: Record<string, string> = {
    "date-night": "🌙",
    "friends-hangout": "👥",
    "chill-solo-reset": "☁️",
    "under-100-mad": "💰",
    "sunset-plan": "🌅",
    "family-afternoon": "👨‍👩‍👧",
  };
  const [savedOutings, setSavedOutings] = useState<SavedOuting[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(SAVED_OUTINGS_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed as SavedOuting[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SAVED_OUTINGS_KEY,
      JSON.stringify(savedOutings),
    );
  }, [savedOutings]);

  const selectedMood = isDiscoveryMood(mood) ? mood : undefined;
  const selectedCompanion = companionOptions.some(
    (option) => option.value === companion,
  )
    ? (companion as DiscoveryCompanion)
    : undefined;
  const companionFilterOptions = [
    { value: "alone", label: companionLabels.alone },
    { value: "friends", label: companionLabels.friends },
    { value: "family", label: companionLabels.family },
    { value: "partner", label: companionLabels.partner },
  ];
  const moodFilterOptions = [
    { value: "chill", label: moodLabels.chill },
    { value: "social", label: moodLabels.social },
    { value: "active", label: moodLabels.active },
    { value: "romantic", label: moodLabels.romantic },
    { value: "family-friendly", label: moodLabels["family-friendly"] },
  ];
  const budgetFilterOptions = [
    { value: "all", label: text.common.all },
    { value: "$", label: "$" },
    { value: "$$", label: "$$" },
    { value: "$$$", label: "$$$" },
  ];
  const areaFilterOptions = [
    { value: "any", label: text.planPage.areaAny },
    { value: "maarif", label: text.planPage.areaNames.maarif },
    { value: "gauthier", label: text.planPage.areaNames.gauthier },
    { value: "ain diab", label: text.planPage.areaNames["ain diab"] },
    { value: "racine", label: text.planPage.areaNames.racine },
    { value: "anfa", label: text.planPage.areaNames.anfa },
    {
      value: "old medina",
      label: text.planPage.areaNames["old medina"],
    },
    { value: "marina", label: text.planPage.areaNames.marina },
    { value: "bourgogne", label: text.planPage.areaNames.bourgogne },
  ];
  const stopRoleLabel: Record<StopRoleKey, string> = {
    start: text.planPage.startLabel,
    main: text.planPage.mainLabel,
    end: text.planPage.endLabel,
  };
  const stopRoleStage: Record<StopRoleKey, string> = {
    start: text.planPage.startPick,
    main: text.planPage.mainPick,
    end: text.planPage.followUpPick,
  };

  const selectedCompanionName = selectedCompanion
    ? companionLabels[selectedCompanion]
    : companionLabels.friends;

  const rolePreferences =
    selectedPlanStyle.roleCategories ??
    createRoleCategoryPreferences(selectedMood);
  const roleHints =
    displayPlanStyle.roleHints ?? createRoleHints(language, selectedMood);

  const scoreVenuesWithSeed = (seed: number) =>
    venues
      .map((venue) => ({
        venue,
        score: rankVenue(venue, {
          companion: selectedCompanion,
          mood: selectedMood,
          budget,
          area,
          style: selectedPlanStyle,
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

  const scoredVenues = scoreVenuesWithSeed(refreshSeed);

  const buildRefinedStops = (options: {
    rankedVenues: Array<{ venue: Venue; score: number }>;
    baseStops: OutingStop[];
    locked: StopRoleKey[];
    replaceRole?: StopRoleKey;
  }): OutingStop[] => {
    const usedSlugs = new Set<string>();
    const usedCategories = new Set<string>();
    const output: Array<OutingStop | undefined> = new Array(
      options.baseStops.length,
    ).fill(undefined);
    const lockedSet = new Set(options.locked);

    options.baseStops.forEach((stop, index) => {
      const roleKey = stopRoleOrder[Math.min(index, stopRoleOrder.length - 1)];
      const keepExisting =
        lockedSet.has(roleKey) ||
        (options.replaceRole !== undefined && options.replaceRole !== roleKey);

      if (!keepExisting) {
        return;
      }

      output[index] = stop;
      usedSlugs.add(stop.venue.slug);
      usedCategories.add(stop.venue.categorySlug);
    });

    options.baseStops.forEach((existingStop, index) => {
      if (output[index]) {
        return;
      }

      const roleKey = stopRoleOrder[Math.min(index, stopRoleOrder.length - 1)];
      const preferredCategories = rolePreferences[roleKey];
      const avoidSlug =
        options.replaceRole === roleKey ? existingStop.venue.slug : undefined;

      const rankedCandidates = options.rankedVenues
        .filter(
          ({ venue }) => !usedSlugs.has(venue.slug) && venue.slug !== avoidSlug,
        )
        .map(({ venue, score }) => ({
          venue,
          roleScore: rankVenueForRole(
            venue,
            roleKey,
            preferredCategories,
            score,
            {
              style: selectedPlanStyle,
              mood: selectedMood,
              budget,
            },
          ),
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

      output[index] = {
        role: stopRoleLabel[roleKey],
        roleHint: roleHints[roleKey],
        venue: picked,
      };
      usedSlugs.add(picked.slug);
      usedCategories.add(picked.categorySlug);
    });

    return output.filter((stop): stop is OutingStop => Boolean(stop));
  };

  const updatePlannerParams = (overrides: {
    withWho?: string;
    mood?: string;
    budget?: string;
    area?: string;
    style?: string;
    seed?: number;
    stopSlugs?: string[];
    lockedRoles?: StopRoleKey[];
  }) => {
    const withWhoValue = overrides.withWho ?? companion;
    const moodValue = overrides.mood ?? mood;
    const budgetValue = overrides.budget ?? budget;
    const areaValue = overrides.area ?? area;
    const styleValue = overrides.style ?? planStyle;
    const seedValue = overrides.seed ?? refreshSeed;
    const lockedRolesValue = overrides.lockedRoles ?? parsedLockedRoles;

    const nextParams = new URLSearchParams();
    nextParams.set("with", withWhoValue);
    nextParams.set("mood", moodValue);
    nextParams.set("budget", budgetValue);
    nextParams.set("area", areaValue);
    nextParams.set("style", styleValue);
    nextParams.set("seed", String(seedValue));

    if (overrides.stopSlugs && overrides.stopSlugs.length > 0) {
      nextParams.set("stops", overrides.stopSlugs.join(","));
    }

    if (lockedRolesValue.length > 0) {
      nextParams.set("locks", lockedRolesValue.join(","));
    }

    setSearchParams(nextParams, { replace: true });
  };

  const roleHintsForPlan = roleHints;
  const used = new Set<string>();
  const usedCategories = new Set<string>();

  const pickVenue = (role: StopRoleKey, preferredCategories: string[]) => {
    const ranked = scoredVenues
      .filter(({ venue }) => !used.has(venue.slug))
      .map(({ venue, score }) => ({
        venue,
        roleScore: rankVenueForRole(venue, role, preferredCategories, score, {
          style: selectedPlanStyle,
          mood: selectedMood,
          budget,
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

  const planStops: OutingStop[] = [];

  if (start) {
    planStops.push({
      role: stopRoleLabel.start,
      roleHint: roleHintsForPlan.start,
      venue: start,
    });
  }

  if (main) {
    planStops.push({
      role: stopRoleLabel.main,
      roleHint: roleHintsForPlan.main,
      venue: main,
    });
  }

  if (end) {
    planStops.push({
      role: stopRoleLabel.end,
      roleHint: roleHintsForPlan.end,
      venue: end,
    });
  }

  const sharedStopSlugs = (searchParams.get("stops") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const roleHintsForShared = roleHints;
  const roleOrder = [
    { role: stopRoleLabel.start, hint: roleHintsForShared.start },
    { role: stopRoleLabel.main, hint: roleHintsForShared.main },
    { role: stopRoleLabel.end, hint: roleHintsForShared.end },
  ];

  const sharedPlanStops: OutingStop[] = sharedStopSlugs
    .map((slug, index) => {
      const venue = venues.find((item) => item.slug === slug);
      if (!venue) {
        return undefined;
      }

      const fallback = roleOrder[Math.min(index, roleOrder.length - 1)];
      return {
        role: fallback.role,
        roleHint: fallback.hint,
        venue,
      };
    })
    .filter((value): value is OutingStop => value !== undefined);

  const effectivePlanStops =
    sharedPlanStops.length > 0 ? sharedPlanStops : planStops;
  const lockedRoles = parsedLockedRoles;

  // Stable string primitives derived from arrays — used as effect deps instead of
  // the array references themselves (which are reconstructed on every render and
  // would otherwise cause both effects below to fire on every render, creating a
  // cascade: trackActivity → setActivities → re-render → new array ref → repeat).
  const effectiveStopSlugsStr = effectivePlanStops.map((s) => s.venue.slug).join(",");
  const lockedRolesStr = lockedRoles.join(",");

  const applyRefinedPlan = (next: {
    stops: OutingStop[];
    locks: StopRoleKey[];
    seed?: number;
  }) => {
    const nextSeed = next.seed ?? refreshSeed;
    updatePlannerParams({
      seed: nextSeed,
      stopSlugs: next.stops.map((stop) => stop.venue.slug),
      lockedRoles: next.locks,
    });
  };

  const handleToggleStopLock = (roleKey: StopRoleKey) => {
    const nextLocks = lockedRoles.includes(roleKey)
      ? lockedRoles.filter((role) => role !== roleKey)
      : [...lockedRoles, roleKey];

    setRefineFeedback("");
    applyRefinedPlan({ stops: effectivePlanStops, locks: nextLocks });
  };

  const handleReplaceStop = (roleKey: StopRoleKey) => {
    const nextStops = buildRefinedStops({
      rankedVenues: scoredVenues,
      baseStops: effectivePlanStops,
      locked: lockedRoles,
      replaceRole: roleKey,
    });

    const stopIndex = stopRoleOrder.indexOf(roleKey);
    const previousSlug = effectivePlanStops[stopIndex]?.venue.slug;
    const nextSlug = nextStops[stopIndex]?.venue.slug;

    if (!nextSlug || previousSlug === nextSlug) {
      setRefineFeedback(text.planPage.noBetterReplacement);
      return;
    }

    setRefineFeedback(
      formatFlowText(text.planPage.stopUpdated, { stage: stopRoleStage[roleKey] }),
    );
    applyRefinedPlan({ stops: nextStops, locks: lockedRoles });
  };

  const handleRegenerateOuting = () => {
    const nextSeed = refreshSeed + 1;
    const nextRankedVenues = scoreVenuesWithSeed(nextSeed);
    const nextStops = buildRefinedStops({
      rankedVenues: nextRankedVenues,
      baseStops: effectivePlanStops,
      locked: lockedRoles,
    });

    setRefineFeedback(
      lockedRoles.length > 0
        ? text.planPage.refreshedLocked
        : text.planPage.refreshedNew,
    );
    applyRefinedPlan({ stops: nextStops, locks: lockedRoles, seed: nextSeed });
  };

  const selectedAreaLabel =
    areaFilterOptions.find((option) => option.value === area)?.label ?? "Casablanca";
  const planSummary = buildOutingNarrative({
    style: selectedPlanStyle,
    areaLabel: selectedAreaLabel,
    budget,
    companionLabel: selectedCompanionName,
    stops: effectivePlanStops,
    language,
  });

  useEffect(() => {
    if (!effectiveStopSlugsStr) {
      return;
    }

    // Use the slug string directly as the stop signature — it's the same content
    // as the join("-") but reuses the stable primitive we already derived.
    const stopSignature = effectiveStopSlugsStr.replace(/,/g, "-");

    trackActivity({
      id: `${planStyle}:${area}:${mood}:${companion}:${budget}:${stopSignature}`,
      type: "outing",
      title: `${selectedPlanStyle.label} • ${selectedAreaLabel}`,
      href: `${location.pathname}${location.search}`,
    });
  }, [
    area,
    budget,
    companion,
    effectiveStopSlugsStr,
    location.pathname,
    location.search,
    mood,
    planStyle,
    selectedAreaLabel,
    selectedPlanStyle.label,
    trackActivity,
  ]);

  // Sync the URL whenever the derived plan or filters change.
  // Deps use stable string primitives (not array refs) so this only fires when
  // content actually changes — not on every render.
  // searchParams is intentionally excluded: the parsed primitives above already
  // capture any external URL change (browser back/forward), so including
  // searchParams would create a circular: write → searchParams changes → re-fire.
  useEffect(() => {
    const nextParams = new URLSearchParams();
    nextParams.set("with", companion);
    nextParams.set("mood", mood);
    nextParams.set("budget", budget);
    nextParams.set("area", area);
    nextParams.set("style", planStyle);
    nextParams.set("seed", String(refreshSeed));

    if (effectiveStopSlugsStr) {
      nextParams.set("stops", effectiveStopSlugsStr);
    }

    if (lockedRolesStr) {
      nextParams.set("locks", lockedRolesStr);
    }

    setSearchParams(nextParams, { replace: true });
  }, [
    area,
    budget,
    companion,
    effectiveStopSlugsStr,
    lockedRolesStr,
    mood,
    planStyle,
    refreshSeed,
    setSearchParams,
  ]);

  const handleCopyOutingLink = async () => {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}${buildPlanUrl({
              withWho: companion,
              mood,
              budget,
              area,
              style: planStyle,
              seed: refreshSeed,
              stopSlugs: effectivePlanStops.map((stop) => stop.venue.slug),
              lockedRoles,
            })}`
          : buildPlanUrl({
              withWho: companion,
              mood,
              budget,
              area,
              style: planStyle,
              seed: refreshSeed,
              stopSlugs: effectivePlanStops.map((stop) => stop.venue.slug),
              lockedRoles,
            });

      await navigator.clipboard.writeText(url);
      setShareFeedback("copied");
      window.setTimeout(() => setShareFeedback("idle"), 2200);
    } catch {
      setShareFeedback("failed");
      window.setTimeout(() => setShareFeedback("idle"), 2200);
    }
  };

  const handleShareWhatsApp = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${buildPlanUrl({
            withWho: companion,
            mood,
            budget,
            area,
            style: planStyle,
            seed: refreshSeed,
            stopSlugs: effectivePlanStops.map((stop) => stop.venue.slug),
            lockedRoles,
          })}`
        : buildPlanUrl({
            withWho: companion,
            mood,
            budget,
            area,
            style: planStyle,
            seed: refreshSeed,
            stopSlugs: effectivePlanStops.map((stop) => stop.venue.slug),
            lockedRoles,
          });
    const message = formatFlowText(text.planPage.whatsAppMessage, { url });
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleSaveOuting = () => {
    if (effectivePlanStops.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const stopSignature = effectivePlanStops
      .map((stop) => stop.venue.slug)
      .join("-");
    const saved: SavedOuting = {
      id: `${now}-${stopSignature}`,
      title: `${selectedPlanStyle.label} • ${selectedAreaLabel}`,
      summary: planSummary,
      planStyle,
      area,
      budget,
      withWho: companion,
      mood,
      lockedRoles,
      stops: effectivePlanStops.map((stop) => ({
        role: stop.role,
        roleHint: stop.roleHint,
        slug: stop.venue.slug,
        name: stop.venue.name,
        area: stop.venue.area,
        category: stop.venue.category,
      })),
      createdAt: now,
    };

    setSavedOutings((previous) => [saved, ...previous].slice(0, 20));
    setSaveFeedback("saved");
    window.setTimeout(() => setSaveFeedback("idle"), 2200);
  };

  const handleDeleteSavedOuting = (id: string) => {
    setSavedOutings((previous) =>
      previous.filter((outing) => outing.id !== id),
    );
  };

  const buildVenueHref = (slug: string) => {
    const params = new URLSearchParams();
    params.set("from", "plan");
    params.set("with", companion);
    params.set("mood", mood);
    params.set("budget", budget);
    params.set("area", area);
    params.set("style", planStyle);
    return `/venues/${slug}?${params.toString()}`;
  };


  return (
    <div className="bl-plan-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-plan-main">

        {/* ── A. HERO ── */}
        <section className="bl-plan-hero">
          <div className="bl-plan-hero-copy">
            <p className="bl-plan-eyebrow">{text.planPage.eyebrow}</p>
            <h1 className="bl-plan-hero-title">
              {language === "fr"
                ? <>Planifie ta sortie en <em>Casablanca</em></>
                : <>Plan your outing in <em>Casablanca</em></>
              }
            </h1>
            <p className="bl-plan-hero-sub">{text.planPage.heroSubtitle}</p>
            <div className="bl-plan-trust">
              <span className="bl-plan-trust-item">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2 6.5l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {text.planPage.trustRealVenues}
              </span>
              <span className="bl-plan-trust-item">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2 6.5l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {text.planPage.trustLocalPicks}
              </span>
              <span className="bl-plan-trust-item">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2 6.5l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {text.planPage.trustBalancedRoute}
              </span>
            </div>
          </div>
          <div className="bl-plan-hero-art" aria-hidden="true">
            <span className="bl-plan-hero-sky" />
          </div>
        </section>

        {/* ── B. STEP 1: VIBE PICKER ── */}
        <section className="bl-plan-section bl-plan-section--bare">
          <div className="bl-plan-section-head">
            <h2 className="bl-plan-section-title">
              <span className="bl-plan-section-num">1.</span>
              {text.planPage.chooseVibeHeading}
            </h2>
            <p className="bl-plan-section-sub">{text.planPage.vibeSubtitle}</p>
          </div>
          <div className="bl-plan-vibes">
            {planStyleOptions.map((style) => (
              <button
                key={style.id}
                type="button"
                className={`bl-plan-vibe${planStyle === style.id ? " is-active" : ""}`}
                onClick={() =>
                  updatePlannerParams({
                    style: style.id,
                    withWho: style.defaults.withWho,
                    mood: style.defaults.mood,
                    budget: style.defaults.budget,
                    area: style.defaults.area,
                    seed: 0,
                    stopSlugs: [],
                    lockedRoles: [],
                  })
                }
              >
                <span className="bl-plan-vibe-emoji" aria-hidden="true">{VIBE_EMOJIS[style.id]}</span>
                <strong className="bl-plan-vibe-label">{displayStyles[style.id].label}</strong>
                <span className="bl-plan-vibe-sub">{displayStyles[style.id].subtitle}</span>
                <span className="bl-plan-vibe-badge">{displayStyles[style.id].badge}</span>
                <span className="bl-plan-vibe-check" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── C. STEP 2: YOUR PLAN ── */}
        <section className="bl-plan-section bl-plan-section--bare">
          <div className="bl-plan-bar">
            <div className="bl-plan-bar-left">
              <h2 className="bl-plan-section-title">
                <span className="bl-plan-section-num">2.</span>
                {text.planPage.yourPlanHeading}
                <span className="bl-plan-sparkle" aria-hidden="true">✦</span>
              </h2>
              <p className="bl-plan-section-sub">{text.planPage.planSubtitle}</p>
            </div>
            <div className="bl-plan-bar-actions">
              <button
                type="button"
                className="bl-plan-btn bl-plan-btn--ghost"
                onClick={handleRegenerateOuting}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1 6.5a5.5 5.5 0 1 0 5.5-5.5A5.5 5.5 0 0 0 3 3L1 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M1 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {text.planPage.shufflePlan}
              </button>
              <button
                type="button"
                className="bl-plan-btn bl-plan-btn--ghost"
                onClick={handleCopyOutingLink}
              >
                {shareFeedback === "copied" ? text.planPage.linkCopied : text.planPage.copyLink}
              </button>
              <button
                type="button"
                className="bl-plan-btn bl-plan-btn--wa"
                onClick={handleShareWhatsApp}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                {text.planPage.shareWhatsApp}
              </button>
              <button
                type="button"
                className="bl-plan-btn bl-plan-btn--primary"
                onClick={handleSaveOuting}
              >
                {saveFeedback === "saved" ? text.planPage.outingSaved : text.planPage.saveOuting}
              </button>
            </div>
          </div>

          {effectivePlanStops.length > 0 ? (
            <>
              <div className="bl-plan-route">
                {effectivePlanStops.map((stop, index) => {
                  const roleKey = stopRoleOrder[Math.min(index, stopRoleOrder.length - 1)];
                  const isLocked = lockedRoles.includes(roleKey);
                  const isLast = index === effectivePlanStops.length - 1;
                  return (
                    <div key={`${stop.role}-${stop.venue.slug}`} className="bl-plan-stop">
                      <div className="bl-plan-stop-head">
                        <span className="bl-plan-stop-num">{index + 1}</span>
                        <span className="bl-plan-stop-role">{stopRoleLabel[roleKey]}</span>
                        {!isLast && <span className="bl-plan-stop-line" aria-hidden="true" />}
                      </div>
                      <article className={`bl-plan-card${isLocked ? " is-locked" : ""}`}>
                        <div className="bl-plan-card-media">
                          <VenueImage
                            src={getVenueImageSrc(stop.venue)}
                            category={stop.venue.category}
                            categorySlug={stop.venue.categorySlug}
                            name={stop.venue.name}
                            aspectRatio="4 / 3"
                            placeholderStyle="monogram"
                            alt={stop.venue.name}
                          />
                          <span className="bl-plan-card-cat">{stop.venue.category}</span>
                          <button
                            type="button"
                            className={`bl-plan-lock-btn${isLocked ? " is-locked" : ""}`}
                            onClick={() => handleToggleStopLock(roleKey)}
                            aria-label={isLocked ? text.planPage.unlock : text.planPage.lock}
                            title={isLocked ? text.planPage.unlock : text.planPage.lock}
                          >
                            {isLocked ? (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1.5" y="6" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25"/><path d="M4 6V4.5a3 3 0 0 1 6 0V6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1.5" y="6" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25"/><path d="M4 6V4a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                            )}
                          </button>
                        </div>
                        <div className="bl-plan-card-body">
                          <div className="bl-plan-card-meta">
                            <span className="bl-plan-card-role-badge">{stopRoleLabel[roleKey]}</span>
                            {stop.venue.priceLevel ? (
                              <span className="bl-plan-card-price">{stop.venue.priceLevel}</span>
                            ) : null}
                          </div>
                          <h3 className="bl-plan-card-name">{stop.venue.name}</h3>
                          <p className="bl-plan-card-area">
                            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true"><path d="M5 1C2.79 1 1 2.79 1 5c0 3.5 4 7 4 7s4-3.5 4-7c0-2.21-1.79-4-4-4Z" stroke="currentColor" strokeWidth="1.1"/><circle cx="5" cy="5" r="1.3" stroke="currentColor" strokeWidth="1.1"/></svg>
                            {stop.venue.area}
                          </p>
                          <p className="bl-plan-card-desc">
                            {stop.venue.shortDescription ?? stop.venue.description}
                          </p>
                          {getBestForBadges(stop.venue, 3, language).length > 0 ? (
                            <div className="bl-plan-card-tags">
                              {getBestForBadges(stop.venue, 3, language).map((badge, badgeIndex) => (
                                <span key={`${stop.venue.slug}-tag-${badge}-${badgeIndex}`} className="bl-plan-card-tag">
                                  {badge}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {stop.roleHint ? (
                            <p className="bl-plan-card-reason">
                              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M5.5 1l1.08 2.19L9 3.64l-1.75 1.7.41 2.41L5.5 6.57 3.34 7.75l.41-2.41L2 3.64l2.42-.45L5.5 1Z" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round"/></svg>
                              {stop.roleHint}
                            </p>
                          ) : null}
                        </div>
                        <div className="bl-plan-card-foot">
                          <button
                            type="button"
                            className="bl-plan-mini"
                            onClick={() => handleReplaceStop(roleKey)}
                            disabled={isLocked}
                          >
                            {text.planPage.tryAnother}
                          </button>
                          <button
                            type="button"
                            className={`bl-plan-mini bl-plan-mini--heart${isFavorite(stop.venue.slug) ? " is-active" : ""}`}
                            onClick={() => toggleFavorite(stop.venue.slug)}
                            aria-label={isFavorite(stop.venue.slug) ? dictionary.venueCard.removeFavorite : dictionary.venueCard.saveFavorite}
                          >
                            {isFavorite(stop.venue.slug) ? (
                              <svg width="14" height="13" viewBox="0 0 14 13" fill="currentColor" aria-hidden="true"><path d="M7 12S1 8.5 1 4.5A3 3 0 0 1 7 2.5a3 3 0 0 1 6 2c0 4-6 7.5-6 7.5Z"/></svg>
                            ) : (
                              <svg width="14" height="13" viewBox="0 0 14 13" fill="none" aria-hidden="true"><path d="M7 12S1 8.5 1 4.5A3 3 0 0 1 7 2.5a3 3 0 0 1 6 2c0 4-6 7.5-6 7.5Z" stroke="currentColor" strokeWidth="1.2"/></svg>
                            )}
                          </button>
                          <Link
                            to={buildVenueHref(stop.venue.slug)}
                            className="bl-plan-mini bl-plan-mini--cta"
                          >
                            {text.planPage.details} →
                          </Link>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>

              {/* ── Route assurance strip ── */}
              <div className="bl-plan-assure">
                <div className="bl-plan-assure-item">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 2L11.09 6.26L15.73 6.97L12.36 10.25L13.18 14.89L9 12.69L4.82 14.89L5.64 10.25L2.27 6.97L6.91 6.26L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                  <div>
                    <strong>{text.planPage.assureSmartRoute}</strong>
                    <span>{text.planPage.assureSmartRouteDesc}</span>
                  </div>
                </div>
                <div className="bl-plan-assure-item">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.3"/><path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <div>
                    <strong>{text.planPage.assureBalancedPlan}</strong>
                    <span>{text.planPage.assureBalancedPlanDesc}</span>
                  </div>
                </div>
                <div className="bl-plan-assure-item">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 2c-3.87 0-7 3.13-7 7 0 3.87 3.13 7 7 7s7-3.13 7-7c0-3.87-3.13-7-7-7Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 9.5a5.5 5.5 0 0 1-4.55-2.43c.02-1.51 3.04-2.34 4.55-2.34 1.51 0 4.53.83 4.55 2.34A5.5 5.5 0 0 1 9 14Z" fill="currentColor" opacity=".85"/></svg>
                  <div>
                    <strong>{text.planPage.assureMadeForYou}</strong>
                    <span>{text.planPage.assureMadeForYouDesc}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bl-plan-empty">
              <p className="bl-plan-empty-title">{text.planPage.notEnoughTitle}</p>
              <p className="bl-plan-empty-desc">{text.planPage.notEnoughDescription}</p>
            </div>
          )}

          {refineFeedback ? (
            <p className="bl-plan-feedback">{refineFeedback}</p>
          ) : null}
          {shareFeedback === "failed" ? (
            <p className="bl-plan-feedback">{text.planPage.linkCopyFailed}</p>
          ) : null}
        </section>

        {/* ── D. STEP 3: CUSTOMIZE ── */}
        <section className="bl-plan-customize-section">
          <div className="bl-plan-customize-top">
            <div className="bl-plan-bar-left">
              <h2 className="bl-plan-section-title">
                <span className="bl-plan-section-num">3.</span>
                {text.planPage.customizeHeading}
              </h2>
              <p className="bl-plan-section-sub">{text.planPage.customizeSubtitle}</p>
            </div>
            <button
              type="button"
              className={`bl-plan-btn bl-plan-btn--ghost bl-plan-customize-toggle${customizeOpen ? " is-open" : ""}`}
              onClick={() => setCustomizeOpen(!customizeOpen)}
            >
              {customizeOpen ? text.planPage.hideFilters : text.planPage.refine}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="bl-plan-chevron"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className={`bl-plan-customize${customizeOpen ? " is-open" : ""}`}>
            <div className="bl-plan-customize-inner">
              <div className="bl-plan-filter-row">
                <span className="bl-plan-filter-label">{text.planPage.whoWith}</span>
                <FilterChips
                  options={companionFilterOptions}
                  selectedValue={companion}
                  onSelect={(value) =>
                    updatePlannerParams({ withWho: value, seed: 0, stopSlugs: [], lockedRoles: [] })
                  }
                />
              </div>
              <div className="bl-plan-filter-row">
                <span className="bl-plan-filter-label">{text.common.mood}</span>
                <FilterChips
                  options={moodFilterOptions}
                  selectedValue={mood}
                  onSelect={(value) =>
                    updatePlannerParams({ mood: value, seed: 0, stopSlugs: [], lockedRoles: [] })
                  }
                />
              </div>
              <div className="bl-plan-filter-row">
                <span className="bl-plan-filter-label">{dictionary.searchPage.summaryBudget}</span>
                <FilterChips
                  options={budgetFilterOptions}
                  selectedValue={budget}
                  onSelect={(value) =>
                    updatePlannerParams({ budget: value, seed: 0, stopSlugs: [], lockedRoles: [] })
                  }
                />
              </div>
              <div className="bl-plan-filter-row">
                <span className="bl-plan-filter-label">{text.planPage.preferredArea}</span>
                <FilterChips
                  options={areaFilterOptions}
                  selectedValue={area}
                  onSelect={(value) =>
                    updatePlannerParams({ area: value, seed: 0, stopSlugs: [], lockedRoles: [] })
                  }
                />
              </div>
              <div className="bl-plan-customize-reset">
                <button
                  type="button"
                  className="bl-plan-btn bl-plan-btn--ghost"
                  onClick={() => {
                    updatePlannerParams({
                      withWho: "friends",
                      mood: "social",
                      budget: "$$",
                      area: "any",
                      style: defaultPlanStyleId,
                      seed: 0,
                      stopSlugs: [],
                      lockedRoles: [],
                    });
                  }}
                >
                  {text.planPage.resetPlanner}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── E. SAVED OUTINGS ── */}
        <section className="bl-plan-saved">
          <div className="bl-plan-saved-head">
            <h2 className="bl-plan-saved-heading">
              <svg width="18" height="17" viewBox="0 0 18 17" fill="none" aria-hidden="true"><path d="M9 15.5S1.5 11 1.5 5.5A4 4 0 0 1 9 2.5a4 4 0 0 1 7.5 3c0 5.5-7.5 10-7.5 10Z" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.15"/></svg>
              {text.planPage.savedOutings}
            </h2>
            <span className="bl-plan-saved-count">
              {formatFlowText(text.planPage.savedCount, { count: savedOutings.length })}
            </span>
          </div>

          {savedOutings.length === 0 ? (
            <div className="bl-plan-saved-empty">
              <div className="bl-plan-save-icon-mark" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 21S3 16 3 9a5 5 0 0 1 9-3A5 5 0 0 1 21 9c0 7-9 12-9 12Z" stroke="currentColor" strokeWidth="1.5"/></svg>
              </div>
              <div>
                <p className="bl-plan-saved-empty-title">{text.planPage.noSavedTitle}</p>
                <p className="bl-plan-saved-empty-desc">{text.planPage.noSavedDescription}</p>
              </div>
            </div>
          ) : (
            <div className="bl-plan-saved-list">
              {savedOutings.map((outing) => (
                <article key={outing.id} className="bl-plan-saved-card">
                  <div className="bl-plan-saved-info">
                    <p className="bl-plan-saved-card-title">{outing.title}</p>
                    <p className="bl-plan-saved-card-meta">{outing.summary}</p>
                    <div className="bl-plan-saved-stops-mini">
                      {outing.stops.map((stop) => (
                        <span key={`${outing.id}-${stop.slug}`} className="bl-plan-saved-stop-name">
                          {stop.name}
                        </span>
                      ))}
                    </div>
                    <p className="bl-plan-saved-date">{formatSavedDate(outing.createdAt)}</p>
                  </div>
                  <div className="bl-plan-saved-cta">
                    <Link
                      to={buildPlanUrl({
                        withWho: outing.withWho,
                        mood: outing.mood,
                        budget: outing.budget,
                        area: outing.area,
                        style: outing.planStyle ?? defaultPlanStyleId,
                        seed: 0,
                        stopSlugs: outing.stops.map((stop) => stop.slug),
                        lockedRoles: outing.lockedRoles,
                      })}
                      className="bl-plan-btn bl-plan-btn--primary"
                    >
                      {text.planPage.openAgain}
                    </Link>
                    <button
                      type="button"
                      className="bl-plan-btn bl-plan-btn--ghost"
                      onClick={() => handleDeleteSavedOuting(outing.id)}
                    >
                      {text.planPage.delete}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── F. BOTTOM CTA ── */}
        <div className="bl-plan-cta">
          <div className="bl-plan-cta-copy">
            <span className="bl-plan-cta-spark" aria-hidden="true">✦</span>
            <div>
              <h3 className="bl-plan-cta-title">{text.planPage.ctaTitle}</h3>
              <p className="bl-plan-cta-sub">{text.planPage.ctaSubtitle}</p>
            </div>
          </div>
          <div className="bl-plan-cta-actions">
            <button
              type="button"
              className="bl-plan-btn bl-plan-btn--ghost"
              onClick={handleCopyOutingLink}
            >
              {text.planPage.copyLink}
            </button>
            <button
              type="button"
              className="bl-plan-btn bl-plan-btn--wa-solid"
              onClick={handleShareWhatsApp}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              {text.planPage.shareWhatsApp}
            </button>
          </div>
        </div>

      </main>

      {/* ── G. MOBILE STICKY SHARE ── */}
      <div className="bl-plan-mobile-share">
        <button
          type="button"
          className="bl-plan-btn bl-plan-btn--ghost"
          onClick={handleCopyOutingLink}
          tabIndex={-1}
        >
          {text.planPage.copyLink}
        </button>
        <button
          type="button"
          className="bl-plan-btn bl-plan-btn--wa-solid"
          onClick={handleShareWhatsApp}
          tabIndex={-1}
        >
          {text.planPage.shareWhatsApp}
        </button>
      </div>
    </div>
  );
}
