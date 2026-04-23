import { type Venue } from "./mockData";
import type { AppLanguage } from "../i18n/types";

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

type CollectionTranslation = {
  title: string;
  subtitle: string;
  description: string;
  whyItMatters: string;
  explanationChips?: string[];
  theme?: EditorialTheme;
  cta?: { label: string };
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
  translations?: Partial<Record<Exclude<AppLanguage, "en">, CollectionTranslation>>;
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
    translations: {
      fr: {
        title: "Les meilleurs spots pour un premier rendez-vous",
        subtitle: "Des endroits sans pression où la conversation vient naturellement.",
        description:
          "Un mélange équilibré de tables douillettes, de rooftops calmes et de promenades vue sur mer pour un premier rendez-vous qui se passe bien.",
        whyItMatters:
          "Les meilleurs premiers rendez-vous à Casablanca sont simples : un lieu avec une énergie confortable, assez d'ambiance et sans pression.",
        theme: { mood: "Romantique", budget: "Varié" },
        explanationChips: ["Propice à la conversation", "Énergie calme", "Prêt pour le soir"],
        cta: { label: "Planifier ce rendez-vous" },
      },
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
    translations: {
      fr: {
        title: "Moins de 100 MAD",
        subtitle: "Des plans en ville de qualité, adaptés à un petit budget.",
        description:
          "Une liste budget pour les jours où vous voulez de la qualité sans trop dépenser. Parfait pour les étudiants et les sorties casual en semaine.",
        whyItMatters:
          "Économique ne veut pas dire ennuyeux. Casablanca offre de nombreux plans abordables qui restent sociaux, locaux et mémorables.",
        theme: { budget: "Faible" },
        explanationChips: ["Petit budget", "Casual", "Facile à répéter"],
        cta: { label: "Chercher des idées abordables" },
      },
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
    translations: {
      fr: {
        title: "Cafés tranquilles pour travailler",
        subtitle: "Des sélections laptop-friendly pour les heures de concentration et les réunions.",
        description:
          "Des cafés calmes avec une ambiance concentrée pour le télétravail, les réunions clients ou le travail en solo au cœur de la ville.",
        whyItMatters:
          "Quand votre environnement est calme, votre journée se déroule mieux. Ces adresses vous aident à rester productif sans quitter la vie citadine.",
        theme: { mood: "Détente", area: "Central" },
        explanationChips: ["Adapté aux laptops", "Ambiance calme", "Qualité du café"],
        cta: { label: "Explorer l'ambiance détente" },
      },
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
    translations: {
      fr: {
        title: "Spots coucher de soleil",
        subtitle: "Des lieux golden hour et des routes côtières au crépuscule.",
        description:
          "Conçu pour les plans en fin d'après-midi : commencez en extérieur près de la mer et terminez par une pause café ou repas détendue.",
        whyItMatters:
          "Le coucher de soleil est l'une des plus belles ambiances de Casablanca. Choisir les bons spots transforme une soirée ordinaire en souvenir.",
        theme: { mood: "Romantique", area: "Côtier" },
        explanationChips: ["Vue sur mer", "Propice à l'après-midi", "Photo-worthy"],
        cta: { label: "Voir sur la carte" },
      },
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
    translations: {
      fr: {
        title: "Plans décontractés entre amis",
        subtitle: "Des sélections conviviales avec une énergie sociale.",
        description:
          "Pour les plans de groupe spontanés : gaming social, sessions actives et endroits animés où tout le monde peut s'impliquer.",
        whyItMatters:
          "Les meilleurs plans entre amis sont flexibles. Ces lieux facilitent le rassemblement, les déplacements et les soirées simples.",
        theme: { mood: "Social" },
        explanationChips: ["Idéal en groupe", "Ambiance sociale", "Parfait le week-end"],
        cta: { label: "Planifier une sortie entre amis" },
      },
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
    translations: {
      fr: {
        title: "Espaces intérieurs cosy",
        subtitle: "Des endroits confort pour les jours plus frais ou les soirées tranquilles.",
        description:
          "Des lieux intérieurs avec une atmosphère chaleureuse, propices aux longues conversations, dîners faciles et pauses détendues en ville.",
        whyItMatters:
          "Tous les bons plans n'ont pas besoin de mouvement. Parfois, la bonne ambiance intérieure est le plan en soi.",
        theme: { mood: "Détente", budget: "Moyen" },
        explanationChips: ["Ambiance chaleureuse", "Conversation en priorité", "Toutes conditions"],
      },
    },
  },
];

export const featuredEditorialCollections = editorialCollections.filter(
  (collection) => collection.featured,
);

export function getEditorialCollectionBySlug(slug?: string) {
  if (!slug) {
    return undefined;
  }

  return editorialCollections.find((collection) => collection.slug === slug);
}

export function getCollectionDisplay(
  collection: EditorialCollection,
  language: AppLanguage,
): Omit<EditorialCollection, "translations"> {
  if (language !== "en" && collection.translations?.[language]) {
    const t = collection.translations[language]!;
    return {
      ...collection,
      title: t.title ?? collection.title,
      subtitle: t.subtitle ?? collection.subtitle,
      description: t.description ?? collection.description,
      whyItMatters: t.whyItMatters ?? collection.whyItMatters,
      explanationChips: t.explanationChips ?? collection.explanationChips,
      theme: t.theme ? { ...collection.theme, ...t.theme } : collection.theme,
      cta: t.cta && collection.cta ? { ...collection.cta, label: t.cta.label } : collection.cta,
    };
  }
  return collection;
}

export function resolveEditorialCollectionVenues(
  collection: EditorialCollection,
  venues: Venue[],
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
    const hasAreaMatch = rule.areaIncludes.some((value) =>
      normalizedArea.includes(normalize(value)),
    );
    if (!hasAreaMatch) {
      return false;
    }
  }

  if (rule.vibeIncludes?.length) {
    const normalizedVibe = normalize(venue.vibe ?? "");
    const hasVibeMatch = rule.vibeIncludes.some((value) =>
      normalizedVibe.includes(normalize(value)),
    );
    if (!hasVibeMatch) {
      return false;
    }
  }

  if (rule.audienceIncludes?.length) {
    const normalizedAudience = normalize(venue.audience ?? "");
    const hasAudienceMatch = rule.audienceIncludes.some((value) =>
      normalizedAudience.includes(normalize(value)),
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
