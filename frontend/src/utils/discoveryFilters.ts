import { type Venue } from "../data/mockData";
import {
  getVenueSearchText,
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

export const timeOfDayOptions: Option[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "late-night", label: "Late-night" },
];

export const energyOptions: Option[] = [
  { value: "low", label: "Low energy" },
  { value: "medium", label: "Medium energy" },
  { value: "high", label: "High energy" },
];

export const spaceTypeOptions: Option[] = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "mixed", label: "Indoor / Outdoor" },
];

export const socialLevelOptions: Option[] = [
  { value: "low", label: "Calm" },
  { value: "medium", label: "Balanced" },
  { value: "high", label: "Social" },
];

const bestForLabelMap: Record<string, string> = {
  "date-spot": "Date spot",
  friends: "Friends",
  "solo-coffee": "Solo coffee",
  "work-friendly": "Work-friendly",
  "family-friendly": "Family-friendly",
  "budget-pick": "Budget pick",
  "sunset-spot": "Sunset spot",
  "late-night": "Late-night",
};

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

export function getBestForOptions(venues: Venue[]): Option[] {
  const tags = new Set<string>();

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
  return bestForLabelMap[value] ?? toTitleCase(value);
}

export function getAreaLabel(value: string, areaOptions: Option[]): string {
  return areaOptions.find((option) => option.value === value)?.label ?? toTitleCase(value);
}

export function getOptionLabel(value: string, options: Option[]): string {
  return options.find((option) => option.value === value)?.label ?? value;
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
      if (!getVenueSearchText(venue).includes(filters.query.trim().toLowerCase())) {
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
