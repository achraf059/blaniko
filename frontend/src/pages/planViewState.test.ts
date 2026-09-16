import { describe, expect, it } from "vitest";
import { resolveStopsToPersist, selectPlanViewState } from "./planViewState";

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
