import { type Venue } from "../data/mockData";

export type DiscoveryMood = "chill" | "social" | "active" | "romantic" | "family-friendly";

export type DiscoveryCompanion = "alone" | "friends" | "family" | "partner";

type MatchContext = {
  query?: string;
  category?: string;
  budget?: string;
  mood?: DiscoveryMood;
  companion?: DiscoveryCompanion;
  area?: string;
};

export const discoveryMoodLabel: Record<DiscoveryMood, string> = {
  chill: "Chill",
  social: "Social",
  active: "Active",
  romantic: "Romantic",
  "family-friendly": "Family-friendly",
};

export const discoveryCompanionLabel: Record<DiscoveryCompanion, string> = {
  alone: "Alone",
  friends: "Friends",
  family: "Family",
  partner: "Partner",
};

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

const companionLabelMap: Record<DiscoveryCompanion, string> = {
  alone: "solo plans",
  friends: "friend groups",
  family: "families",
  partner: "date plans",
};

const moodLabelMap: Record<DiscoveryMood, string> = {
  chill: "chill",
  social: "social",
  active: "active",
  romantic: "romantic",
  "family-friendly": "family-friendly",
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
  maxReasons = 3
): string[] {
  const reasons: string[] = [];
  const venueText = getVenueSearchText(venue);

  const query = normalizeText(context.query);
  if (query.length >= 2 && venueText.includes(query)) {
    reasons.push(`Matches “${context.query?.trim()}”`);
  }

  if (context.category && venue.categorySlug === context.category) {
    reasons.push(`${venue.category} match`);
  }

  if (context.budget && context.budget !== "all" && venue.priceLevel === context.budget) {
    reasons.push(`In your ${context.budget} budget`);
  }

  if (context.area && context.area !== "any") {
    const areaToken = normalizeText(context.area);
    if (areaToken && normalizeText(venue.area).includes(areaToken)) {
      reasons.push(`In ${getPrimaryArea(venue)}`);
    }
  }

  if (context.mood && venueMatchesMood(venue, context.mood)) {
    const hasMoodKeyword = moodKeywordMap[context.mood].some((keyword) =>
      venueText.includes(keyword)
    );

    reasons.push(
      hasMoodKeyword
        ? `${discoveryMoodLabel[context.mood]} vibe fit`
        : `Strong ${moodLabelMap[context.mood]} category fit`
    );
  }

  if (context.companion) {
    const companionKeywords = companionKeywordMap[context.companion];
    const audienceText = `${normalizeText(venue.audience)} ${normalizeText(venue.description)}`;
    if (companionKeywords.some((keyword) => audienceText.includes(keyword))) {
      reasons.push(`Great with ${companionLabelMap[context.companion]}`);
    }
  }

  if (reasons.length === 0) {
    reasons.push(`Popular ${venue.category.toLowerCase()} pick`);
  }

  if (reasons.length <= 1 && venue.audience) {
    reasons.push(`Best for ${venue.audience}`);
  }

  if (reasons.length <= 2 && venue.priceLevel) {
    reasons.push(`Price ${venue.priceLevel}`);
  }

  if (reasons.length <= 2) {
    reasons.push(`Area ${getPrimaryArea(venue)}`);
  }

  return uniqueReasons(reasons).slice(0, maxReasons);
}
