import { bestForLabels } from "../data/bestForTags";
import { type Venue } from "../data/mockData";
import type { AppLanguage } from "../i18n/types";

type VenuePersonalityInput = Pick<
  Venue,
  | "description"
  | "shortDescription"
  | "vibe"
  | "vibeSummary"
  | "audience"
  | "priceLevel"
  | "bestForTags"
  | "timeOfDay"
  | "energyLevel"
  | "socialLevel"
  | "spaceType"
>;

const labelByLanguage = {
  en: {
    bestForLabelMap: bestForLabels.en,
    timeLabelMap: {
      morning: "Best in the morning",
      afternoon: "Great for afternoons",
      evening: "Best in the evening",
      "late-night": "Works late-night",
    },
    energyLabelMap: {
      low: "Low energy",
      medium: "Medium energy",
      high: "High energy",
    },
    socialLabelMap: {
      low: "Calm",
      medium: "Balanced",
      high: "Social",
    },
    spaceLabelMap: {
      indoor: "Indoor",
      outdoor: "Outdoor",
      mixed: "Indoor / Outdoor",
    },
  },
  fr: {
    bestForLabelMap: bestForLabels.fr,
    timeLabelMap: {
      morning: "Idéal le matin",
      afternoon: "Parfait l'après-midi",
      evening: "Idéal le soir",
      "late-night": "Convient tard le soir",
    },
    energyLabelMap: {
      low: "Énergie faible",
      medium: "Énergie moyenne",
      high: "Énergie élevée",
    },
    socialLabelMap: {
      low: "Calme",
      medium: "Équilibré",
      high: "Social",
    },
    spaceLabelMap: {
      indoor: "Intérieur",
      outdoor: "Extérieur",
      mixed: "Intérieur / Extérieur",
    },
  },
} satisfies Record<
  AppLanguage,
  {
    bestForLabelMap: Record<string, string>;
    timeLabelMap: Record<string, string>;
    energyLabelMap: Record<string, string>;
    socialLabelMap: Record<string, string>;
    spaceLabelMap: Record<string, string>;
  }
>;

function getLabels(language: AppLanguage) {
  return labelByLanguage[language] ?? labelByLanguage.en;
}

export function getBestForBadges(
  venue: VenuePersonalityInput,
  max = 3,
  language: AppLanguage = "en",
): string[] {
  const labels = getLabels(language);
  const bestForLabelMap: Record<string, string> = labels.bestForLabelMap;
  const fromMetadata = (venue.bestForTags ?? [])
    .map((tag) => bestForLabelMap[tag] ?? tag)
    .slice(0, max);

  if (fromMetadata.length > 0) {
    return fromMetadata;
  }

  const fallback: string[] = [];
  const audienceText = `${venue.audience ?? ""} ${venue.description}`.toLowerCase();

  if (audienceText.includes("couples") || audienceText.includes("date")) {
    fallback.push(bestForLabelMap["date-spot"] ?? "Date spot");
  }
  if (audienceText.includes("friends") || audienceText.includes("groups")) {
    fallback.push(bestForLabelMap.friends ?? "Friends");
  }
  if (audienceText.includes("family") || audienceText.includes("children")) {
    fallback.push(bestForLabelMap["family-friendly"] ?? "Family-friendly");
  }
  // V3 price safety: budget-pick personality tag disabled until verified prices exist.
  // if ((venue.priceLevel ?? "") === "$") {
  //   fallback.push(bestForLabelMap["budget-pick"] ?? "Budget pick");
  // }

  return fallback.slice(0, max);
}

export function getVenuePersonalitySignals(
  venue: VenuePersonalityInput,
  language: AppLanguage = "en",
): string[] {
  const labels = getLabels(language);
  const signals: string[] = [];

  const firstTime = venue.timeOfDay?.[0];
  if (firstTime) {
    signals.push(labels.timeLabelMap[firstTime] ?? firstTime);
  }

  if (venue.socialLevel) {
    signals.push(labels.socialLabelMap[venue.socialLevel] ?? venue.socialLevel);
  }

  if (venue.energyLevel) {
    signals.push(labels.energyLabelMap[venue.energyLevel] ?? venue.energyLevel);
  }

  if (venue.spaceType) {
    signals.push(labels.spaceLabelMap[venue.spaceType] ?? venue.spaceType);
  }

  return signals;
}

export function getVenuePersonalitySection(
  venue: VenuePersonalityInput,
  language: AppLanguage = "en",
) {
  const labels = getLabels(language);
  return {
    whyPeopleChoose:
      venue.vibeSummary ?? venue.shortDescription ?? venue.description,
    bestFor: getBestForBadges(venue, 4, language),
    bestTimeToGo: (venue.timeOfDay ?? []).map((slot) => labels.timeLabelMap[slot] ?? slot),
    atmosphere: [
      venue.vibe ?? "",
      venue.socialLevel ? labels.socialLabelMap[venue.socialLevel] : "",
      venue.energyLevel ? labels.energyLabelMap[venue.energyLevel] : "",
      venue.spaceType ? labels.spaceLabelMap[venue.spaceType] : "",
    ]
      .filter(Boolean)
      .join(" • "),
  };
}
