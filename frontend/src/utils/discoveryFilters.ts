import { type Venue } from "../data/mockData";
import type { AppLanguage } from "../i18n/types";
import {
  getVenueSearchText,
  normalizeText,
  type DiscoveryMood,
  isDiscoveryMood,
  venueMatchesMood,
} from "./discoveryInsights";

export type SmartDiscoveryFilters = {
  query: string;
  category: string;
  mood: string;
  budget: string;
  area: string;
  bestFor: string;
  timeOfDay: string;
  energyLevel: string;
  spaceType: string;
  socialLevel: string;
};

type Option = {
  value: string;
  label: string;
};

const byLanguage = {
  en: {
    timeOfDayOptions: [
      { value: "morning", label: "Morning" },
      { value: "afternoon", label: "Afternoon" },
      { value: "evening", label: "Evening" },
      { value: "late-night", label: "Late-night" },
    ],
    energyOptions: [
      { value: "low", label: "Low energy" },
      { value: "medium", label: "Medium energy" },
      { value: "high", label: "High energy" },
    ],
    spaceTypeOptions: [
      { value: "indoor", label: "Indoor" },
      { value: "outdoor", label: "Outdoor" },
      { value: "mixed", label: "Indoor / Outdoor" },
    ],
    socialLevelOptions: [
      { value: "low", label: "Calm" },
      { value: "medium", label: "Balanced" },
      { value: "high", label: "Social" },
    ],
    bestForLabelMap: {
      "date-spot": "Date spot",
      friends: "Friends",
      "solo-coffee": "Solo coffee",
      "work-friendly": "Work-friendly",
      "family-friendly": "Family-friendly",
      "budget-pick": "Budget pick",
      "sunset-spot": "Sunset spot",
      "late-night": "Late-night",
    },
  },
  fr: {
    timeOfDayOptions: [
      { value: "morning", label: "Matin" },
      { value: "afternoon", label: "Après-midi" },
      { value: "evening", label: "Soir" },
      { value: "late-night", label: "Tard le soir" },
    ],
    energyOptions: [
      { value: "low", label: "Énergie faible" },
      { value: "medium", label: "Énergie moyenne" },
      { value: "high", label: "Énergie élevée" },
    ],
    spaceTypeOptions: [
      { value: "indoor", label: "Intérieur" },
      { value: "outdoor", label: "Extérieur" },
      { value: "mixed", label: "Intérieur / Extérieur" },
    ],
    socialLevelOptions: [
      { value: "low", label: "Calme" },
      { value: "medium", label: "Équilibré" },
      { value: "high", label: "Social" },
    ],
    bestForLabelMap: {
      "date-spot": "Idéal en duo",
      friends: "Amis",
      "solo-coffee": "Café en solo",
      "work-friendly": "Adapté au travail",
      "family-friendly": "Familial",
      "budget-pick": "Petit budget",
      "sunset-spot": "Spot sunset",
      "late-night": "Tard le soir",
    },
  },
} satisfies Record<
  AppLanguage,
  {
    timeOfDayOptions: Option[];
    energyOptions: Option[];
    spaceTypeOptions: Option[];
    socialLevelOptions: Option[];
    bestForLabelMap: Record<string, string>;
  }
>;

function getBundle(language: AppLanguage) {
  return byLanguage[language] ?? byLanguage.en;
}

export const timeOfDayOptions: Option[] = byLanguage.en.timeOfDayOptions;
export const energyOptions: Option[] = byLanguage.en.energyOptions;
export const spaceTypeOptions: Option[] = byLanguage.en.spaceTypeOptions;
export const socialLevelOptions: Option[] = byLanguage.en.socialLevelOptions;

export function getTimeOfDayOptions(language: AppLanguage): Option[] {
  return getBundle(language).timeOfDayOptions;
}

export function getEnergyOptions(language: AppLanguage): Option[] {
  return getBundle(language).energyOptions;
}

export function getSpaceTypeOptions(language: AppLanguage): Option[] {
  return getBundle(language).spaceTypeOptions;
}

export function getSocialLevelOptions(language: AppLanguage): Option[] {
  return getBundle(language).socialLevelOptions;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(", casablanca", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPrimaryArea(area: string): string {
  return area.split(",")[0]?.trim() ?? area;
}

function toTitleCase(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getAreaOptions(venues: Venue[]): Option[] {
  const areaMap = new Map<string, string>();

  venues.forEach((venue) => {
    const areaLabel = getPrimaryArea(venue.area);
    const slug = toSlug(areaLabel);

    if (!slug || areaMap.has(slug)) {
      return;
    }

    areaMap.set(slug, areaLabel);
  });

  return [...areaMap.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((first, second) => first.label.localeCompare(second.label));
}

export function getBestForOptions(venues: Venue[], language: AppLanguage = "en"): Option[] {
  const tags = new Set<string>();
  const bestForLabelMap: Record<string, string> = getBundle(language).bestForLabelMap;

  venues.forEach((venue) => {
    venue.bestForTags?.forEach((tag) => tags.add(tag));
  });

  return [...tags]
    .map((tag) => ({
      value: tag,
      label: bestForLabelMap[tag] ?? toTitleCase(tag),
    }))
    .sort((first, second) => first.label.localeCompare(second.label));
}

export function getBestForLabel(value: string): string {
  return getBestForLabelByLanguage(value, "en");
}

export function getBestForLabelByLanguage(
  value: string,
  language: AppLanguage,
): string {
  const bestForLabelMap: Record<string, string> = getBundle(language).bestForLabelMap;
  return bestForLabelMap[value] ?? toTitleCase(value);
}

export function getAreaLabel(value: string, areaOptions: Option[]): string {
  return areaOptions.find((option) => option.value === value)?.label ?? toTitleCase(value);
}

export function getOptionLabel(value: string, options: Option[]): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export type SearchSuggestion = {
  label: string;
  query?: string;
  category?: string;
  area?: string;
  bestFor?: string;
};

const fallbackSuggestions: Record<string, SearchSuggestion[]> = {
  pool: [
    { label: "Water activities", query: "water" },
    { label: "Outdoor", category: "outdoor" },
    { label: "Ain Diab", area: "ain-diab" },
  ],
  piscine: [
    { label: "Water activities", query: "water" },
    { label: "Outdoor", category: "outdoor" },
    { label: "Ain Diab", area: "ain-diab" },
  ],
  beach: [
    { label: "Outdoor", category: "outdoor" },
    { label: "Ain Diab", area: "ain-diab" },
    { label: "Marina", area: "marina" },
  ],
  plage: [
    { label: "Outdoor", category: "outdoor" },
    { label: "Ain Diab", area: "ain-diab" },
    { label: "Marina", area: "marina" },
  ],
  food: [
    { label: "Food experiences", category: "restaurants" },
    { label: "Date spot", bestFor: "date-spot" },
    { label: "Cafes", category: "cafes" },
  ],
  restaurant: [
    { label: "Food experiences", category: "restaurants" },
    { label: "Date spot", bestFor: "date-spot" },
    { label: "Cafes", category: "cafes" },
  ],
  dinner: [
    { label: "Food experiences", category: "restaurants" },
    { label: "Date spot", bestFor: "date-spot" },
    { label: "Couples", category: "couples" },
  ],
  kids: [
    { label: "Family-friendly", bestFor: "family-friendly" },
    { label: "Family", category: "family" },
    { label: "Outdoor", category: "outdoor" },
  ],
  children: [
    { label: "Family-friendly", bestFor: "family-friendly" },
    { label: "Family", category: "family" },
    { label: "Outdoor", category: "outdoor" },
  ],
  family: [
    { label: "Family-friendly", bestFor: "family-friendly" },
    { label: "Family", category: "family" },
    { label: "Outdoor", category: "outdoor" },
  ],
  night: [
    { label: "Late-night", bestFor: "late-night" },
    { label: "Date spot", bestFor: "date-spot" },
    { label: "Gaming", category: "gaming" },
    { label: "Dinner", query: "dinner" },
  ],
  evening: [
    { label: "Late-night", bestFor: "late-night" },
    { label: "Date spot", bestFor: "date-spot" },
    { label: "Dinner", query: "dinner" },
  ],
  gym: [
    { label: "Sports", category: "sports" },
    { label: "Fitness", query: "fitness" },
    { label: "Wellness", query: "wellness" },
  ],
  workout: [
    { label: "Sports", category: "sports" },
    { label: "Fitness", query: "fitness" },
    { label: "Activities", category: "activities" },
  ],
  wellness: [
    { label: "Sports", category: "sports" },
    { label: "Yoga", query: "yoga" },
    { label: "Activities", category: "activities" },
  ],
  yoga: [
    { label: "Wellness", query: "wellness" },
    { label: "Sports", category: "sports" },
    { label: "Activities", category: "activities" },
  ],
  pottery: [
    { label: "Activities", category: "activities" },
    { label: "Workshop", query: "workshop" },
    { label: "Family-friendly", bestFor: "family-friendly" },
  ],
  art: [
    { label: "Activities", category: "activities" },
    { label: "Workshop", query: "workshop" },
  ],
  workshop: [
    { label: "Activities", category: "activities" },
    { label: "Family-friendly", bestFor: "family-friendly" },
    { label: "Creative", query: "creative" },
  ],
  // extra aliases
  piscina: [
    { label: "Water activities", query: "water" },
    { label: "Outdoor", category: "outdoor" },
    { label: "Ain Diab", area: "ain-diab" },
  ],
  romantic: [
    { label: "Date spot", bestFor: "date-spot" },
    { label: "Couples", category: "couples" },
    { label: "Food experiences", category: "restaurants" },
  ],
  cheap: [
    { label: "Budget pick", bestFor: "budget-pick" },
    { label: "Cafes", category: "cafes" },
    { label: "Activities", category: "activities" },
  ],
  date: [
    { label: "Date spot", bestFor: "date-spot" },
    { label: "Couples", category: "couples" },
    { label: "Food experiences", category: "restaurants" },
  ],
};

export function getSearchFallbackSuggestions(query: string): SearchSuggestion[] {
  const normalized = normalizeText(query);

  // 1. Exact match
  const exact = fallbackSuggestions[normalized];
  if (exact) return exact;

  // 2. Word-by-word scan — collect from all matching tokens, dedup, cap at 4
  const words = normalized.split(" ").filter(Boolean);
  const seen = new Set<string>();
  const merged: SearchSuggestion[] = [];

  for (const word of words) {
    const hits = fallbackSuggestions[word];
    if (!hits) continue;
    for (const s of hits) {
      const key = `${s.query ?? ""}|${s.category ?? ""}|${s.area ?? ""}|${s.bestFor ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(s);
      }
    }
  }

  return merged.slice(0, 4);
}

const synonymMap: Record<string, string[]> = {
  pool: ["swimming", "water", "sea", "coast"],
  piscine: ["pool", "swimming", "water", "sea"],
  beach: ["water", "sea", "coast"],
  plage: ["beach", "water", "sea", "coast"],
  kids: ["family", "children", "child-friendly"],
  children: ["kids", "family"],
  family: ["kids", "children"],
  date: ["romantic", "couples", "date spot", "date night"],
  couple: ["romantic", "couples", "date", "date spot"],
  cheap: ["budget", "free"],
  free: ["budget", "cheap"],
  night: ["late-night", "date night"],
  evening: ["night", "late-night"],
  restaurant: ["food", "dinner"],
  dinner: ["restaurant", "food", "romantic"],
  cafe: ["coffee", "cafes"],
  coffee: ["cafe", "cafes"],
  sport: ["sports", "fitness"],
  sports: ["sport", "fitness"],
  workout: ["fitness", "gym", "wellness"],
  gym: ["fitness", "workout", "wellness"],
  wellness: ["fitness", "yoga"],
  yoga: ["wellness", "fitness"],
};

function expandQuery(normalizedQuery: string): string[] {
  const synonyms = synonymMap[normalizedQuery] ?? [];
  return [...new Set([normalizedQuery, ...synonyms])];
}

function matchesSearchTerm(venueText: string, term: string): boolean {
  const normalizedTerm = normalizeText(term)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!normalizedTerm) {
    return false;
  }

  const normalizedVenueText = ` ${venueText.replace(/[^a-z0-9]+/g, " ")} `;

  return normalizedVenueText.includes(` ${normalizedTerm} `);
}

export function filterVenuesBySmartDiscovery(
  venues: Venue[],
  filters: SmartDiscoveryFilters
): Venue[] {
  const selectedMood: DiscoveryMood | undefined = isDiscoveryMood(filters.mood)
    ? filters.mood
    : undefined;

  return venues.filter((venue) => {
    if (filters.query.trim()) {
      const normalizedQuery = normalizeText(filters.query);
      const terms = expandQuery(normalizedQuery);
      const venueText = getVenueSearchText(venue);
      if (!terms.some((term) => matchesSearchTerm(venueText, term))) {
        return false;
      }
    }

    if (filters.category && venue.categorySlug !== filters.category) {
      return false;
    }

    if (selectedMood && !venueMatchesMood(venue, selectedMood)) {
      return false;
    }

    if (filters.budget !== "all" && venue.priceLevel !== filters.budget) {
      return false;
    }

    if (filters.area && toSlug(getPrimaryArea(venue.area)) !== filters.area) {
      return false;
    }

    if (filters.bestFor && !(venue.bestForTags ?? []).includes(filters.bestFor)) {
      return false;
    }

    if (filters.timeOfDay && !(venue.timeOfDay ?? []).includes(filters.timeOfDay as never)) {
      return false;
    }

    if (filters.energyLevel && venue.energyLevel !== filters.energyLevel) {
      return false;
    }

    if (filters.spaceType && venue.spaceType !== filters.spaceType) {
      return false;
    }

    if (filters.socialLevel && venue.socialLevel !== filters.socialLevel) {
      return false;
    }

    return true;
  });
}
