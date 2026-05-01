const localizedHomeData = {
  en: {
    heroCards: [
      { id: "c1", title: "Padel at Ocean Drive", tagline: "Ain Diab · Sport", price: "MAD 450", img: "p2", venueSlug: "ocean-drive-padel-club" },
      { id: "c2", title: "Rooftop Sundowner", tagline: "Maarif · Café", price: "MAD 120", img: "p3", venueSlug: "skyline-rooftop-cafe" },
      { id: "c3", title: "Old Medina Food Walk", tagline: "Old Medina · Culture", price: "Free", img: "p4", venueSlug: "old-medina-food-walk" },
      { id: "c4", title: "Night out in Maarif", tagline: "Maarif · Social", price: "MAD 220", img: "p1", venueSlug: "weekend-social-hub" },
    ],
    moods: [
      { title: "Tonight", sub: "after 7pm", ico: "moon", href: "/search?mood=social" },
      { title: "Under MAD 200", sub: "budget picks", ico: "coin", href: "/search?budget=$" },
      { title: "Date night", sub: "for two", ico: "heart2", href: "/search?category=couples" },
      { title: "With friends", sub: "3+ people", ico: "users", href: "/search?category=friends" },
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
      { name: "Outdoors", count: "Fresh-air ideas", ico: "mountain", slug: "outdoor" },
      { name: "Water", count: "Coastal picks", ico: "wave", slug: "activities" },
      { name: "Culture", count: "Local culture", ico: "column", slug: "activities" },
      { name: "Nightlife", count: "Evening ideas", ico: "moon", slug: "friends" },
      { name: "Amusement", count: "Fun plans", ico: "sparkle", slug: "activities" },
      { name: "Workshops", count: "Hands-on ideas", ico: "pen", slug: "activities" },
      { name: "Wellness", count: "Recharge ideas", ico: "leaf", slug: "sports" },
      { name: "For kids", count: "Family-friendly", ico: "kite", slug: "family" },
    ],
    curated: [
      { title: "A slow morning at the corniche", chips: ["Morning", "Outdoor"], price: "Free", duration: "2h", img: "c1", venueSlug: "marina-sunset-walk" },
      { title: "Pottery with Leïla", chips: ["Workshop"], price: "MAD 320", duration: "3h", img: "c3", venueSlug: "anfa-family-workshop-house" },
      { title: "Dinner at Moonlight Bistro", chips: ["Dinner"], price: "MAD 150", duration: "2h", img: "c4", venueSlug: "moonlight-bistro" },
      { title: "Padel session, Ain Diab", chips: ["Sport"], price: "MAD 280", duration: "4h", img: "c2", venueSlug: "ocean-drive-padel-club" },
      { title: "Rooftop supper club", chips: ["Dining", "Curated"], price: "MAD 480", duration: "3h", img: "c5", venueSlug: "skyline-rooftop-cafe" },
      { title: "Street food in the Old Medina", chips: ["Culture", "Food"], price: "MAD 180", duration: "2h", img: "c6", venueSlug: "old-medina-food-walk" },
    ],
    howSteps: [
      {
        title: "Picked by people.",
        description:
          "Every place is selected with local taste, not copied from random listings.",
      },
      {
        title: "Clear, honest details.",
        description:
          "Real prices, real durations, real photos — so you know what you're in for before you tap \"go.\"",
      },
      {
        title: "Updated weekly.",
        description:
          "The city changes. Our edit changes with it. New picks every Monday, right here.",
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
    },
  },
  fr: {
    heroCards: [
      { id: "c1", title: "Padel à Ocean Drive", tagline: "Ain Diab · Sport", price: "MAD 450", img: "p2", venueSlug: "ocean-drive-padel-club" },
      { id: "c2", title: "Coucher de soleil en rooftop", tagline: "Maarif · Café", price: "MAD 120", img: "p3", venueSlug: "skyline-rooftop-cafe" },
      { id: "c3", title: "Balade gourmande en médina", tagline: "Ancienne Médina · Culture", price: "Gratuit", img: "p4", venueSlug: "old-medina-food-walk" },
      { id: "c4", title: "Soirée à Maarif", tagline: "Maarif · Social", price: "MAD 220", img: "p1", venueSlug: "weekend-social-hub" },
    ],
    moods: [
      { title: "Ce soir", sub: "après 19h", ico: "moon", href: "/search?mood=social" },
      { title: "Moins de 200 MAD", sub: "sélection budget", ico: "coin", href: "/search?budget=$" },
      { title: "Soirée en duo", sub: "pour deux", ico: "heart2", href: "/search?category=couples" },
      { title: "Entre amis", sub: "3+ personnes", ico: "users", href: "/search?category=friends" },
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
      { name: "Plein air", count: "Idées plein air", ico: "mountain", slug: "outdoor" },
      { name: "Eau", count: "Bord de mer", ico: "wave", slug: "activities" },
      { name: "Culture", count: "Culture locale", ico: "column", slug: "activities" },
      { name: "Vie nocturne", count: "Idées soirée", ico: "moon", slug: "friends" },
      { name: "Amusement", count: "Sorties fun", ico: "sparkle", slug: "activities" },
      { name: "Ateliers", count: "Idées ateliers", ico: "pen", slug: "activities" },
      { name: "Bien-être", count: "Plans détente", ico: "leaf", slug: "sports" },
      { name: "Pour enfants", count: "En famille", ico: "kite", slug: "family" },
    ],
    curated: [
      { title: "Une matinée douce à la corniche", chips: ["Matin", "Plein air"], price: "Gratuit", duration: "2h", img: "c1", venueSlug: "marina-sunset-walk" },
      { title: "Poterie avec Leïla", chips: ["Atelier"], price: "MAD 320", duration: "3h", img: "c3", venueSlug: "anfa-family-workshop-house" },
      { title: "Dîner au Moonlight Bistro", chips: ["Dîner"], price: "MAD 150", duration: "2h", img: "c4", venueSlug: "moonlight-bistro" },
      { title: "Session padel, Ain Diab", chips: ["Sport"], price: "MAD 280", duration: "4h", img: "c2", venueSlug: "ocean-drive-padel-club" },
      { title: "Dîner rooftop en petit comité", chips: ["Dîner", "Sélection"], price: "MAD 480", duration: "3h", img: "c5", venueSlug: "skyline-rooftop-cafe" },
      { title: "Street food dans l'Ancienne Médina", chips: ["Culture", "Food"], price: "MAD 180", duration: "2h", img: "c6", venueSlug: "old-medina-food-walk" },
    ],
    howSteps: [
      {
        title: "Sélectionné, pas aspiré.",
        description:
          "Chaque activité est choisie à la main par des locaux qui l'ont vraiment testée. Pas de listes copiées, pas de remplissage.",
      },
      {
        title: "Des infos claires et honnêtes.",
        description:
          "Prix réels, durées réelles, photos réelles — pour savoir exactement à quoi vous attendre avant d'y aller.",
      },
      {
        title: "Mis à jour chaque semaine.",
        description:
          "La ville change. Notre sélection évolue avec elle. Nouvelles idées chaque lundi, ici même.",
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
    },
  },
};

export function getClaudeHomeLocalizedData(language) {
  return localizedHomeData[language] ?? localizedHomeData.en;
}

export const HERO_CARDS = localizedHomeData.en.heroCards;
export const CATEGORIES = localizedHomeData.en.categories;
export const CURATED = localizedHomeData.en.curated;

if (typeof window !== "undefined") {
  Object.assign(window, { HERO_CARDS, CATEGORIES, CURATED, getClaudeHomeLocalizedData });
}
