import { type Venue } from "../data/mockData";
import type { AppLanguage } from "../i18n/types";

export type DiscoveryMood =
  | "chill"
  | "social"
  | "active"
  | "romantic"
  | "family-friendly";

export type DiscoveryCompanion = "alone" | "friends" | "family" | "partner";

type MatchContext = {
  query?: string;
  category?: string;
  budget?: string;
  mood?: DiscoveryMood;
  companion?: DiscoveryCompanion;
  area?: string;
};

const moodLabelsByLanguage: Record<AppLanguage, Record<DiscoveryMood, string>> = {
  en: {
    chill: "Chill",
    social: "Social",
    active: "Active",
    romantic: "Romantic",
    "family-friendly": "Family-friendly",
  },
  fr: {
    chill: "Détente",
    social: "Social",
    active: "Actif",
    romantic: "Romantique",
    "family-friendly": "Familial",
  },
};

const companionLabelsByLanguage: Record<
  AppLanguage,
  Record<DiscoveryCompanion, string>
> = {
  en: {
    alone: "Alone",
    friends: "Friends",
    family: "Family",
    partner: "Partner",
  },
  fr: {
    alone: "Seul",
    friends: "Amis",
    family: "Famille",
    partner: "Partenaire",
  },
};

const companionContextLabelsByLanguage: Record<
  AppLanguage,
  Record<DiscoveryCompanion, string>
> = {
  en: {
    alone: "solo plans",
    friends: "friend groups",
    family: "families",
    partner: "date plans",
  },
  fr: {
    alone: "les sorties solo",
    friends: "les groupes d'amis",
    family: "les familles",
    partner: "les plans en duo",
  },
};

const moodContextLabelsByLanguage: Record<AppLanguage, Record<DiscoveryMood, string>> = {
  en: {
    chill: "chill",
    social: "social",
    active: "active",
    romantic: "romantic",
    "family-friendly": "family-friendly",
  },
  fr: {
    chill: "détente",
    social: "social",
    active: "active",
    romantic: "romantique",
    "family-friendly": "familial",
  },
};

export const discoveryMoodLabel: Record<DiscoveryMood, string> = moodLabelsByLanguage.en;

export const discoveryCompanionLabel: Record<DiscoveryCompanion, string> =
  companionLabelsByLanguage.en;

export function getDiscoveryMoodLabel(language: AppLanguage): Record<DiscoveryMood, string> {
  return moodLabelsByLanguage[language] ?? moodLabelsByLanguage.en;
}

export function getDiscoveryCompanionLabel(
  language: AppLanguage,
): Record<DiscoveryCompanion, string> {
  return companionLabelsByLanguage[language] ?? companionLabelsByLanguage.en;
}

const moodKeywordMap: Record<DiscoveryMood, string[]> = {
  chill: ["calm", "quiet", "chill", "cozy", "relaxed", "scenic"],
  social: ["social", "lively", "community", "groups", "friendly", "fun"],
  active: ["active", "sports", "fitness", "training", "cycling", "padel"],
  romantic: ["romantic", "intimate", "date", "cozy", "sunset"],
  "family-friendly": ["family", "safe", "children", "kids", "welcoming", "parents"],
};

const companionKeywordMap: Record<DiscoveryCompanion, string[]> = {
  alone: ["solo", "freelancer", "remote", "quiet", "focused", "professional"],
  friends: ["friends", "groups", "students", "social", "gamers"],
  family: ["family", "parents", "children", "kids", "safe"],
  partner: ["couples", "romantic", "date", "intimate"],
};

function normalizeText(value: string | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

export function getVenueSearchText(venue: Venue): string {
  return [
    venue.name,
    venue.category,
    venue.categorySlug,
    venue.area,
    venue.description,
    venue.shortDescription,
    venue.overview,
    venue.vibe,
    venue.vibeSummary,
    venue.audience,
    venue.bestForTags?.join(" "),
    venue.timeOfDay?.join(" "),
    venue.energyLevel,
    venue.socialLevel,
    venue.spaceType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getPrimaryArea(venue: Venue): string {
  return venue.area.split(",")[0]?.trim() ?? venue.area;
}

function uniqueReasons(reasons: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const reason of reasons) {
    const key = reason.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(reason);
  }

  return unique;
}

function categorySupportsMood(categorySlug: string, mood: DiscoveryMood): boolean {
  const moodCategories: Record<DiscoveryMood, string[]> = {
    chill: ["cafes", "outdoor", "couples"],
    social: ["friends", "gaming", "activities", "restaurants"],
    active: ["sports", "outdoor", "activities"],
    romantic: ["couples", "restaurants", "cafes", "outdoor"],
    "family-friendly": ["family", "outdoor", "activities"],
  };

  return moodCategories[mood].includes(categorySlug);
}

export function isDiscoveryMood(value: string): value is DiscoveryMood {
  return ["chill", "social", "active", "romantic", "family-friendly"].includes(value);
}

export function isDiscoveryCompanion(value: string): value is DiscoveryCompanion {
  return ["alone", "friends", "family", "partner"].includes(value);
}

export function venueMatchesMood(venue: Venue, mood?: DiscoveryMood): boolean {
  if (!mood) {
    return true;
  }

  const text = getVenueSearchText(venue);
  const hasKeywordMatch = moodKeywordMap[mood].some((keyword) => text.includes(keyword));

  return hasKeywordMatch || categorySupportsMood(venue.categorySlug, mood);
}

export function explainVenueMatch(
  venue: Venue,
  context: MatchContext,
  maxReasons = 3,
  language: AppLanguage = "en",
): string[] {
  const reasons: string[] = [];
  const venueText = getVenueSearchText(venue);
  const moodLabels = getDiscoveryMoodLabel(language);
  const companionContextLabels =
    companionContextLabelsByLanguage[language] ?? companionContextLabelsByLanguage.en;
  const moodContextLabels =
    moodContextLabelsByLanguage[language] ?? moodContextLabelsByLanguage.en;

  const query = normalizeText(context.query);
  if (query.length >= 2 && venueText.includes(query)) {
    reasons.push(
      language === "fr"
        ? `Correspond à « ${context.query?.trim()} »`
        : `Matches “${context.query?.trim()}”`,
    );
  }

  if (context.category && venue.categorySlug === context.category) {
    reasons.push(
      language === "fr" ? `Correspondance ${venue.category}` : `${venue.category} match`,
    );
  }

  if (context.budget && context.budget !== "all" && venue.priceLevel === context.budget) {
    reasons.push(
      language === "fr"
        ? `Dans votre budget ${context.budget}`
        : `In your ${context.budget} budget`,
    );
  }

  if (context.area && context.area !== "any") {
    const areaToken = normalizeText(context.area);
    if (areaToken && normalizeText(venue.area).includes(areaToken)) {
      reasons.push(
        language === "fr"
          ? `Dans ${getPrimaryArea(venue)}`
          : `In ${getPrimaryArea(venue)}`,
      );
    }
  }

  if (context.mood && venueMatchesMood(venue, context.mood)) {
    const hasMoodKeyword = moodKeywordMap[context.mood].some((keyword) =>
      venueText.includes(keyword),
    );

    reasons.push(
      hasMoodKeyword
        ? language === "fr"
          ? `Bonne affinité avec l'ambiance ${moodLabels[context.mood]}`
          : `${moodLabels[context.mood]} vibe fit`
        : language === "fr"
          ? `Forte affinité avec la catégorie ${moodContextLabels[context.mood]}`
          : `Strong ${moodContextLabels[context.mood]} category fit`,
    );
  }

  if (context.companion) {
    const companionKeywords = companionKeywordMap[context.companion];
    const audienceText = `${normalizeText(venue.audience)} ${normalizeText(venue.description)}`;
    if (companionKeywords.some((keyword) => audienceText.includes(keyword))) {
      reasons.push(
        language === "fr"
          ? `Idéal pour ${companionContextLabels[context.companion]}`
          : `Great with ${companionContextLabels[context.companion]}`,
      );
    }
  }

  if (reasons.length === 0) {
    reasons.push(
      language === "fr"
        ? `Option ${venue.category.toLowerCase()} populaire`
        : `Popular ${venue.category.toLowerCase()} pick`,
    );
  }

  if (reasons.length <= 1 && venue.audience) {
    reasons.push(language === "fr" ? `Idéal pour ${venue.audience}` : `Best for ${venue.audience}`);
  }

  if (reasons.length <= 2 && venue.priceLevel) {
    reasons.push(language === "fr" ? `Prix ${venue.priceLevel}` : `Price ${venue.priceLevel}`);
  }

  if (reasons.length <= 2) {
    reasons.push(
      language === "fr"
        ? `Quartier ${getPrimaryArea(venue)}`
        : `Area ${getPrimaryArea(venue)}`,
    );
  }

  return uniqueReasons(reasons).slice(0, maxReasons);
}
