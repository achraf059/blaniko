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
  explainVenueMatch,
  getDiscoveryCompanionLabel,
  getDiscoveryMoodLabel,
  isDiscoveryMood,
  type DiscoveryCompanion,
  type DiscoveryMood,
  venueMatchesMood,
} from "../utils/discoveryInsights";
import {
  getBestForBadges,
  getVenuePersonalitySignals,
} from "../utils/venuePersonality";
import "./HomePage.css";
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
  | "productive-afternoon"
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
      start: ["cafes", "outdoor", "couples"],
      main: ["couples", "restaurants"],
      end: ["outdoor", "couples", "cafes"],
    },
    roleHints: {
      start: "Warm connection",
      main: "Signature shared moment",
      end: "Soft afterglow",
    },
    categoryBoosts: ["couples", "restaurants", "cafes"],
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
      start: ["cafes", "friends"],
      main: ["gaming", "sports", "activities", "friends"],
      end: ["restaurants", "outdoor", "friends"],
    },
    roleHints: {
      start: "Group warm-up",
      main: "Social peak",
      end: "Easy follow-up",
    },
    categoryBoosts: ["friends", "gaming", "sports", "activities"],
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
      start: ["cafes", "outdoor"],
      main: ["cafes", "outdoor", "activities"],
      end: ["outdoor", "cafes", "restaurants"],
    },
    roleHints: {
      start: "Slow start",
      main: "Reset block",
      end: "Gentle close",
    },
    categoryBoosts: ["cafes", "outdoor"],
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
      start: ["cafes", "outdoor"],
      main: ["activities", "outdoor", "friends", "family"],
      end: ["outdoor", "cafes", "friends"],
    },
    roleHints: {
      start: "Low-cost warm-up",
      main: "Value highlight",
      end: "Budget-friendly finish",
    },
    preferredPriceLevels: ["$"],
    categoryBoosts: ["outdoor", "activities", "friends"],
    weighting: { mood: 1.1, budget: 1.8, area: 0.9 },
    budgetStrict: true,
    explanationChips: ["Price-sensitive picks", "Repeatable low-cost route"],
    summaryTone: { pace: "budget-friendly afternoon", moment: "practical" },
    resultSubtitle:
      "Value-first sequencing with simple, repeatable city stops.",
  },
  {
    id: "productive-afternoon",
    label: "Productive afternoon",
    subtitle: "Focus-friendly stops and practical transitions.",
    vibeLine: "Focus arc",
    defaults: {
      withWho: "alone",
      mood: "chill",
      budget: "$$",
      area: "gauthier",
    },
    roleCategories: {
      start: ["cafes"],
      main: ["cafes", "activities"],
      end: ["outdoor", "cafes"],
    },
    roleHints: {
      start: "Coffee setup",
      main: "Deep-work block",
      end: "Decompress",
    },
    categoryBoosts: ["cafes"],
    keywordBoosts: [
      "freelancer",
      "remote",
      "professionals",
      "quiet",
      "focused",
    ],
    preferredPriceLevels: ["$$"],
    preferredAreas: ["gauthier", "maarif"],
    weighting: { mood: 1.25, budget: 1.2, area: 1.25 },
    explanationChips: ["Work-friendly sequencing", "Practical area priority"],
    summaryTone: { pace: "focused city session", moment: "productive" },
    resultSubtitle:
      "A work-ready sequence with a clean focus arc and a light close.",
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
      start: ["outdoor", "cafes"],
      main: ["outdoor", "couples", "activities"],
      end: ["cafes", "restaurants", "outdoor"],
    },
    roleHints: {
      start: "Golden-hour start",
      main: "Sunset main stop",
      end: "Night glide",
    },
    categoryBoosts: ["outdoor", "couples", "cafes"],
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
      start: ["cafes", "family"],
      main: ["family", "activities", "outdoor"],
      end: ["family", "restaurants", "outdoor"],
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
        start: ["cafes", "outdoor"],
        main: ["sports", "activities", "outdoor"],
        end: ["restaurants", "friends", "cafes"],
      };
    case "romantic":
      return {
        start: ["cafes", "outdoor"],
        main: ["couples", "restaurants", "activities"],
        end: ["restaurants", "couples", "outdoor"],
      };
    case "family-friendly":
      return {
        start: ["cafes", "family"],
        main: ["family", "activities", "outdoor"],
        end: ["restaurants", "family", "outdoor"],
      };
    case "social":
      return {
        start: ["cafes", "friends"],
        main: ["gaming", "activities", "sports", "friends"],
        end: ["restaurants", "friends", "outdoor"],
      };
    default:
      return {
        start: ["cafes", "outdoor"],
        main: ["activities", "restaurants", "sports"],
        end: ["restaurants", "outdoor", "couples"],
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

  if (role === "start" && ["cafes", "outdoor"].includes(venue.categorySlug)) {
    score += 1.5;
  }

  if (
    role === "end" &&
    ["restaurants", "outdoor", "cafes"].includes(venue.categorySlug)
  ) {
    score += 1.5;
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
    start: language === "fr" ? text.planPage.startPick : "Start / warm-up",
    main: language === "fr" ? text.planPage.mainPick : "Main stop",
    end: language === "fr" ? text.planPage.followUpPick : "Optional follow-up",
  };
  const stopRoleStage: Record<StopRoleKey, string> = {
    start: language === "fr" ? text.planPage.startPick : "Start",
    main: language === "fr" ? text.planPage.mainPick : "Main",
    end: language === "fr" ? text.planPage.followUpPick : "Follow-up",
  };

  const selectedMoodName = selectedMood
    ? moodLabels[selectedMood]
    : undefined;
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
      formatFlowText(text.planPage.stopUpdated, { stage: stopRoleStage[roleKey].toLowerCase() }),
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

  const planSummaryMeta = [
    selectedCompanionName,
    selectedMoodName
      ? formatFlowText(text.planPage.moodPrefix, { mood: selectedMoodName })
      : undefined,
    budget === "all"
      ? text.planPage.budgetAny
      : `Budget ${budget}`,
    area === "any"
      ? text.planPage.areaAny
      : formatFlowText(text.planPage.areaPrefix, { area }),
  ]
    .filter(Boolean)
    .join(" • ");

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
    if (effectivePlanStops.length === 0) {
      return;
    }

    const stopSignature = effectivePlanStops
      .map((stop) => stop.venue.slug)
      .join("-");

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
    effectivePlanStops,
    location.pathname,
    location.search,
    mood,
    planStyle,
    selectedAreaLabel,
    selectedPlanStyle.label,
    trackActivity,
  ]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    nextParams.set("with", companion);
    nextParams.set("mood", mood);
    nextParams.set("budget", budget);
    nextParams.set("area", area);
    nextParams.set("style", planStyle);
    nextParams.set("seed", String(refreshSeed));

    if (effectivePlanStops.length > 0) {
      nextParams.set(
        "stops",
        effectivePlanStops.map((stop) => stop.venue.slug).join(","),
      );
    }

    if (lockedRoles.length > 0) {
      nextParams.set("locks", lockedRoles.join(","));
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    area,
    budget,
    companion,
    effectivePlanStops,
    lockedRoles,
    mood,
    planStyle,
    refreshSeed,
    searchParams,
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
        <section className="bl-plan-hero">
          <p className="bl-plan-eyebrow">{text.planPage.eyebrow}</p>
          <h1 className="bl-plan-title">{text.planPage.title}</h1>
          <p className="bl-plan-subtitle">
            {text.planPage.subtitle}
          </p>
          <p className="bl-plan-current-summary">
            {formatFlowText(text.planPage.currentPlan, { plan: planSummary })}
          </p>

          <div className="bl-plan-style-head">
            <p className="bl-discovery-label">{text.planPage.planStyle}</p>
            <p className="bl-plan-style-subtitle">
              {displayPlanStyle.subtitle}
            </p>
          </div>

          <div className="bl-plan-style-grid">
            {planStyleOptions.map((style) => (
              <button
                key={style.id}
                type="button"
                className={`bl-plan-style-chip${planStyle === style.id ? " is-active" : ""}`}
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
                <span>{displayStyles[style.id].label}</span>
                <small>{displayStyles[style.id].subtitle}</small>
                <small>{displayStyles[style.id].vibeLine}</small>
              </button>
            ))}
          </div>

          <div className="bl-plan-controls">
            <div>
              <p className="bl-discovery-label">{text.planPage.whoWith}</p>
              <FilterChips
                options={companionFilterOptions}
                selectedValue={companion}
                onSelect={(value) =>
                  updatePlannerParams({
                    withWho: value,
                    seed: 0,
                    stopSlugs: [],
                    lockedRoles: [],
                  })
                }
              />
            </div>

            <div>
              <p className="bl-discovery-label">{text.common.mood}</p>
              <FilterChips
                options={moodFilterOptions}
                selectedValue={mood}
                onSelect={(value) =>
                  updatePlannerParams({
                    mood: value,
                    seed: 0,
                    stopSlugs: [],
                    lockedRoles: [],
                  })
                }
              />
            </div>

            <div>
              <p className="bl-discovery-label">{dictionary.searchPage.summaryBudget}</p>
              <FilterChips
                options={budgetFilterOptions}
                selectedValue={budget}
                onSelect={(value) =>
                  updatePlannerParams({
                    budget: value,
                    seed: 0,
                    stopSlugs: [],
                    lockedRoles: [],
                  })
                }
              />
            </div>

            <div>
              <p className="bl-discovery-label">{text.planPage.preferredArea}</p>
              <FilterChips
                options={areaFilterOptions}
                selectedValue={area}
                onSelect={(value) =>
                  updatePlannerParams({
                    area: value,
                    seed: 0,
                    stopSlugs: [],
                    lockedRoles: [],
                  })
                }
              />
            </div>

            <div className="bl-plan-actions">
              <button
                type="button"
                className="bl-plan-secondary-btn"
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

              <button
                type="button"
                className="bl-plan-primary-btn"
                onClick={handleRegenerateOuting}
              >
                {text.planPage.refresh}
              </button>

              <button
                type="button"
                className="bl-plan-secondary-btn"
                onClick={handleCopyOutingLink}
              >
                {text.planPage.copyLink}
              </button>

              <button
                type="button"
                className="bl-plan-primary-btn"
                onClick={handleSaveOuting}
              >
                {text.planPage.saveOuting}
              </button>
            </div>

            {shareFeedback !== "idle" ? (
              <p className="bl-plan-feedback">
                {shareFeedback === "copied"
                  ? text.planPage.linkCopied
                  : text.planPage.linkCopyFailed}
              </p>
            ) : null}

            {saveFeedback === "saved" ? (
              <p className="bl-plan-feedback">{text.planPage.outingSaved}</p>
            ) : null}
            {refineFeedback ? (
              <p className="bl-plan-feedback">{refineFeedback}</p>
            ) : null}
          </div>
        </section>

        <section className="bl-plan-results">
          <div className="bl-plan-results-head">
            <h2>{text.planPage.routeTitle}</h2>
            <p>
              {formatFlowText(text.planPage.stopsCount, {
                count: effectivePlanStops.length,
              })}
            </p>
          </div>

          <p className="bl-plan-results-subtitle">
            {displayPlanStyle.resultSubtitle}
          </p>
          {displayPlanStyle.explanationChips?.length ? (
            <div className="bl-plan-results-chip-list">
              {displayPlanStyle.explanationChips.map((chip: string) => (
                <span
                  key={`${selectedPlanStyle.id}-${chip}`}
                  className="bl-plan-results-chip"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
          <p className="bl-plan-results-summary-meta">{planSummaryMeta}</p>

          {effectivePlanStops.length > 0 ? (
            <div className="bl-plan-grid">
              {effectivePlanStops.map((stop, index) => {
                const roleKey =
                  stopRoleOrder[Math.min(index, stopRoleOrder.length - 1)];
                const isLocked = lockedRoles.includes(roleKey);

                return (
                  <article
                    key={`${stop.role}-${stop.venue.slug}`}
                    className="bl-plan-card"
                  >
                    <p className="bl-plan-stop-index">
                      {formatFlowText(text.planPage.stopLabel, {
                        index: index + 1,
                      })}
                    </p>
                    <p className="bl-plan-stop-stage">
                      {stopRoleStage[roleKey]}
                    </p>
                    <p className="bl-plan-stop-role">{stop.role}</p>
                    <p className="bl-plan-stop-hint">{stop.roleHint}</p>
                    <p className="bl-plan-stop-lock-state">
                      {isLocked ? text.planPage.locked : text.planPage.unlocked}
                    </p>
                    <p className="bl-plan-stop-category">
                      {stop.venue.category}
                    </p>
                    <h3 className="bl-plan-stop-name">{stop.venue.name}</h3>
                    <p className="bl-plan-stop-area">📍 {stop.venue.area}</p>
                    <p className="bl-plan-stop-description">
                      {stop.venue.shortDescription ?? stop.venue.description}
                    </p>

                    {getBestForBadges(stop.venue, 2, language).length > 0 ? (
                      <div className="bl-plan-stop-badges">
                        {getBestForBadges(stop.venue, 2, language).map(
                          (badge, badgeIndex) => (
                            <span
                              key={`${stop.venue.slug}-plan-badge-${badge}-${badgeIndex}`}
                            >
                              {badge}
                            </span>
                          ),
                        )}
                      </div>
                    ) : null}

                    {getVenuePersonalitySignals(stop.venue, language).length > 0 ? (
                      <p className="bl-plan-stop-signals">
                        {getVenuePersonalitySignals(stop.venue, language)
                          .slice(0, 2)
                          .join(" • ")}
                      </p>
                    ) : null}

                    <div className="bl-plan-why-list">
                      {[
                        `${stopRoleStage[roleKey]} ${text.planPage.chipSuffix}`,
                        selectedPlanStyle.label,
                        ...explainVenueMatch(stop.venue, {
                          budget,
                          area,
                          mood: selectedMood,
                          companion: selectedCompanion,
                        }, 3, language),
                      ]
                        .slice(0, 5)
                        .map((chip, chipIndex) => (
                          <span
                            key={`${stop.venue.slug}-${chip}-${chipIndex}`}
                            className="bl-plan-why-chip"
                          >
                            {chip}
                          </span>
                        ))}
                    </div>

                    <div className="bl-plan-stop-actions">
                      <button
                        type="button"
                        className="bl-plan-stop-utility-btn"
                        onClick={() => handleReplaceStop(roleKey)}
                      >
                        {text.planPage.replaceStop}
                      </button>

                      <button
                        type="button"
                        className={`bl-plan-stop-utility-btn${isLocked ? " is-active" : ""}`}
                        onClick={() => handleToggleStopLock(roleKey)}
                      >
                        {isLocked ? text.planPage.unlock : text.planPage.lock}
                      </button>

                      <button
                        type="button"
                        className={`bl-plan-favorite-btn${
                          isFavorite(stop.venue.slug) ? " is-active" : ""
                        }`}
                        onClick={() => toggleFavorite(stop.venue.slug)}
                      >
                        {isFavorite(stop.venue.slug)
                          ? dictionary.venueCard.removeFavorite
                          : dictionary.venueCard.saveFavorite}
                      </button>

                      <Link
                        to={buildVenueHref(stop.venue.slug)}
                        className="bl-plan-details-link"
                      >
                        {dictionary.venueCard.viewDetails}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="bl-plan-empty">
              <h3>{text.planPage.notEnoughTitle}</h3>
              <p>{text.planPage.notEnoughDescription}</p>
            </div>
          )}
        </section>

        <section className="bl-plan-saved">
          <div className="bl-plan-results-head">
            <h2>{text.planPage.savedOutings}</h2>
            <p>
              {formatFlowText(text.planPage.savedCount, {
                count: savedOutings.length,
              })}
            </p>
          </div>

          {savedOutings.length === 0 ? (
            <div className="bl-plan-empty">
              <h3>{text.planPage.noSavedTitle}</h3>
              <p>{text.planPage.noSavedDescription}</p>
            </div>
          ) : (
            <div className="bl-plan-saved-list">
              {savedOutings.map((outing) => (
                <article key={outing.id} className="bl-plan-saved-card">
                  <p className="bl-plan-saved-title">{outing.title}</p>
                  <p className="bl-plan-saved-meta">{outing.summary}</p>
                  <p className="bl-plan-saved-date">
                    {formatSavedDate(outing.createdAt)}
                  </p>

                  <div className="bl-plan-saved-stops">
                    {outing.stops.map((stop) => (
                      <p key={`${outing.id}-${stop.slug}-${stop.role}`}>
                        <strong>{stop.role}:</strong> {stop.name}
                      </p>
                    ))}
                  </div>

                  <div className="bl-plan-stop-actions">
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
                      className="bl-plan-details-link"
                    >
                      {text.planPage.openAgain}
                    </Link>

                    <button
                      type="button"
                      className="bl-plan-secondary-btn"
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
      </main>
    </div>
  );
}
