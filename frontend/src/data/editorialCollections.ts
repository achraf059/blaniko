import { type Venue } from "./mockData";

export type EditorialSelectionRule = {
  categorySlugs?: string[];
  areaIncludes?: string[];
  priceLevels?: string[];
  vibeIncludes?: string[];
  audienceIncludes?: string[];
  maxItems?: number;
};

export type EditorialTheme = {
  mood?: string;
  area?: string;
  budget?: string;
};

export type EditorialCollection = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  whyItMatters: string;
  theme?: EditorialTheme;
  explanationChips?: string[];
  venueSlugs?: string[];
  selectionRule?: EditorialSelectionRule;
  featured?: boolean;
  cta?: {
    label: string;
    href: string;
  };
};

export const editorialCollections: EditorialCollection[] = [
  {
    id: "best-first-date-spots",
    slug: "best-first-date-spots",
    title: "Best first-date spots",
    subtitle: "Low-pressure places where conversation is easy.",
    description:
      "A balanced mix of cozy dinner tables, calm rooftops, and sea-view walks for a first date that feels natural.",
    whyItMatters:
      "The best first dates in Casablanca are simple: a place with comfortable energy, enough ambiance, and no pressure to perform.",
    theme: {
      mood: "romantic",
      budget: "mixed",
    },
    explanationChips: ["Conversation-friendly", "Calm energy", "Evening-ready"],
    venueSlugs: [
      "moonlight-bistro",
      "skyline-rooftop-cafe",
      "marina-sunset-walk",
      "beldi-table-kitchen",
    ],
    featured: true,
    cta: {
      label: "Plan this date flow",
      href: "/plan?mood=romantic&with=partner",
    },
  },
  {
    id: "under-100-mad",
    slug: "under-100-mad",
    title: "Under 100 MAD",
    subtitle: "Good city plans that stay budget-conscious.",
    description:
      "A curated budget list for days when you want quality without overspending. Great for students and casual weekday outings.",
    whyItMatters:
      "Budget-friendly does not mean boring. Casablanca has many low-cost plans that still feel social, local, and memorable.",
    theme: {
      budget: "low",
    },
    explanationChips: ["Low spend", "Casual", "Easy to repeat"],
    selectionRule: {
      priceLevels: ["$"],
      maxItems: 6,
    },
    featured: true,
    cta: {
      label: "Search low-budget ideas",
      href: "/search?budget=low",
    },
  },
  {
    id: "chill-cafes-to-work-from",
    slug: "chill-cafes-to-work-from",
    title: "Chill cafés to work from",
    subtitle: "Laptop-friendly picks for focus hours and meetings.",
    description:
      "Quiet café options with a focused vibe for remote work blocks, client meetings, or solo deep work in the city.",
    whyItMatters:
      "When your environment is calm, your day flows better. These spots help you stay productive without leaving city life.",
    theme: {
      mood: "chill",
      area: "central",
    },
    explanationChips: ["Laptop-friendly", "Quiet vibe", "Coffee quality"],
    venueSlugs: ["bean-district", "skyline-rooftop-cafe"],
    selectionRule: {
      categorySlugs: ["cafes"],
      audienceIncludes: ["remote", "freelancers", "professionals"],
      maxItems: 5,
    },
    featured: true,
    cta: {
      label: "Open chill mood discovery",
      href: "/search?mood=chill",
    },
  },
  {
    id: "sunset-places",
    slug: "sunset-places",
    title: "Sunset places",
    subtitle: "Golden-hour venues and coastal afterglow routes.",
    description:
      "Built for late afternoon plans: start outside near the sea and end with a relaxed food or coffee stop.",
    whyItMatters:
      "Sunset is one of Casablanca's strongest moods. Picking the right spots turns a normal evening into a memorable one.",
    theme: {
      mood: "romantic",
      area: "coast",
    },
    explanationChips: ["Sea views", "Late-afternoon friendly", "Photo-worthy"],
    venueSlugs: ["marina-sunset-walk", "skyline-rooftop-cafe", "ain-diab-bike-loop"],
    selectionRule: {
      areaIncludes: ["ain diab", "marina"],
      maxItems: 5,
    },
    cta: {
      label: "See these on map",
      href: "/map",
    },
  },
  {
    id: "casual-plans-with-friends",
    slug: "casual-plans-with-friends",
    title: "Casual plans with friends",
    subtitle: "Group-friendly picks with social energy.",
    description:
      "For spontaneous group plans: social gaming, active sessions, and lively spots where everyone can plug in.",
    whyItMatters:
      "The strongest friend plans are flexible. These venues make it easy to gather, move, and keep the night simple.",
    theme: {
      mood: "social",
    },
    explanationChips: ["Group-ready", "Social vibe", "Weekend-safe"],
    venueSlugs: [
      "weekend-social-hub",
      "pixel-arena",
      "ocean-drive-padel-club",
      "old-medina-food-walk",
    ],
    cta: {
      label: "Build a friends outing",
      href: "/plan?mood=social&with=friends",
    },
  },
  {
    id: "cozy-indoor-spots",
    slug: "cozy-indoor-spots",
    title: "Cozy indoor spots",
    subtitle: "Comfort-first places for cooler days or slow evenings.",
    description:
      "Indoor venues with warm atmospheres, suitable for long conversations, easy dinners, and relaxed city breaks.",
    whyItMatters:
      "Not every good plan needs movement. Sometimes the right indoor atmosphere is the plan itself.",
    theme: {
      mood: "chill",
      budget: "mid",
    },
    explanationChips: ["Warm ambiance", "Conversation-first", "All-weather"],
    venueSlugs: ["moonlight-bistro", "beldi-table-kitchen", "bean-district"],
  },
];

export const featuredEditorialCollections = editorialCollections.filter(
  (collection) => collection.featured
);

export function getEditorialCollectionBySlug(slug?: string) {
  if (!slug) {
    return undefined;
  }

  return editorialCollections.find((collection) => collection.slug === slug);
}

export function resolveEditorialCollectionVenues(
  collection: EditorialCollection,
  venues: Venue[]
): Venue[] {
  const deduped = new Map<string, Venue>();

  if (collection.venueSlugs?.length) {
    collection.venueSlugs.forEach((slug) => {
      const venue = venues.find((item) => item.slug === slug);
      if (venue) {
        deduped.set(venue.slug, venue);
      }
    });
  }

  const selectionRule = collection.selectionRule;
  if (selectionRule) {
    const ruleMatches = venues.filter((venue) => venueMatchesRule(venue, selectionRule));
    ruleMatches.forEach((venue) => {
      if (!deduped.has(venue.slug)) {
        deduped.set(venue.slug, venue);
      }
    });
  }

  const resolved = [...deduped.values()];
  const maxItems = collection.selectionRule?.maxItems;
  return typeof maxItems === "number" ? resolved.slice(0, maxItems) : resolved;
}

function venueMatchesRule(venue: Venue, rule: EditorialSelectionRule): boolean {
  if (rule.categorySlugs?.length && !rule.categorySlugs.includes(venue.categorySlug)) {
    return false;
  }

  if (rule.priceLevels?.length) {
    const level = (venue.priceLevel ?? "").trim();
    if (!rule.priceLevels.includes(level)) {
      return false;
    }
  }

  if (rule.areaIncludes?.length) {
    const normalizedArea = normalize(venue.area);
    const hasAreaMatch = rule.areaIncludes.some((value) => normalizedArea.includes(normalize(value)));
    if (!hasAreaMatch) {
      return false;
    }
  }

  if (rule.vibeIncludes?.length) {
    const normalizedVibe = normalize(venue.vibe ?? "");
    const hasVibeMatch = rule.vibeIncludes.some((value) => normalizedVibe.includes(normalize(value)));
    if (!hasVibeMatch) {
      return false;
    }
  }

  if (rule.audienceIncludes?.length) {
    const normalizedAudience = normalize(venue.audience ?? "");
    const hasAudienceMatch = rule.audienceIncludes.some((value) =>
      normalizedAudience.includes(normalize(value))
    );
    if (!hasAudienceMatch) {
      return false;
    }
  }

  return true;
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}