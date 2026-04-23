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
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  area: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  description: string;
  shortDescription?: string;
  overview?: string;
  vibe?: string;
  vibeSummary?: string;
  audience?: string;
  priceLevel?: string;
  bestForTags?: string[];
  timeOfDay?: Array<"morning" | "afternoon" | "evening" | "late-night">;
  energyLevel?: "low" | "medium" | "high";
  socialLevel?: "low" | "medium" | "high";
  spaceType?: "indoor" | "outdoor" | "mixed";
  translations?: Partial<Record<Exclude<AppLanguage, "en">, VenueTranslation>>;
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
    slug: "cafes",
    name: "Cafes",
    description: "Coffee spots and chill city corners across Casablanca.",
  },
  {
    slug: "restaurants",
    name: "Restaurants",
    description: "Local favorites and modern dining places in the city.",
  },
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
  {
    slug: "couples",
    name: "Couples",
    description: "Date ideas and cozy places for two.",
  },
  {
    slug: "friends",
    name: "Friends",
    description: "Group plans and weekend hangout places.",
  },
];

export const venues: Venue[] = [
  {
    slug: "skyline-rooftop-cafe",
    name: "Skyline Rooftop Cafe",
    category: "Cafes",
    categorySlug: "cafes",
    area: "Maarif, Casablanca",
    coordinates: { lat: 33.5763, lng: -7.6333 },
    description:
      "Rooftop coffee spot with sunset views and a calm city atmosphere.",
    shortDescription:
      "Rooftop coffee spot with sunset views and a calm city atmosphere.",
    overview:
      "Skyline Rooftop Cafe is a reliable address in Maarif for coffee meetings, remote work sessions, and relaxed evening catch-ups. The rooftop setting gives open views over the neighborhood, especially around sunset. Service is simple and friendly, with a menu focused on coffee, fresh drinks, and light snacks.",
    vibe: "Calm, rooftop, modern",
    vibeSummary: "Relaxed rooftop energy with a polished city view.",
    audience: "Remote workers, couples, small groups",
    priceLevel: "$$",
    bestForTags: ["sunset-spot", "solo-coffee", "date-spot"],
    timeOfDay: ["afternoon", "evening"],
    energyLevel: "low",
    socialLevel: "medium",
    spaceType: "mixed",
    translations: {
      fr: {
        description:
          "Café en rooftop avec vue sur le coucher de soleil et une atmosphère urbaine calme.",
        shortDescription:
          "Café en rooftop avec vue sur le coucher de soleil et une atmosphère urbaine calme.",
        overview:
          "Skyline Rooftop Cafe est une adresse fiable à Maarif pour les réunions café, le télétravail et les soirées décontractées. Le cadre en rooftop offre une vue dégagée sur le quartier, surtout au coucher du soleil. Le service est simple et agréable, avec une carte axée sur le café, les boissons fraîches et les snacks légers.",
        vibe: "Calme, rooftop, moderne",
        vibeSummary: "Énergie rooftop détendue avec une vue citadine soignée.",
        audience: "Télétravailleurs, couples, petits groupes",
      },
    },
  },
  {
    slug: "bean-district",
    name: "Bean District",
    category: "Cafes",
    categorySlug: "cafes",
    area: "Gauthier, Casablanca",
    coordinates: { lat: 33.5894, lng: -7.6212 },
    description:
      "Specialty coffee address with a quiet space for work and meetings.",
    shortDescription:
      "Specialty coffee address with a quiet space for work and meetings.",
    overview:
      "Bean District is a compact specialty cafe in Gauthier known for consistent espresso and a focused atmosphere. It works well for short laptop sessions, client meetings, or a quick coffee break in central Casablanca. Seating is limited at peak times, so mornings are usually the best for a quieter experience.",
    vibe: "Minimal, focused, quiet",
    vibeSummary: "Focused specialty café for deep-work sessions.",
    audience: "Coffee enthusiasts, freelancers, professionals",
    priceLevel: "$$",
    bestForTags: ["work-friendly", "solo-coffee"],
    timeOfDay: ["morning", "afternoon"],
    energyLevel: "low",
    socialLevel: "low",
    spaceType: "indoor",
    translations: {
      fr: {
        description:
          "Adresse café spécialisé avec un espace calme pour travailler et se réunir.",
        shortDescription:
          "Adresse café spécialisé avec un espace calme pour travailler et se réunir.",
        overview:
          "Bean District est un café spécialisé compact à Gauthier, reconnu pour son espresso constant et son atmosphère concentrée. Idéal pour les courtes sessions laptop, les réunions clients ou une pause café rapide au centre de Casablanca. Les places sont limitées aux heures de pointe ; les matins offrent généralement l'expérience la plus calme.",
        vibe: "Minimal, concentré, calme",
        vibeSummary: "Café spécialisé concentré pour les sessions de travail intensives.",
        audience: "Amateurs de café, freelancers, professionnels",
      },
    },
  },
  {
    slug: "beldi-table-kitchen",
    name: "Beldi Table Kitchen",
    category: "Restaurants",
    categorySlug: "restaurants",
    area: "Racine, Casablanca",
    coordinates: { lat: 33.5921, lng: -7.6265 },
    description:
      "Modern Moroccan restaurant with seasonal dishes and warm service.",
    shortDescription:
      "Modern Moroccan restaurant with seasonal dishes and warm service.",
    overview:
      "Beldi Table Kitchen offers a contemporary Moroccan menu in a relaxed Racine setting. The space is suitable for both casual dinners and small celebrations, with a clear focus on local flavors and fresh ingredients. It is a practical choice for people looking for a modern restaurant experience without a formal atmosphere.",
    vibe: "Warm, local, contemporary",
    vibeSummary: "Warm modern Moroccan dining with a polished feel.",
    audience: "Couples, families, food lovers",
    priceLevel: "$$$",
    bestForTags: ["date-spot", "family-friendly"],
    timeOfDay: ["evening"],
    energyLevel: "medium",
    socialLevel: "medium",
    spaceType: "indoor",
    translations: {
      fr: {
        description:
          "Restaurant marocain moderne avec des plats de saison et un service chaleureux.",
        shortDescription:
          "Restaurant marocain moderne avec des plats de saison et un service chaleureux.",
        overview:
          "Beldi Table Kitchen propose une carte marocaine contemporaine dans un cadre décontracté à Racine. L'espace convient aux dîners informels comme aux petites célébrations, avec un accent clair sur les saveurs locales et les produits frais. C'est un bon choix pour ceux qui recherchent une expérience restaurant moderne sans atmosphère formelle.",
        vibe: "Chaleureux, local, contemporain",
        vibeSummary: "Gastronomie marocaine moderne chaleureuse avec une touche soignée.",
        audience: "Couples, familles, amateurs de bonne cuisine",
      },
    },
  },
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
    slug: "moonlight-bistro",
    name: "Moonlight Bistro",
    category: "Couples",
    categorySlug: "couples",
    area: "Racine, Casablanca",
    coordinates: { lat: 33.5906, lng: -7.6292 },
    description:
      "Cozy dinner address with soft lighting and a date-night atmosphere.",
    shortDescription:
      "Cozy dinner address with soft lighting and a date-night atmosphere.",
    overview:
      "Moonlight Bistro is a Racine venue designed for slower evenings and conversation-focused dinners. The setting is intimate, with a calm soundtrack and comfortable spacing between tables. It is a dependable option for date nights and small special occasions.",
    vibe: "Intimate, calm, romantic",
    vibeSummary: "Intimate dinner mood for meaningful date nights.",
    audience: "Couples, close friends",
    priceLevel: "$$$",
    bestForTags: ["date-spot", "late-night"],
    timeOfDay: ["evening", "late-night"],
    energyLevel: "low",
    socialLevel: "low",
    spaceType: "indoor",
    translations: {
      fr: {
        description:
          "Adresse dîner cosy avec éclairage tamisé et ambiance soirée romantique.",
        shortDescription:
          "Adresse dîner cosy avec éclairage tamisé et ambiance soirée romantique.",
        overview:
          "Moonlight Bistro est un restaurant à Racine conçu pour les soirées lentes et les dîners axés sur la conversation. Le cadre est intime, avec une bande-son apaisante et un espacement confortable entre les tables. C'est une option fiable pour les soirées en duo et les petites occasions spéciales.",
        vibe: "Intime, calme, romantique",
        vibeSummary: "Ambiance dîner intime pour des soirées en duo mémorables.",
        audience: "Couples, proches amis",
      },
    },
  },
  {
    slug: "weekend-social-hub",
    name: "Weekend Social Hub",
    category: "Friends",
    categorySlug: "friends",
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
  "skyline-rooftop-cafe",
  "ocean-drive-padel-club",
  "old-medina-food-walk",
  "pixel-arena",
];
