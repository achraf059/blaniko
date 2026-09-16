import { describe, expect, it } from "vitest";
import {
  resolveRequestedStops,
  resolveStopsToPersist,
  selectPlanViewState,
} from "./planViewState";

describe("selectPlanViewState", () => {
  it("returns 'quiz' for a fresh visit even while venues are still loading", () => {
    // The quiz does not depend on venue data, so it must win over loading.
    expect(
      selectPlanViewState({
        showQuiz: true,
        venuesLoading: true,
        venuesError: null,
      }),
    ).toBe("quiz");
  });

  it("returns 'loading' (not 'plan') while a completed plan waits for venue data", () => {
    // Regression: this is the state that previously collapsed into the
    // "Not enough venues" message. It must not resolve to 'plan'.
    const state = selectPlanViewState({
      showQuiz: false,
      venuesLoading: true,
      venuesError: null,
    });
    expect(state).toBe("loading");
    expect(state).not.toBe("plan");
  });

  it("returns 'error' when venue loading failed", () => {
    const state = selectPlanViewState({
      showQuiz: false,
      venuesLoading: false,
      venuesError: "api_error",
    });
    expect(state).toBe("error");
    expect(state).not.toBe("plan");
  });

  it("prefers 'error' over 'loading' if both are somehow set", () => {
    expect(
      selectPlanViewState({
        showQuiz: false,
        venuesLoading: true,
        venuesError: "api_error",
      }),
    ).toBe("error");
  });

  it("returns 'plan' only after loading completed without error", () => {
    // Genuine completed load with no error — the only state in which the
    // "Not enough venues" message may render (decided downstream by whether
    // any eligible stops exist).
    expect(
      selectPlanViewState({
        showQuiz: false,
        venuesLoading: false,
        venuesError: null,
      }),
    ).toBe("plan");
  });

  // ── Stale/unavailable requested-plan state ──────────────────────────────────

  it("returns 'unavailable' when a requested plan can't resolve after a clean load", () => {
    // Venues loaded successfully, no error, but the requested `stops` reference
    // venues that no longer exist. This must NOT collapse into 'plan' (which would
    // render a silently generated/partial replacement).
    const state = selectPlanViewState({
      showQuiz: false,
      venuesLoading: false,
      venuesError: null,
      requestedStopsUnavailable: true,
    });
    expect(state).toBe("unavailable");
    expect(state).not.toBe("plan");
  });

  it("does NOT select 'unavailable' before venue loading finishes", () => {
    // Regression: while loading, the known-slug set is empty, so a valid requested
    // plan would look unavailable. Loading must win so a still-empty dataset is
    // never misclassified as missing venues.
    expect(
      selectPlanViewState({
        showQuiz: false,
        venuesLoading: true,
        venuesError: null,
        requestedStopsUnavailable: true,
      }),
    ).toBe("loading");
  });

  it("prefers the API-error state over 'unavailable'", () => {
    // An API failure must keep showing the existing error/retry view — a failed
    // load must never be reported to the user as "these venues are gone".
    expect(
      selectPlanViewState({
        showQuiz: false,
        venuesLoading: false,
        venuesError: "api_error",
        requestedStopsUnavailable: true,
      }),
    ).toBe("error");
  });

  it("still returns 'quiz' for a fresh visit regardless of stops resolution", () => {
    expect(
      selectPlanViewState({
        showQuiz: true,
        venuesLoading: false,
        venuesError: null,
        requestedStopsUnavailable: true,
      }),
    ).toBe("quiz");
  });

  it("defaults requestedStopsUnavailable to false (legacy 4-state behavior)", () => {
    // Callers that never request explicit stops keep the original behavior.
    expect(
      selectPlanViewState({
        showQuiz: false,
        venuesLoading: false,
        venuesError: null,
      }),
    ).toBe("plan");
  });
});

describe("resolveRequestedStops", () => {
  const known = new Set(["astro-pool-lounge", "tamaris-aquaparc", "billardaire"]);

  it("classifies an empty request as 'none' (normal generated plan)", () => {
    expect(resolveRequestedStops([], known)).toEqual({ kind: "none" });
  });

  it("classifies a fully resolvable request as 'resolved' and preserves order", () => {
    const requested = ["billardaire", "astro-pool-lounge", "tamaris-aquaparc"];
    const result = resolveRequestedStops(requested, known);
    expect(result.kind).toBe("resolved");
    // Order must match the requested list exactly, not the known-set order.
    expect(result).toEqual({ kind: "resolved", slugs: requested });
  });

  it("classifies an all-missing request as 'unavailable' (no silent generation)", () => {
    // The exact defect: a saved outing created under the old mock fallback.
    const requested = [
      "marina-sunset-walk",
      "ain-diab-bike-loop",
      "weekend-social-hub",
    ];
    const result = resolveRequestedStops(requested, known);
    expect(result).toEqual({
      kind: "unavailable",
      requestedSlugs: requested,
      missingSlugs: requested,
    });
  });

  it("classifies a partially-missing request as 'unavailable' (no partial plan)", () => {
    // One real slug + two missing must NOT resolve to a one-stop itinerary.
    const requested = ["astro-pool-lounge", "ain-diab-bike-loop", "weekend-social-hub"];
    const result = resolveRequestedStops(requested, known);
    expect(result.kind).toBe("unavailable");
    if (result.kind === "unavailable") {
      expect(result.missingSlugs).toEqual([
        "ain-diab-bike-loop",
        "weekend-social-hub",
      ]);
    }
  });

  it("never treats a resolved-count > 0 as proof of a valid requested plan", () => {
    // Guards against the original `sharedPlanStops.length > 0` bug: even though one
    // slug resolves, the request as a whole is unavailable.
    const requested = ["billardaire", "gone-venue"];
    expect(resolveRequestedStops(requested, known).kind).toBe("unavailable");
  });

  it("reports an empty known set as unavailable for any requested plan", () => {
    // Only ever consulted post-load (selectPlanViewState gates it), but the raw
    // classification is defensively correct on an empty set.
    expect(resolveRequestedStops(["billardaire"], new Set()).kind).toBe(
      "unavailable",
    );
  });
});

describe("resolveStopsToPersist", () => {
  it("prefers freshly-derived stop slugs when present", () => {
    expect(resolveStopsToPersist("a,b,c", "x,y,z")).toBe("a,b,c");
  });

  it("carries the durable URL stops forward when no derived stops exist yet", () => {
    // Regression: a refresh landing before venues resolve has no derived stops,
    // so the completed plan's `stops` URL param must survive.
    expect(resolveStopsToPersist("", "x,y,z")).toBe("x,y,z");
  });

  it("returns an empty string when neither source has stops", () => {
    expect(resolveStopsToPersist("", "")).toBe("");
  });
});

describe("stale-plan invariants (composed helper behavior)", () => {
  const known = new Set(["astro-pool-lounge", "tamaris-aquaparc"]);

  it("preserves the original invalid URL stops while unavailable", () => {
    // PlanPage yields NO derived stops in the unavailable state, so the sync effect
    // carries the original (invalid) `stops` param forward unchanged — the URL is
    // never rewritten to a substitute plan.
    const invalidStopsFromUrl = "marina-sunset-walk,ain-diab-bike-loop";
    expect(resolveRequestedStops(invalidStopsFromUrl.split(","), known).kind).toBe(
      "unavailable",
    );
    // derivedStopSlugs is "" in the unavailable state → URL param survives.
    expect(resolveStopsToPersist("", invalidStopsFromUrl)).toBe(invalidStopsFromUrl);
  });

  it("models explicit recovery: dropping stops returns to a normal generated plan", () => {
    // "Generate a new plan" removes the `stops` param; the request then classifies as
    // 'none', i.e. a fresh generated plan rather than a restoration of the stale one.
    expect(resolveRequestedStops([], known)).toEqual({ kind: "none" });
  });

  it("keeps a valid saved/shared plan on the normal path", () => {
    // A fully-resolvable request stays 'resolved' → PlanPage renders it as before,
    // proving valid saved/shared plans are unaffected by the stale-plan handling.
    const requested = ["astro-pool-lounge", "tamaris-aquaparc"];
    expect(resolveRequestedStops(requested, known)).toEqual({
      kind: "resolved",
      slugs: requested,
    });
    // Its derived stops persist to the URL unchanged (no clobbering).
    expect(resolveStopsToPersist(requested.join(","), requested.join(","))).toBe(
      requested.join(","),
    );
  });
});
