// Canonical source for bestFor tag keys and their localized display labels.
//
// Import this file wherever tag labels are needed instead of duplicating the
// map. Previously identical copies existed in:
//   src/utils/venuePersonality.ts
//   src/utils/discoveryFilters.ts
//
// If you add a new tag key, add it here and to computeBestForTags() in
// backend/src/routes/venues.ts.

import type { AppLanguage } from "../i18n/types";

export type BestForTag =
  | "date-spot"
  | "friends"
  | "solo-coffee"
  | "work-friendly"
  | "family-friendly"
  | "budget-pick"
  | "sunset-spot"
  | "late-night"
  | "group-activity"
  | "active"
  | "competitive"
  | "kids";

export const bestForLabels: Record<AppLanguage, Record<BestForTag, string>> = {
  en: {
    "date-spot":      "Date spot",
    friends:          "Friends",
    "solo-coffee":    "Solo coffee",
    "work-friendly":  "Work-friendly",
    "family-friendly":"Family-friendly",
    "budget-pick":    "Budget pick",
    "sunset-spot":    "Sunset spot",
    "late-night":     "Late-night",
    "group-activity": "Group activity",
    active:           "Active",
    competitive:      "Competitive",
    kids:             "Good for kids",
  },
  fr: {
    "date-spot":      "Idéal en duo",
    friends:          "Amis",
    "solo-coffee":    "Café en solo",
    "work-friendly":  "Adapté au travail",
    "family-friendly":"Familial",
    "budget-pick":    "Petit budget",
    "sunset-spot":    "Spot sunset",
    "late-night":     "Tard le soir",
    "group-activity": "Activité en groupe",
    active:           "Actif",
    competitive:      "Compétitif",
    kids:             "Pour les enfants",
  },
};

export function getBestForTagLabel(tag: string, language: AppLanguage): string {
  return (
    (bestForLabels[language] ?? bestForLabels.en)[tag as BestForTag] ?? tag
  );
}
