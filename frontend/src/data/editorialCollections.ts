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
  /** Display-only fields added for the Guides redesign. */
  image?: string;
  badge?: { label: string; mood: string };
  badgeFr?: { label: string };
  time?: string;
  level?: string;
  levelFr?: string;
  moods?: string[];
  translations?: Partial<Record<Exclude<AppLanguage, "en">, CollectionTranslation>>;
};

export const editorialCollections: EditorialCollection[] = [
  {
    id: "date-friendly-activity-ideas",
    slug: "date-friendly-activity-ideas",
    title: "Date-friendly activity ideas",
    subtitle: "Easy plans for two that are more memorable than scrolling for ideas.",
    description:
      "From relaxed outdoor spots to playful activities, these picks help you plan something simple, social, and a little more special.",
    whyItMatters:
      "A good date plan does not need to be complicated. The right setting, the right pace, and one shared activity can make the outing feel intentional.",
    explanationChips: ["For two", "Low pressure", "Easy to plan"],
    selectionRule: {
      categorySlugs: ["activities", "outdoor", "sports"],
      maxItems: 6,
    },
    featured: true,
    image: "/homepage/hero/hero-padel-ocean-drive.webp",
    badge: { label: "Date night", mood: "date" },
    badgeFr: { label: "Soirée duo" },
    time: "2–3h",
    level: "Easy",
    levelFr: "Facile",
    moods: ["date", "outdoor", "sunset"],
    cta: {
      label: "Browse date-friendly ideas",
      href: "/categories?bestFor=date-spot",
    },
    translations: {
      fr: {
        title: "Idées d'activités en duo",
        subtitle: "Des plans simples à deux, plus mémorables que de chercher des idées.",
        description:
          "Entre spots en plein air et activités ludiques, ces idées aident à organiser une sortie simple, agréable et un peu plus spéciale.",
        whyItMatters:
          "Un bon plan à deux n'a pas besoin d'être compliqué. Le bon cadre, le bon rythme et une activité partagée peuvent rendre la sortie plus intentionnelle.",
        explanationChips: ["À deux", "Sans pression", "Facile à organiser"],
        cta: { label: "Explorer les idées en duo" },
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
    image: "/picks-images/pool-night/pick-pool-night-01.webp",
    badge: { label: "Budget pick", mood: "budget" },
    badgeFr: { label: "Petit budget" },
    time: "3–4h",
    level: "Easy",
    levelFr: "Facile",
    moods: ["budget", "outdoor", "friends", "weekend"],
    cta: {
      label: "Browse more venues",
      href: "/categories",
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
        cta: { label: "Découvrir plus de lieux" },
      },
    },
  },
  {
    id: "indoor-plans-slow-days",
    slug: "indoor-plans-slow-days",
    title: "Indoor plans for slow days",
    subtitle: "Low-key activity picks when you want to stay out of the sun.",
    description:
      "Escape rooms, billiards, gaming lounges, and indoor activities — Casablanca has a solid indoor scene for the days you need a plan but not a big one.",
    whyItMatters:
      "Not every outing needs a full itinerary. A good indoor spot in the right part of the city is enough to make a slow day feel worthwhile.",
    explanationChips: ["No weather dependency", "Easy to extend", "Group or solo"],
    selectionRule: {
      categorySlugs: ["activities", "gaming"],
      maxItems: 6,
    },
    featured: true,
    image: "/picks-images/escape-room-challenge/pick-escape-room-challenge-01.webp",
    badge: { label: "Indoor", mood: "indoor" },
    badgeFr: { label: "Intérieur" },
    time: "2–4h",
    level: "Easy",
    levelFr: "Facile",
    moods: ["indoor", "friends", "weekend"],
    cta: {
      label: "Browse indoor picks",
      href: "/categories/activities",
    },
    translations: {
      fr: {
        title: "Plans intérieurs pour les jours calmes",
        subtitle: "Des activités tranquilles pour rester à l'abri du soleil.",
        description:
          "Escape games, billard, lounges gaming et activités intérieures — Casablanca offre une bonne scène indoor pour les jours où vous voulez sortir sans faire grand chose.",
        whyItMatters:
          "Tous les plans n'ont pas besoin d'un itinéraire complet. Un bon endroit intérieur dans le bon quartier suffit à rendre une journée calme mémorable.",
        explanationChips: ["Sans contrainte météo", "Facile à prolonger", "En groupe ou solo"],
        cta: { label: "Explorer les plans intérieurs" },
      },
    },
  },
  {
    id: "sunset-places",
    slug: "sunset-places",
    title: "Sunset spots by the coast",
    subtitle: "Easy end-of-day ideas around Ain Diab and the Marina.",
    description:
      "Coastal and open-air picks for golden-hour walks, relaxed activities, and simple evening plans near the water.",
    whyItMatters:
      "A sunset plan works best when the location does most of the work. These picks keep the outing simple, scenic, and easy to extend.",
    explanationChips: ["Golden hour", "Coastal areas", "Easy evening plan"],
    selectionRule: {
      areaIncludes: ["ain diab", "marina"],
      maxItems: 6,
    },
    image: "/picks-images/slow-morning-corniche/pick-slow-morning-corniche-01.webp",
    badge: { label: "Sunset", mood: "sunset" },
    badgeFr: { label: "Coucher de soleil" },
    time: "1–2h",
    level: "Easy",
    levelFr: "Facile",
    moods: ["sunset", "outdoor", "date"],
    cta: {
      label: "Browse sunset ideas",
      href: "/categories?bestFor=sunset-spot",
    },
    translations: {
      fr: {
        title: "Spots sunset près de la côte",
        subtitle: "Des idées simples en fin de journée autour d'Ain Diab et de la Marina.",
        description:
          "Des lieux côtiers et en plein air pour les balades au coucher du soleil, les activités calmes et les plans du soir près de l'eau.",
        whyItMatters:
          "Un bon plan sunset fonctionne mieux quand le lieu fait une grande partie du travail. Ces idées gardent la sortie simple, agréable et facile à prolonger.",
        explanationChips: ["Golden hour", "Zones côtières", "Plan du soir facile"],
        cta: { label: "Explorer les idées sunset" },
      },
    },
  },
  {
    id: "casual-plans-with-friends",
    slug: "casual-plans-with-friends",
    title: "Casual plans with friends",
    subtitle: "Easy group ideas when everyone says they don't know.",
    description:
      "Simple activity picks for friend groups who want something social, flexible, and easy to organize in Casablanca.",
    whyItMatters:
      "The hardest part of a group outing is choosing. These picks keep the plan simple while still giving everyone something to do together.",
    explanationChips: ["Group-friendly", "Easy to organize", "Flexible timing"],
    selectionRule: {
      categorySlugs: ["activities", "gaming", "sports"],
      maxItems: 6,
    },
    image: "/picks-images/bumper-cars-night/pick-bumper-cars-night-01.webp",
    badge: { label: "Friends", mood: "friends" },
    badgeFr: { label: "Entre amis" },
    time: "2–4h",
    level: "Easy",
    levelFr: "Facile",
    moods: ["friends", "indoor", "weekend"],
    cta: {
      label: "Browse group ideas",
      href: "/categories?bestFor=friends",
    },
    translations: {
      fr: {
        title: "Plans simples entre amis",
        subtitle: "Des idées faciles quand tout le monde dit « je ne sais pas ».",
        description:
          "Des activités simples pour les groupes d'amis qui veulent une sortie sociale, flexible et facile à organiser à Casablanca.",
        whyItMatters:
          "Le plus difficile dans une sortie de groupe, c'est de choisir. Ces idées gardent le plan simple tout en donnant à tout le monde quelque chose à faire ensemble.",
        explanationChips: ["Entre amis", "Facile à organiser", "Horaires flexibles"],
        cta: { label: "Explorer les idées de groupe" },
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

  // V3 price safety: priceLevels filtering disabled until verified prices exist.
  // if (rule.priceLevels?.length) {
  //   const level = (venue.priceLevel ?? "").trim();
  //   if (!rule.priceLevels.includes(level)) {
  //     return false;
  //   }
  // }

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
