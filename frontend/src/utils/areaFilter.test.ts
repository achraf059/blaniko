import { describe, it, expect } from "vitest";
import type { Venue } from "../data/mockData";
import { deriveAreaOptions, venueMatchesArea, venueAreaLabel } from "./areaFilter";

// Minimal fixtures: only `area` (and slug/categorySlug for compose tests) matter.
function v(area: string | undefined, extra: Partial<Venue> = {}): Venue {
  return { slug: area ?? "x", categorySlug: "sports", area: area as string, name: area ?? "x", category: "", description: "", ...extra } as Venue;
}

describe("venueAreaLabel", () => {
  it("takes the first comma-segment, trimmed (legacy/mock 'X, Casablanca')", () => {
    expect(venueAreaLabel(v("Aïn Diab, Casablanca"))).toBe("Aïn Diab");
  });
  it("returns live V3 values unchanged (no comma)", () => {
    expect(venueAreaLabel(v("Maârif"))).toBe("Maârif");
  });
  it("preserves canonical accents/spelling exactly", () => {
    expect(venueAreaLabel(v("Sidi Maârouf"))).toBe("Sidi Maârouf");
    expect(venueAreaLabel(v("Aïn Sebaâ"))).toBe("Aïn Sebaâ");
  });
  it("is safe on missing area", () => {
    expect(venueAreaLabel(v(undefined))).toBe("");
  });
});

describe("deriveAreaOptions", () => {
  it("de-duplicates and sorts", () => {
    const opts = deriveAreaOptions([v("Maârif"), v("Aïn Diab"), v("Maârif"), v("Bourgogne")]);
    expect(opts).toEqual(["Aïn Diab", "Bourgogne", "Maârif"]);
  });
  it("never yields a blank option", () => {
    const opts = deriveAreaOptions([v(""), v(undefined), v("Racine")]);
    expect(opts).toEqual(["Racine"]);
    expect(opts).not.toContain("");
  });
  it("drops the generic 'Casablanca' missing-data fallback", () => {
    const opts = deriveAreaOptions([v("Casablanca"), v("casablanca"), v("Oasis")]);
    expect(opts).toEqual(["Oasis"]);
    expect(opts).not.toContain("Casablanca");
  });
  it("reflects the actual loaded dataset values", () => {
    const opts = deriveAreaOptions([v("Zenata"), v("Almaz"), v("Sbata")]);
    expect(opts).toEqual(["Almaz", "Sbata", "Zenata"]);
  });
});

describe("venueMatchesArea", () => {
  it("'all' → every venue is eligible (no restriction)", () => {
    const list = [v("Maârif"), v("Aïn Diab"), v(undefined)];
    expect(list.every((venue) => venueMatchesArea(venue, "all"))).toBe(true);
  });

  it("selected area → only exact-label venues remain", () => {
    const list = [v("Maârif"), v("Aïn Diab"), v("Maârif, Casablanca"), v("Bourgogne")];
    const kept = list.filter((venue) => venueMatchesArea(venue, "Maârif"));
    expect(kept.map((x) => venueAreaLabel(x))).toEqual(["Maârif", "Maârif"]);
  });

  it("is exact, not substring or fuzzy", () => {
    expect(venueMatchesArea(v("Aïn Diab"), "Aïn")).toBe(false); // no substring
    expect(venueMatchesArea(v("Maârif Extension"), "Maârif")).toBe(false); // no prefix match
    expect(venueMatchesArea(v("Maârif"), "Maârif Extension")).toBe(false);
  });

  it("composes with a category filter (Sports + Maârif)", () => {
    const list = [
      v("Maârif", { categorySlug: "sports", slug: "s1" }),
      v("Maârif", { categorySlug: "gaming", slug: "g1" }),
      v("Aïn Diab", { categorySlug: "sports", slug: "s2" }),
    ];
    const kept = list
      .filter((venue) => venue.categorySlug === "sports")
      .filter((venue) => venueMatchesArea(venue, "Maârif"));
    expect(kept.map((x) => x.slug)).toEqual(["s1"]); // sports AND Maârif, not either alone
  });

  it("composes with a search filter (search + area)", () => {
    const list = [
      v("Maârif", { name: "Padel Club", slug: "a" }),
      v("Maârif", { name: "Pool Hall", slug: "b" }),
      v("Aïn Diab", { name: "Padel Beach", slug: "c" }),
    ];
    const q = "padel";
    const kept = list
      .filter((venue) => venue.name.toLowerCase().includes(q))
      .filter((venue) => venueMatchesArea(venue, "Maârif"));
    expect(kept.map((x) => x.slug)).toEqual(["a"]);
  });

  it("clearing the area (back to 'all') restores the broader set", () => {
    const list = [v("Maârif"), v("Aïn Diab"), v("Bourgogne")];
    const narrowed = list.filter((venue) => venueMatchesArea(venue, "Maârif"));
    const restored = list.filter((venue) => venueMatchesArea(venue, "all"));
    expect(narrowed.length).toBe(1);
    expect(restored.length).toBe(3);
  });
});
