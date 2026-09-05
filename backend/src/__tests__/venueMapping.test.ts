import { describe, it, expect, vi } from "vitest";

// mapVenue is pure, but venues.ts imports the Supabase client at module load,
// which throws if env vars are missing. Mock it so the import is side-effect free.
vi.mock("../lib/supabase", () => ({
  supabase: {},
}));

import { mapVenue } from "../routes/venues";

/** Minimal valid row — only the fields mapVenue reads for identity/category. */
function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    external_id: "BLK-0050",
    name: "Test Venue",
    slug: "test-venue",
    category: "Indoor Games",
    subcategory: "billiards",
    ...overrides,
  };
}

describe("mapVenue — image fields", () => {
  it("maps image_url → imageUrl (card image)", () => {
    const out = mapVenue(baseRow({ image_url: "https://cdn/card.webp" }));
    expect(out.imageUrl).toBe("https://cdn/card.webp");
  });

  it("maps detail_image_url → detailImageUrl (hero image)", () => {
    const out = mapVenue(baseRow({ detail_image_url: "https://cdn/detail.webp" }));
    expect(out.detailImageUrl).toBe("https://cdn/detail.webp");
  });

  it("maps both image fields independently", () => {
    const out = mapVenue(
      baseRow({
        image_url: "https://cdn/card.webp",
        detail_image_url: "https://cdn/detail.webp",
      }),
    );
    expect(out.imageUrl).toBe("https://cdn/card.webp");
    expect(out.detailImageUrl).toBe("https://cdn/detail.webp");
  });

  it("returns null for both when absent (placeholder fallback on frontend)", () => {
    const out = mapVenue(baseRow());
    expect(out.imageUrl).toBeNull();
    expect(out.detailImageUrl).toBeNull();
  });

  it("does not let detail_image_url leak into imageUrl or vice versa", () => {
    const out = mapVenue(baseRow({ detail_image_url: "https://cdn/detail.webp" }));
    expect(out.imageUrl).toBeNull();
  });

  it("preserves the permanent external_id and slug unchanged", () => {
    const out = mapVenue(baseRow({ image_url: "https://cdn/card.webp" }));
    expect(out.externalId).toBe("BLK-0050");
    expect(out.slug).toBe("test-venue");
  });
});

describe("mapVenue — V3 structured fields take precedence over computed fallbacks", () => {
  it("uses DB best_for_tags when present instead of computing from subcategory", () => {
    const out = mapVenue(baseRow({ best_for_tags: ["date-spot", "solo"] }));
    expect(out.bestForTags).toEqual(["date-spot", "solo"]);
  });

  it("falls back to subcategory-derived tags when best_for_tags is absent or empty", () => {
    expect(mapVenue(baseRow()).bestForTags).toEqual([
      "friends",
      "late-night",
      "group-activity",
    ]);
    expect(mapVenue(baseRow({ best_for_tags: [] })).bestForTags).toEqual([
      "friends",
      "late-night",
      "group-activity",
    ]);
  });

  it("uses DB space_type and time_of_day when present", () => {
    const out = mapVenue(
      baseRow({ space_type: "mixed", time_of_day: ["morning"] }),
    );
    expect(out.spaceType).toBe("mixed");
    expect(out.timeOfDay).toEqual(["morning"]);
  });

  it("computes space_type and time_of_day from subcategory when absent", () => {
    const out = mapVenue(baseRow()); // billiards
    expect(out.spaceType).toBe("indoor");
    expect(out.timeOfDay).toEqual(["evening", "late-night"]);
  });

  it("maps V3 tag arrays and leaves them undefined when absent or empty", () => {
    const withTags = mapVenue(
      baseRow({
        audience_tags: ["friends", "couples"],
        atmosphere_tags: ["lively"],
        additional_experiences: ["snack bar"],
      }),
    );
    expect(withTags.audienceTags).toEqual(["friends", "couples"]);
    expect(withTags.atmosphereTags).toEqual(["lively"]);
    expect(withTags.additionalExperiences).toEqual(["snack bar"]);

    const withoutTags = mapVenue(baseRow({ audience_tags: [], atmosphere_tags: null }));
    expect(withoutTags.audienceTags).toBeUndefined();
    expect(withoutTags.atmosphereTags).toBeUndefined();
    expect(withoutTags.additionalExperiences).toBeUndefined();
  });
});

describe("mapVenue — category slug derivation", () => {
  it("lets a known subcategory decide the slug before the category", () => {
    const out = mapVenue(
      baseRow({ category: "Sports Experiences", subcategory: "padel club" }),
    );
    expect(out.categorySlug).toBe("sports");
  });

  it("falls back to the V3 category map when the subcategory is unknown", () => {
    const out = mapVenue(
      baseRow({ category: "Wellness & Relaxation", subcategory: "flotation tank" }),
    );
    expect(out.categorySlug).toBe("wellness");
  });

  it("slugifies an unmapped category instead of crashing", () => {
    const out = mapVenue(
      baseRow({ category: "Mystery Category!", subcategory: null }),
    );
    expect(out.categorySlug).toBe("mystery-category");
  });
});

describe("mapVenue — 'Not confirmed' placeholders are never exposed", () => {
  it("suppresses a 'Not confirmed' neighborhood and falls back to region for area", () => {
    const out = mapVenue(
      baseRow({ neighborhood: "Not confirmed (needs research)", region: "Casablanca West" }),
    );
    expect(out.neighborhood).toBeNull();
    expect(out.area).toBe("Casablanca West");
  });

  it("falls back to 'Casablanca' when both neighborhood and region are unusable", () => {
    const out = mapVenue(baseRow({ neighborhood: "Not confirmed", region: null }));
    expect(out.area).toBe("Casablanca");
  });

  it("keeps a genuine neighborhood as the area", () => {
    const out = mapVenue(
      baseRow({ neighborhood: "Ain Diab", region: "Casablanca West" }),
    );
    expect(out.neighborhood).toBe("Ain Diab");
    expect(out.area).toBe("Ain Diab");
  });

  it("suppresses a 'Not confirmed' address", () => {
    const out = mapVenue(baseRow({ address: "Not confirmed yet" }));
    expect(out.address).toBeNull();
  });
});

describe("mapVenue — verification metadata", () => {
  it("maps the verification fields through unchanged", () => {
    const out = mapVenue(
      baseRow({
        research_status: "researched",
        verification_level: "cross-checked",
        last_verified_date: "2026-08-01",
        verified_by: "achraf",
      }),
    );
    expect(out.researchStatus).toBe("researched");
    expect(out.verificationLevel).toBe("cross-checked");
    expect(out.lastVerifiedDate).toBe("2026-08-01");
    expect(out.verifiedBy).toBe("achraf");
  });

  it("leaves verification fields undefined when the row has none", () => {
    const out = mapVenue(baseRow());
    expect(out.researchStatus).toBeUndefined();
    expect(out.verificationLevel).toBeUndefined();
    expect(out.lastVerifiedDate).toBeUndefined();
    expect(out.verifiedBy).toBeUndefined();
  });
});

describe("mapVenue — unverified data stays absent, never invented", () => {
  it("leaves priceLevel undefined when price_level is null", () => {
    expect(mapVenue(baseRow()).priceLevel).toBeUndefined();
    expect(mapVenue(baseRow({ price_level: null })).priceLevel).toBeUndefined();
  });

  it("exposes coordinates only when both lat and lng are numbers", () => {
    expect(mapVenue(baseRow()).coordinates).toBeUndefined();
    expect(mapVenue(baseRow({ lat: 33.59 })).coordinates).toBeUndefined();
    expect(mapVenue(baseRow({ lat: 33.59, lng: -7.61 })).coordinates).toEqual({
      lat: 33.59,
      lng: -7.61,
    });
  });
});
