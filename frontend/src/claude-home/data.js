const localizedHomeData = {
  en: {
    heroCards: [
      { id: "c1", title: "Padel at Ocean Drive", tagline: "Ain Diab · Sport", price: "MAD 450", img: "p2", venueSlug: "padel-pro-blk-0024" },
      { id: "c2", title: "Beach Sunset at Tahiti", tagline: "Corniche · Beach", price: "MAD 120", img: "p3", venueSlug: "tahiti-beach-club-blk-0040" },
      { id: "c3", title: "Karting at Sindibad", tagline: "Ain Diab · Karting", price: "MAD 200", img: "p4", venueSlug: "sindibad-karting-blk-0020" },
      { id: "c4", title: "Gaming Night", tagline: "Hay El Ward · Gaming", price: "MAD 220", img: "p1", venueSlug: "house-of-gaming-blk-0046" },
    ],
    moods: [
      { title: "Tonight", sub: "after 7pm", ico: "moon", href: "/search?mood=social" },
      { title: "Under MAD 200", sub: "budget picks", ico: "coin", href: "/search?budget=$" },
      { title: "Date night", sub: "for two", ico: "heart2", href: "/search?bestFor=date-spot" },
      { title: "With friends", sub: "3+ people", ico: "users", href: "/search?bestFor=friends" },
    ],
    mapPins: [
      { top: 38, left: 28, label: "Ain Diab", areaQuery: "Ain Diab" },
      { top: 52, left: 48, label: "Corniche", areaQuery: "Corniche" },
      { top: 30, left: 62, label: "Triangle d'Or", areaQuery: "Triangle d'Or" },
      { top: 64, left: 72, label: "Old Medina", areaQuery: "Old Medina" },
      { top: 72, left: 40, label: "Anfa", areaQuery: "Anfa" },
      { top: 22, left: 45, label: "Sidi Bernoussi", areaQuery: "Sidi Bernoussi" },
    ],
    categories: [
      { name: "Indoor Activities", count: "Billiards, escape rooms & more", img: "/category-images/generated/category-indoor-activities-01.webp", slug: "activities" },
      { name: "Sports & Padel", count: "Active social plans", img: "/category-images/sports-play/category-sports-play-01.webp", slug: "sports" },
      { name: "Gaming & Arcades", count: "Screen-based group fun", img: "/category-images/generated/category-gaming-arcades-01.webp", slug: "gaming" },
      { name: "Kids & Family", count: "Family-friendly picks", img: "/category-images/family-days/category-family-days-01.webp", slug: "family" },
      { name: "Outdoor Fun", count: "Fresh-air plans", img: "/category-images/outdoor-escapes/category-outdoor-escapes-01.webp", slug: "outdoor" },
      { name: "Beach & Water", count: "Coastal & pool spots", img: "/category-images/by-the-water/category-by-the-water-01.webp", slug: "outdoor", href: "/search?bestFor=sunset-spot" },
      { name: "Group Hangouts", count: "Best for 3+ people", img: "/category-images/cafes-chill/category-cafes-chill-01.webp", slug: "outdoor", href: "/search?bestFor=friends" },
      { name: "Date-Friendly Picks", count: "For two", img: "/category-images/generated/category-date-friendly-01.webp", slug: "activities", href: "/search?bestFor=date-spot" },
    ],
    curated: [
      { title: "Corniche Beach Morning", chips: ["Morning", "Outdoor"], price: "Free", duration: "2h", img: "pi1", imgPath: "/picks-images/slow-morning-corniche/pick-slow-morning-corniche-01.webp", venueSlug: "l-eden-beach-club-blk-0039" },
      { title: "Escape Room Challenge", chips: ["Group", "Game"], price: "MAD 220", duration: "1.5h", img: "pi2", imgPath: "/picks-images/escape-room-challenge/pick-escape-room-challenge-01.webp", venueSlug: "the-doorz-escape-room-blk-0016" },
      { title: "Karting at Sindibad", chips: ["Group", "Adrenaline"], price: "MAD 200", duration: "1.5h", img: "pi3", imgPath: "/picks-images/sindibad-karting/pick-sindibad-karting-01.webp", venueSlug: "sindibad-karting-blk-0020" },
      { title: "Pool Night", chips: ["Game"], price: "MAD 80", duration: "2h", img: "pi4", imgPath: "/picks-images/pool-night/pick-pool-night-01.webp", venueSlug: "astropool-lounge-blk-0001" },
      { title: "Bumper Cars Night", chips: ["Family", "Fun"], price: "MAD 120", duration: "1.5h", img: "pi5", imgPath: "/picks-images/bumper-cars-night/pick-bumper-cars-night-01.webp", venueSlug: "parc-sindibad-blk-0028" },
    ],
    howSteps: [
      {
        title: "Choose what you want to do.",
        description:
          "Browse by how you're feeling — quiet morning, social evening, something active, something new.",
      },
      {
        title: "See the useful details.",
        description:
          "Each pick brings together the practical details we have — location, vibe, and what makes it worth considering — before you decide.",
      },
      {
        title: "Save for later.",
        description:
          "Keep the venues that interest you, compare your options, and come back when the moment is right.",
      },
    ],
    continuationSlots: ["Slot 01", "Slot 02", "Slot 03", "Slot 04"],
    editorialMeta: {
      author: "Leïla Bensaïd",
      readTime: "6 min read",
    },
    footer: {
      madeIn: "© 2026 Blaniko · Made in Casablanca",
      instagram: "Instagram",
      contact: "Contact",
      privacy: "Privacy",
      about: "About",
    },
  },
  fr: {
    heroCards: [
      { id: "c1", title: "Padel à Ocean Drive", tagline: "Ain Diab · Sport", price: "MAD 450", img: "p2", venueSlug: "padel-pro-blk-0024" },
      { id: "c2", title: "Coucher de soleil à Tahiti", tagline: "Corniche · Plage", price: "MAD 120", img: "p3", venueSlug: "tahiti-beach-club-blk-0040" },
      { id: "c3", title: "Karting chez Sindibad", tagline: "Ain Diab · Karting", price: "MAD 200", img: "p4", venueSlug: "sindibad-karting-blk-0020" },
      { id: "c4", title: "Soirée gaming", tagline: "Hay El Ward · Gaming", price: "MAD 220", img: "p1", venueSlug: "house-of-gaming-blk-0046" },
    ],
    moods: [
      { title: "Ce soir", sub: "après 19h", ico: "moon", href: "/search?mood=social" },
      { title: "Moins de 200 MAD", sub: "sélection budget", ico: "coin", href: "/search?budget=$" },
      { title: "Soirée en duo", sub: "pour deux", ico: "heart2", href: "/search?bestFor=date-spot" },
      { title: "Entre amis", sub: "3+ personnes", ico: "users", href: "/search?bestFor=friends" },
    ],
    mapPins: [
      { top: 38, left: 28, label: "Ain Diab", areaQuery: "Ain Diab" },
      { top: 52, left: 48, label: "Corniche", areaQuery: "Corniche" },
      { top: 30, left: 62, label: "Triangle d'Or", areaQuery: "Triangle d'Or" },
      { top: 64, left: 72, label: "Ancienne Médina", areaQuery: "Old Medina" },
      { top: 72, left: 40, label: "Anfa", areaQuery: "Anfa" },
      { top: 22, left: 45, label: "Sidi Bernoussi", areaQuery: "Sidi Bernoussi" },
    ],
    categories: [
      { name: "Activités en intérieur", count: "Billard, escape games et plus", img: "/category-images/generated/category-indoor-activities-01.webp", slug: "activities" },
      { name: "Sports & Padel", count: "Plans actifs en groupe", img: "/category-images/sports-play/category-sports-play-01.webp", slug: "sports" },
      { name: "Gaming & Arcades", count: "Jeux en groupe", img: "/category-images/generated/category-gaming-arcades-01.webp", slug: "gaming" },
      { name: "En famille", count: "Idées adaptées aux familles", img: "/category-images/family-days/category-family-days-01.webp", slug: "family" },
      { name: "Plein air", count: "Plans grand air", img: "/category-images/outdoor-escapes/category-outdoor-escapes-01.webp", slug: "outdoor" },
      { name: "Plage & Piscine", count: "Spots côtiers et piscines", img: "/category-images/by-the-water/category-by-the-water-01.webp", slug: "outdoor", href: "/search?bestFor=sunset-spot" },
      { name: "En groupe", count: "Pour 3+ personnes", img: "/category-images/cafes-chill/category-cafes-chill-01.webp", slug: "outdoor", href: "/search?bestFor=friends" },
      { name: "Plans en duo", count: "Pour deux", img: "/category-images/generated/category-date-friendly-01.webp", slug: "activities", href: "/search?bestFor=date-spot" },
    ],
    curated: [
      { title: "Matinée à la Corniche", chips: ["Matin", "Plein air"], price: "Gratuit", duration: "2h", img: "pi1", imgPath: "/picks-images/slow-morning-corniche/pick-slow-morning-corniche-01.webp", venueSlug: "l-eden-beach-club-blk-0039" },
      { title: "Escape Room Challenge", chips: ["Groupe", "Jeu"], price: "MAD 220", duration: "1h30", img: "pi2", imgPath: "/picks-images/escape-room-challenge/pick-escape-room-challenge-01.webp", venueSlug: "the-doorz-escape-room-blk-0016" },
      { title: "Karting à Sindibad", chips: ["Groupe", "Adrénaline"], price: "200 MAD", duration: "1h30", img: "pi3", imgPath: "/picks-images/sindibad-karting/pick-sindibad-karting-01.webp", venueSlug: "sindibad-karting-blk-0020" },
      { title: "Soirée billard", chips: ["Jeu"], price: "MAD 80", duration: "2h", img: "pi4", imgPath: "/picks-images/pool-night/pick-pool-night-01.webp", venueSlug: "astropool-lounge-blk-0001" },
      { title: "Soirée autos tamponneuses", chips: ["Famille", "Fun"], price: "MAD 120", duration: "1h30", img: "pi5", imgPath: "/picks-images/bumper-cars-night/pick-bumper-cars-night-01.webp", venueSlug: "parc-sindibad-blk-0028" },
    ],
    howSteps: [
      {
        title: "Choisissez une ambiance.",
        description:
          "Parcourez selon votre envie — matin calme, soirée sociale, quelque chose d'actif ou de nouveau.",
      },
      {
        title: "Voyez les détails utiles.",
        description:
          "Chaque sélection rassemble les informations pratiques disponibles — lieu, ambiance et raisons d'y aller — pour vous aider à décider.",
      },
      {
        title: "Gardez pour plus tard.",
        description:
          "Enregistrez les lieux qui vous intéressent, comparez vos options et revenez-y au bon moment.",
      },
    ],
    continuationSlots: ["Bloc 01", "Bloc 02", "Bloc 03", "Bloc 04"],
    editorialMeta: {
      author: "Leïla Bensaïd",
      readTime: "6 min de lecture",
    },
    footer: {
      madeIn: "© 2026 Blaniko · Fait à Casablanca",
      instagram: "Instagram",
      contact: "Contact",
      privacy: "Confidentialité",
      about: "À propos",
    },
  },
};

export function getClaudeHomeLocalizedData(language) {
  return localizedHomeData[language] ?? localizedHomeData.en;
}

export const HERO_CARDS = localizedHomeData.en.heroCards;
export const CATEGORIES = localizedHomeData.en.categories;
export const CURATED = localizedHomeData.en.curated;
