import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { venues as mockVenues } from "../data/mockData";

// Regression coverage for the data-integrity defect where a failed /api/venues
// request was silently substituted with mock/demo venues (e.g. "Marina Sunset
// Walk", "Ain Diab Bike Loop", "Weekend Social Hub"), which the planner then
// displayed and saved as if they were real.
//
// useVenues keeps its cache/in-flight state in module-level variables, so each
// test re-imports the module fresh (via vi.resetModules) to guarantee isolation
// — no cache or in-flight Promise leaks between cases. We exercise the shared
// loadVenues() loader that the hook subscribes to: its resolve → venues/isLoading
// and its reject → error="api_error"/isLoading=false mapping lives in the hook's
// effect, but the contract that must never break (real data only, never mock) is
// entirely the loader's.

async function importFresh() {
  vi.resetModules();
  return import("./useVenues");
}

function okResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as unknown as Response;
}

function errorResponse(status = 500): Response {
  return { ok: false, status, json: async () => ({}) } as unknown as Response;
}

// A minimal, unmistakably "real" API payload (none of these slugs/names exist
// in mockData).
const apiVenues = [
  {
    slug: "cafe-atlas-real",
    categorySlug: "cafes",
    area: "Maârif",
    name: "Café Atlas",
    category: "",
    description: "",
  },
];

const mockVenueNames = new Set(mockVenues.map((v) => v.name));

describe("loadVenues", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    // The loader logs failures via console.error; keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Sanity: the fictional venues from the bug report really do live in mockData,
  // so the "must never appear" assertions below are meaningful.
  it("mockData contains the reported fictional venues (fixture guard)", () => {
    expect(mockVenueNames.has("Marina Sunset Walk")).toBe(true);
    expect(mockVenueNames.has("Ain Diab Bike Loop")).toBe(true);
    expect(mockVenueNames.has("Weekend Social Hub")).toBe(true);
  });

  // A. Successful API fetch.
  it("resolves with the real API venues on success", async () => {
    fetchMock.mockResolvedValue(okResponse(apiVenues));
    const { loadVenues } = await importFresh();

    const result = await loadVenues();

    expect(result).toEqual(apiVenues);
    for (const v of result) {
      expect(mockVenueNames.has(v.name)).toBe(false);
    }
  });

  // A. Repeated consumers share the cached real result (one request per session).
  it("caches the real result and de-dupes concurrent callers", async () => {
    fetchMock.mockResolvedValue(okResponse(apiVenues));
    const { loadVenues } = await importFresh();

    const [first, second] = await Promise.all([loadVenues(), loadVenues()]);
    const third = await loadVenues();

    expect(first).toEqual(apiVenues);
    expect(second).toEqual(apiVenues);
    expect(third).toEqual(apiVenues);
    // In-flight de-dup + module cache ⇒ exactly one network call.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // B. Failed API fetch (non-ok response) — no mock substitution.
  it("rejects on a non-ok response and never returns mock venues", async () => {
    fetchMock.mockResolvedValue(errorResponse(500));
    const { loadVenues } = await importFresh();

    await expect(loadVenues()).rejects.toThrow();
  });

  // B. Failed API fetch (network/fetch throws) — no mock substitution.
  it("rejects when fetch itself throws and never returns mock venues", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const { loadVenues } = await importFresh();

    await expect(loadVenues()).rejects.toThrow();
  });

  // C. Retry after failure recovers with real data and never leaks mock venues.
  it("does not cache a failure — a later call issues a fresh real request", async () => {
    // First attempt fails.
    fetchMock.mockResolvedValueOnce(errorResponse(503));
    const { loadVenues } = await importFresh();
    await expect(loadVenues()).rejects.toThrow();

    // Retry: a brand-new real request succeeds (this is what the hook's retry()
    // triggers after clearing the cache).
    fetchMock.mockResolvedValueOnce(okResponse(apiVenues));
    const recovered = await loadVenues();

    expect(recovered).toEqual(apiVenues);
    // Two real network attempts: the failed one, then the successful retry.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The recovered data is real — no mock/demo venue survived the failure.
    for (const v of recovered) {
      expect(mockVenueNames.has(v.name)).toBe(false);
    }
  });
});
