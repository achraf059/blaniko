export type Category = {
  slug: string;
  name: string;
  description: string;
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
};

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
  },
];

export const featuredVenueSlugs = [
  "skyline-rooftop-cafe",
  "ocean-drive-padel-club",
  "old-medina-food-walk",
  "pixel-arena",
];
