import type { AppLanguage } from "../i18n/types";

export type Category = {
  slug: string;
  name: string;
  description: string;
};

type VenueTranslation = {
  description: string;
  shortDescription?: string;
  overview?: string;
  vibe?: string;
  vibeSummary?: string;
  audience?: string;
};

export type Venue = {
  // Core fields — always present
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  area: string;
  description: string;

  // Discovery / editorial fields — present in mock data, optional for API venues
  shortDescription?: string;
  overview?: string;
  vibe?: string;
  vibeSummary?: string;
  audience?: string;
  priceLevel?: string;
  bestForTags?: string[];
  searchKeywords?: string[];
  timeOfDay?: Array<"morning" | "afternoon" | "evening" | "late-night">;
  energyLevel?: "low" | "medium" | "high";
  socialLevel?: "low" | "medium" | "high";
  spaceType?: "indoor" | "outdoor" | "mixed";
  coordinates?: {
    lat: number;
    lng: number;
  };
  translations?: Partial<Record<Exclude<AppLanguage, "en">, VenueTranslation>>;

  // Fields sourced from the Supabase venues table (v0 seed data)
  externalId?: string;
  subcategory?: string;
  region?: string;
  neighborhood?: string;
  address?: string;
  googleMapsLink?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  imageUrl?: string;
  isActive?: boolean;
  source?: string;
};

export function getVenueDisplay(
  venue: Venue,
  language: AppLanguage,
): Omit<Venue, "translations"> {
  if (language !== "en" && venue.translations?.[language]) {
    const t = venue.translations[language]!;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { translations: _t, ...base } = venue;
    return { ...base, ...t };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { translations: _t, ...base } = venue;
  return base;
}

export const categories: Category[] = [
  {
    slug: "activities",
    name: "Activities",
    description: "Experiences to break your routine and explore Casablanca.",
  },
  {
    slug: "sports",
    name: "Sports",
    description: "Padel, fitness, and active vibes around town.",
  },
  {
    slug: "gaming",
    name: "Gaming",
    description: "Arcades, lounges, and social gaming spots.",
  },
  {
    slug: "outdoor",
    name: "Outdoor",
    description: "Fresh-air plans around Casablanca neighborhoods.",
  },
  {
    slug: "family",
    name: "Family",
    description: "Kid-friendly venues and family activities.",
  },
];

export const venues: Venue[] = [
  {
    slug: "ocean-drive-padel-club",
    name: "Ocean Drive Padel Club",
    category: "Sports",
    categorySlug: "sports",
    area: "Ain Diab, Casablanca",
    coordinates: { lat: 33.6038, lng: -7.6839 },
    description:
      "Well-maintained padel club with coaching and social match slots.",
    shortDescription:
      "Well-maintained padel club with coaching and social match slots.",
    overview:
      "Ocean Drive Padel Club in Ain Diab is one of the most practical options for players at beginner to intermediate level. Courts are modern, booking is straightforward, and evening slots are usually lively. Beyond coaching sessions, it is also a social place where groups regularly organize friendly matches.",
    vibe: "Active, social, coastal",
    vibeSummary: "High-energy padel sessions with social momentum.",
    audience: "Padel players, friend groups, beginners",
    priceLevel: "$$",
    bestForTags: ["friends", "late-night"],
    searchKeywords: ["jetski", "jet ski", "surf", "surfing", "water sports", "beach activity", "coastal sport", "ain diab activity"],
    timeOfDay: ["afternoon", "evening"],
    energyLevel: "high",
    socialLevel: "high",
    spaceType: "outdoor",
    translations: {
      fr: {
        description:
          "Club de padel bien entretenu avec coaching et créneaux de matchs conviviaux.",
        shortDescription:
          "Club de padel bien entretenu avec coaching et créneaux de matchs conviviaux.",
        overview:
          "Ocean Drive Padel Club à Ain Diab est l'une des options les plus pratiques pour les joueurs de niveau débutant à intermédiaire. Les courts sont modernes, la réservation est simple, et les créneaux du soir sont généralement animés. C'est aussi un lieu social où les groupes organisent régulièrement des matchs amicaux.",
        vibe: "Actif, social, côtier",
        vibeSummary: "Sessions de padel énergiques avec une belle dynamique sociale.",
        audience: "Joueurs de padel, groupes d'amis, débutants",
      },
    },
  },
  {
    slug: "pulse-fit-studio",
    name: "Pulse Fit Studio",
    category: "Sports",
    categorySlug: "sports",
    area: "Bourgogne, Casablanca",
    coordinates: { lat: 33.5869, lng: -7.6514 },
    description:
      "Fitness studio with group classes, strength sessions, and flexible passes.",
    shortDescription:
      "Fitness studio with group classes, strength sessions, and flexible passes.",
    overview:
      "Pulse Fit Studio is a neighborhood-friendly training space in Bourgogne. It combines small group sessions, cardio-focused classes, and basic strength training in one place. The atmosphere is supportive and practical, which makes it a good option for people building a regular routine.",
    vibe: "Motivating, active, community",
    vibeSummary: "Community studio vibe for disciplined training blocks.",
    audience: "Young professionals, beginners, regular trainees",
    priceLevel: "$$",
    bestForTags: ["friends"],
    searchKeywords: ["yoga", "wellness", "fitness", "gym", "workout", "training", "health", "active routine"],
    timeOfDay: ["morning", "evening"],
    energyLevel: "high",
    socialLevel: "medium",
    spaceType: "indoor",
    translations: {
      fr: {
        description:
          "Salle de sport avec cours collectifs, sessions de renforcement et abonnements flexibles.",
        shortDescription:
          "Salle de sport avec cours collectifs, sessions de renforcement et abonnements flexibles.",
        overview:
          "Pulse Fit Studio est un espace d'entraînement de quartier à Bourgogne. Il combine de petits groupes, des cours axés sur le cardio et un renforcement musculaire de base en un seul endroit. L'atmosphère est bienveillante et pratique, ce qui en fait une bonne option pour ceux qui construisent une routine régulière.",
        vibe: "Motivant, actif, communautaire",
        vibeSummary: "Ambiance studio communautaire pour des blocs d'entraînement disciplinés.",
        audience: "Jeunes professionnels, débutants, sportifs réguliers",
      },
    },
  },
  {
    slug: "old-medina-food-walk",
    name: "Old Medina Food Walk",
    category: "Activities",
    categorySlug: "activities",
    area: "Old Medina, Casablanca",
    coordinates: { lat: 33.5994, lng: -7.6177 },
    description:
      "Guided tasting walk through local food spots in the Old Medina.",
    shortDescription:
      "Guided tasting walk through local food spots in the Old Medina.",
    overview:
      "Old Medina Food Walk is a discovery activity built around Casablanca's street-food culture. The route mixes classic snack stops, local vendor stories, and practical context about the area. It is especially good for first-time visitors or residents who want to reconnect with old-city flavors.",
    vibe: "Cultural, local, lively",
    vibeSummary: "Lively cultural route through classic local flavors.",
    audience: "Visitors, food explorers, friends",
    priceLevel: "$",
    bestForTags: ["budget-pick", "friends"],
    timeOfDay: ["afternoon", "evening"],
    energyLevel: "medium",
    socialLevel: "high",
    spaceType: "outdoor",
    translations: {
      fr: {
        description:
          "Balade gourmande guidée à travers les adresses street-food de l'Ancienne Médina.",
        shortDescription:
          "Balade gourmande guidée à travers les adresses street-food de l'Ancienne Médina.",
        overview:
          "Old Medina Food Walk est une activité de découverte construite autour de la culture street-food de Casablanca. Le parcours mêle arrêts snacks classiques, histoires de vendeurs locaux et contexte pratique sur le quartier. Idéal pour les premiers visiteurs ou les résidents qui veulent renouer avec les saveurs de la vieille ville.",
        vibe: "Culturel, local, animé",
        vibeSummary: "Parcours culturel animé à travers les saveurs locales classiques.",
        audience: "Visiteurs, explorateurs culinaires, amis",
      },
    },
  },
  {
    slug: "pixel-arena",
    name: "Pixel Arena",
    category: "Gaming",
    categorySlug: "gaming",
    area: "Gauthier, Casablanca",
    coordinates: { lat: 33.5886, lng: -7.6202 },
    description:
      "Gaming lounge with console stations, mini tournaments, and social play.",
    shortDescription:
      "Gaming lounge with console stations, mini tournaments, and social play.",
    overview:
      "Pixel Arena is a central Gauthier gaming lounge focused on social sessions rather than formal esports. The space offers modern console stations, rotating weekly tournaments, and group-friendly seating. It is a popular evening option for students and young professionals looking for casual entertainment.",
    vibe: "Fun, social, competitive",
    vibeSummary: "Casual-competitive lounge for social gaming nights.",
    audience: "Gamers, students, friend groups",
    priceLevel: "$$",
    bestForTags: ["friends", "late-night"],
    timeOfDay: ["evening", "late-night"],
    energyLevel: "high",
    socialLevel: "high",
    spaceType: "indoor",
    translations: {
      fr: {
        description:
          "Gaming lounge avec consoles, mini-tournois et sessions conviviales.",
        shortDescription:
          "Gaming lounge avec consoles, mini-tournois et sessions conviviales.",
        overview:
          "Pixel Arena est un gaming lounge central à Gauthier axé sur les sessions sociales plutôt que l'esport formel. L'espace propose des consoles modernes, des tournois hebdomadaires rotatifs et des places adaptées aux groupes. C'est une option populaire en soirée pour les étudiants et jeunes professionnels en quête de divertissement casual.",
        vibe: "Fun, social, compétitif",
        vibeSummary: "Lounge casual-compétitif pour les soirées gaming entre amis.",
        audience: "Gamers, étudiants, groupes d'amis",
      },
    },
  },
  {
    slug: "marina-sunset-walk",
    name: "Marina Sunset Walk",
    category: "Outdoor",
    categorySlug: "outdoor",
    area: "Marina, Casablanca",
    coordinates: { lat: 33.6112, lng: -7.6102 },
    description:
      "Waterfront walking route with sea views, especially popular at sunset.",
    shortDescription:
      "Waterfront walking route with sea views, especially popular at sunset.",
    overview:
      "Marina Sunset Walk is a low-effort outdoor plan along the Casablanca waterfront. It is ideal for evening walks, light conversations, and short photo stops near the sea. The route is easy, open, and accessible for most age groups.",
    vibe: "Open-air, calm, scenic",
    vibeSummary: "Scenic waterfront route made for soft sunset moments.",
    audience: "Couples, families, walkers",
    priceLevel: "$",
    bestForTags: ["sunset-spot", "budget-pick", "family-friendly"],
    timeOfDay: ["afternoon", "evening"],
    energyLevel: "low",
    socialLevel: "medium",
    spaceType: "outdoor",
    translations: {
      fr: {
        description:
          "Promenade en bord de mer avec vue sur l'océan, particulièrement appréciée au coucher du soleil.",
        shortDescription:
          "Promenade en bord de mer avec vue sur l'océan, particulièrement appréciée au coucher du soleil.",
        overview:
          "Marina Sunset Walk est un plan outdoor accessible le long du front de mer de Casablanca. Idéal pour les promenades en soirée, les conversations légères et les pauses photo près de la mer. Le parcours est facile, ouvert et accessible à la plupart des tranches d'âge.",
        vibe: "En plein air, calme, panoramique",
        vibeSummary: "Parcours en bord de mer pensé pour les douces heures du coucher de soleil.",
        audience: "Couples, familles, promeneurs",
      },
    },
  },
  {
    slug: "ain-diab-bike-loop",
    name: "Ain Diab Bike Loop",
    category: "Outdoor",
    categorySlug: "outdoor",
    area: "Ain Diab, Casablanca",
    coordinates: { lat: 33.6001, lng: -7.6792 },
    description:
      "Easy cycling route along the coast with sea views and open space.",
    shortDescription:
      "Easy cycling route along the coast with sea views and open space.",
    overview:
      "Ain Diab Bike Loop is a simple outdoor plan for light exercise and fresh air by the coast. The route is flat and beginner-friendly, which makes it suitable for casual riders and weekend group outings. It is especially pleasant in the late afternoon when the area is less hot.",
    vibe: "Fresh-air, active, coastal",
    vibeSummary: "Coastal activity loop with open-air breathing room.",
    audience: "Friends, couples, casual riders",
    priceLevel: "$",
    bestForTags: ["friends", "budget-pick", "sunset-spot"],
    timeOfDay: ["afternoon", "evening"],
    energyLevel: "medium",
    socialLevel: "medium",
    spaceType: "outdoor",
    translations: {
      fr: {
        description:
          "Parcours cyclable facile le long de la côte avec vue sur la mer et grands espaces.",
        shortDescription:
          "Parcours cyclable facile le long de la côte avec vue sur la mer et grands espaces.",
        overview:
          "Ain Diab Bike Loop est un plan outdoor simple pour un exercice léger et de l'air frais au bord de la côte. Le parcours est plat et accessible aux débutants, idéal pour les cyclistes occasionnels et les sorties de groupe du week-end. Il est particulièrement agréable en fin d'après-midi quand le coin est moins chaud.",
        vibe: "Air frais, actif, côtier",
        vibeSummary: "Boucle d'activité côtière avec une belle bouffée d'air pur.",
        audience: "Amis, couples, cyclistes débutants",
      },
    },
  },
  {
    slug: "kids-play-garden",
    name: "Kids Play Garden",
    category: "Family",
    categorySlug: "family",
    area: "Anfa, Casablanca",
    coordinates: { lat: 33.586, lng: -7.6491 },
    description:
      "Family-friendly play area with secure zones and parent seating.",
    shortDescription:
      "Family-friendly play area with secure zones and parent seating.",
    overview:
      "Kids Play Garden in Anfa is built for families who want a simple and safe weekend outing. It combines outdoor play areas, shaded seating for parents, and snack options nearby. The place is most active in late afternoons and weekends.",
    vibe: "Family, safe, relaxed",
    vibeSummary: "Secure family plan with low-friction weekend rhythm.",
    audience: "Parents, children, family groups",
    priceLevel: "$",
    bestForTags: ["family-friendly", "budget-pick"],
    timeOfDay: ["afternoon"],
    energyLevel: "medium",
    socialLevel: "medium",
    spaceType: "outdoor",
    translations: {
      fr: {
        description:
          "Espace de jeux familial avec zones sécurisées et sièges pour les parents.",
        shortDescription:
          "Espace de jeux familial avec zones sécurisées et sièges pour les parents.",
        overview:
          "Kids Play Garden à Anfa est conçu pour les familles qui veulent une sortie week-end simple et sécurisée. Il combine des espaces de jeux en plein air, des sièges ombragés pour les parents et des options snacks à proximité. Le lieu est plus actif en fin d'après-midi et les week-ends.",
        vibe: "Familial, sécurisé, détendu",
        vibeSummary: "Plan familial sécurisé avec un rythme week-end sans friction.",
        audience: "Parents, enfants, groupes familiaux",
      },
    },
  },
  {
    slug: "anfa-family-workshop-house",
    name: "Anfa Family Workshop House",
    category: "Family",
    categorySlug: "family",
    area: "Anfa, Casablanca",
    coordinates: { lat: 33.5848, lng: -7.6459 },
    description:
      "Weekend creative workshops for kids with parent-friendly seating.",
    shortDescription:
      "Weekend creative workshops for kids with parent-friendly seating.",
    overview:
      "Anfa Family Workshop House offers hands-on creative activities for children, including drawing and small craft sessions. Parents can stay on-site in a comfortable supervised environment. It is a practical family option for calm weekend plans in Casablanca.",
    vibe: "Creative, family, welcoming",
    vibeSummary: "Creative indoor sessions for kids and parents.",
    audience: "Parents, children, family groups",
    priceLevel: "$$",
    bestForTags: ["family-friendly"],
    searchKeywords: ["pottery", "ceramics", "clay", "art workshop", "creative workshop", "family workshop", "kids workshop"],
    timeOfDay: ["afternoon"],
    energyLevel: "medium",
    socialLevel: "medium",
    spaceType: "indoor",
    translations: {
      fr: {
        description:
          "Ateliers créatifs du week-end pour enfants avec espace confort pour les parents.",
        shortDescription:
          "Ateliers créatifs du week-end pour enfants avec espace confort pour les parents.",
        overview:
          "Anfa Family Workshop House propose des activités créatives manuelles pour les enfants, notamment du dessin et de petits travaux artisanaux. Les parents peuvent rester sur place dans un environnement supervisé et confortable. C'est une option familiale pratique pour des plans week-end calmes à Casablanca.",
        vibe: "Créatif, familial, accueillant",
        vibeSummary: "Sessions créatives en intérieur pour les enfants et les parents.",
        audience: "Parents, enfants, groupes familiaux",
      },
    },
  },
  {
    slug: "weekend-social-hub",
    name: "Weekend Social Hub",
    category: "Activities",
    categorySlug: "activities",
    area: "Maarif, Casablanca",
    coordinates: { lat: 33.5757, lng: -7.6348 },
    description:
      "Group-friendly hangout with games, music, and shared tables.",
    shortDescription:
      "Group-friendly hangout with games, music, and shared tables.",
    overview:
      "Weekend Social Hub is a flexible meet-up spot in Maarif for casual group plans. It combines shared seating, light activities, and music in a social but easygoing environment. It works well for after-work meetups and weekend nights with friends.",
    vibe: "Social, casual, lively",
    vibeSummary: "Casual social hub for flexible group plans.",
    audience: "Friend groups, students, young professionals",
    priceLevel: "$$",
    bestForTags: ["friends", "late-night"],
    searchKeywords: ["karting", "go kart", "go-kart", "racing", "karting night", "group activity", "weekend activity"],
    timeOfDay: ["evening", "late-night"],
    energyLevel: "medium",
    socialLevel: "high",
    spaceType: "indoor",
    translations: {
      fr: {
        description:
          "Lieu de retrouvailles convivial avec jeux, musique et tables partagées.",
        shortDescription:
          "Lieu de retrouvailles convivial avec jeux, musique et tables partagées.",
        overview:
          "Weekend Social Hub est un lieu de rendez-vous flexible à Maarif pour les plans de groupe casual. Il combine des sièges partagés, des activités légères et de la musique dans une ambiance sociale mais décontractée. Idéal pour les after-work et les soirées du week-end entre amis.",
        vibe: "Social, casual, animé",
        vibeSummary: "Hub social casual pour les plans de groupe flexibles.",
        audience: "Groupes d'amis, étudiants, jeunes professionnels",
      },
    },
  },
];

export const featuredVenueSlugs = [
  "ocean-drive-padel-club",
  "pixel-arena",
];
