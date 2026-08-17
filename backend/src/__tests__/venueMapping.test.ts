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
