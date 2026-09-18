// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, useEffect, useRef } from "react";
import { MemoryRouter } from "react-router";
import { useFavorites } from "./useFavorites";
import { useCompare } from "./useCompare";
import { useCollections } from "./useCollections";
import { useRecentActivity } from "./useRecentActivity";
import {
  buildAllowedAnswerValues,
  clearRecommendationStateStorage,
  createDefaultQuizAnswers,
  hydrateRecommendationState,
  persistRecommendationState,
} from "./recommendationState";
import { OutingQuiz } from "../components/plan/OutingQuiz";
import { I18nProvider } from "../i18n/I18nProvider";
import {
  cleanupRendered,
  click,
  findButtonByText,
  installControllableStorage,
  renderIntoDocument,
  type StorageFailure,
} from "../test/storageTestUtils";

// Regression coverage for B04 D4: browser-storage failures in the persistence
// hooks must degrade to in-memory state, never crash the calling page.

vi.mock("../lib/supabaseClient", () => ({ supabase: null }));

const storage = installControllableStorage();

const KEYS = {
  favorites: "blaniko:favorites:v1",
  compare: "blaniko:compare:v1",
  collections: "blaniko:collections:v1",
  recent: "blaniko:recent-activity:v1",
  quiz: "blaniko:recommendations-state:v1",
};

const READ_FAILURES: StorageFailure[] = ["access", "read"];

// Renders a hook inside a real React root and exposes its latest return value.
function mountHook<T>(useHook: () => T): { current: () => T } {
  const box: { value?: T } = {};
  function Probe() {
    const result = useHook();
    useEffect(() => {
      box.value = result;
    });
    return null;
  }
  renderIntoDocument(<Probe />);
  return { current: () => box.value as T };
}

function otherTabWrite(key: string, newValue: string | null) {
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
  });
}

beforeEach(() => {
  storage.reset();
});

afterEach(() => {
  cleanupRendered();
});

describe("useFavorites", () => {
  it("restores stored favorites and persists changes", () => {
    storage.seed(KEYS.favorites, '["a"]');
    const hook = mountHook(useFavorites);
    expect(hook.current().favoriteSlugs).toEqual(["a"]);
    act(() => hook.current().toggleFavorite("b"));
    expect(JSON.parse(storage.peek(KEYS.favorites)!)).toEqual(["a", "b"]);
  });

  it.each(READ_FAILURES)("starts empty when storage %s fails", (failure) => {
    storage.seed(KEYS.favorites, '["a"]');
    storage.failure = failure;
    const hook = mountHook(useFavorites);
    expect(hook.current().favoriteSlugs).toEqual([]);
  });

  it("keeps toggling in memory when writes fail", () => {
    const hook = mountHook(useFavorites);
    storage.failure = "write";
    act(() => hook.current().toggleFavorite("a"));
    expect(hook.current().isFavorite("a")).toBe(true);
    act(() => hook.current().toggleFavorite("a"));
    expect(hook.current().isFavorite("a")).toBe(false);
  });

  it("still picks up another tab's write", () => {
    const hook = mountHook(useFavorites);
    otherTabWrite(KEYS.favorites, '["x","y"]');
    expect(hook.current().favoriteSlugs).toEqual(["x", "y"]);
  });
});

describe("useCompare", () => {
  it("restores stored compare slugs and persists additions", () => {
    storage.seed(KEYS.compare, '["a"]');
    const hook = mountHook(useCompare);
    expect(hook.current().compareSlugs).toEqual(["a"]);
    act(() => {
      hook.current().addToCompare("b");
    });
    expect(JSON.parse(storage.peek(KEYS.compare)!)).toEqual(["a", "b"]);
  });

  it.each(READ_FAILURES)("starts empty when storage %s fails", (failure) => {
    storage.seed(KEYS.compare, '["a"]');
    storage.failure = failure;
    const hook = mountHook(useCompare);
    expect(hook.current().compareSlugs).toEqual([]);
  });

  it("keeps compare state in memory when writes fail", () => {
    const hook = mountHook(useCompare);
    storage.failure = "write";
    act(() => {
      hook.current().addToCompare("a");
    });
    expect(hook.current().compareSlugs).toEqual(["a"]);
    act(() => hook.current().removeFromCompare("a"));
    expect(hook.current().compareSlugs).toEqual([]);
  });

  it("syncs same-tab instances and picks up another tab's write", () => {
    const first = mountHook(useCompare);
    const second = mountHook(useCompare);
    act(() => {
      first.current().addToCompare("a");
    });
    expect(second.current().compareSlugs).toEqual(["a"]);
    otherTabWrite(KEYS.compare, '["x","y"]');
    expect(first.current().compareSlugs).toEqual(["x", "y"]);
  });
});

describe("useCollections", () => {
  const stored = JSON.stringify([
    { id: "c1", name: "Weekend", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: ["a"] },
    { id: "", name: "invalid — no id", venueSlugs: [] },
  ]);

  it("restores valid stored collections with existing validation unchanged", () => {
    storage.seed(KEYS.collections, stored);
    const hook = mountHook(useCollections);
    expect(hook.current().collections.map((c) => c.name)).toEqual(["Weekend"]);
  });

  it.each(READ_FAILURES)("starts empty when storage %s fails", (failure) => {
    storage.seed(KEYS.collections, stored);
    storage.failure = failure;
    const hook = mountHook(useCollections);
    expect(hook.current().collections).toEqual([]);
  });

  it("keeps create / add / delete working in memory when writes fail", () => {
    const hook = mountHook(useCollections);
    storage.failure = "write";
    act(() => {
      hook.current().createCollection("Trip");
    });
    const id = hook.current().collections[0].id;
    act(() => hook.current().addVenueToCollection(id, "a"));
    expect(hook.current().collections[0].venueSlugs).toEqual(["a"]);
    act(() => hook.current().deleteCollection(id));
    expect(hook.current().collections).toEqual([]);
  });

  it("syncs same-tab instances when storage works", () => {
    const first = mountHook(useCollections);
    const second = mountHook(useCollections);
    act(() => {
      first.current().createCollection("Shared");
    });
    expect(second.current().collections.map((c) => c.name)).toEqual(["Shared"]);
  });
});

describe("useRecentActivity", () => {
  const item = { id: "v1", type: "venue" as const, title: "Venue", href: "/venues/v1" };

  it("restores stored activity and persists new activity", () => {
    storage.seed(KEYS.recent, JSON.stringify([{ ...item, timestamp: "2026-01-01T00:00:00.000Z" }]));
    const hook = mountHook(useRecentActivity);
    expect(hook.current().activities.map((a) => a.id)).toEqual(["v1"]);
    act(() => hook.current().trackActivity({ ...item, id: "v2", href: "/venues/v2" }));
    expect(JSON.parse(storage.peek(KEYS.recent)!).map((a: { id: string }) => a.id)).toEqual(["v2", "v1"]);
  });

  it.each(READ_FAILURES)("starts empty when storage %s fails", (failure) => {
    storage.seed(KEYS.recent, JSON.stringify([{ ...item, timestamp: "2026-01-01T00:00:00.000Z" }]));
    storage.failure = failure;
    const hook = mountHook(useRecentActivity);
    expect(hook.current().activities).toEqual([]);
  });

  it("does not crash a page that tracks a view on mount when writes fail", () => {
    storage.failure = "write";
    function PageTrackingAView() {
      const { trackActivity, activities } = useRecentActivity();
      // Mirrors VenuePage/AreaPage/GuideDetailPage, which track in an effect.
      useEffectOnce(() => trackActivity(item));
      return <p data-testid="count">{activities.length}</p>;
    }
    const container = renderIntoDocument(<PageTrackingAView />);
    expect(container.querySelector("[data-testid='count']")?.textContent).toBe("1");
  });
});

// Local helper so the tracking component above runs its effect exactly once.
function useEffectOnce(effect: () => void) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    effect();
  });
}

describe("recommendation (quiz) state", () => {
  const questions = [
    { id: "companion" as const, options: [{ value: "alone" }, { value: "friends" }] },
    { id: "category" as const, options: [{ value: "gaming" }, { value: "sports" }] },
    { id: "vibe" as const, options: [{ value: "chill" }, { value: "social" }] },
  ];
  const hydrate = () =>
    hydrateRecommendationState({
      searchParams: new URLSearchParams(),
      questionOrder: ["companion", "category", "vibe"],
      totalSteps: 3,
      allowedValues: buildAllowedAnswerValues(questions),
    });
  const draft = { ...createDefaultQuizAnswers(), companion: "friends" };

  it("persists and restores a draft", () => {
    persistRecommendationState({ answers: draft, stepIndex: 1, isComplete: false });
    const restored = hydrate();
    expect(restored.answers.companion).toBe("friends");
    expect(restored.stepIndex).toBe(1);
  });

  it.each(READ_FAILURES)("falls back to a fresh quiz when storage %s fails", (failure) => {
    persistRecommendationState({ answers: draft, stepIndex: 1, isComplete: false });
    storage.failure = failure;
    const restored = hydrate();
    expect(restored.answers.companion).toBe("");
    expect(restored.stepIndex).toBe(0);
  });

  it("does not throw when persisting or clearing fails", () => {
    storage.failure = "write";
    expect(() => persistRecommendationState({ answers: draft, stepIndex: 0, isComplete: false })).not.toThrow();
    storage.failure = "remove";
    expect(() => clearRecommendationStateStorage()).not.toThrow();
  });

  it("clears only the quiz draft key", () => {
    storage.seed(KEYS.favorites, '["keep"]');
    persistRecommendationState({ answers: draft, stepIndex: 0, isComplete: false });
    clearRecommendationStateStorage();
    expect(storage.peek(KEYS.quiz)).toBeNull();
    expect(storage.peek(KEYS.favorites)).toBe('["keep"]');
  });
});

describe("OutingQuiz", () => {
  const FINAL_STEP_URL = "/plan?with=friends&category=gaming&vibe=social";

  function renderQuiz(onComplete: () => void) {
    return renderIntoDocument(
      <MemoryRouter initialEntries={[FINAL_STEP_URL]}>
        <I18nProvider>
          <OutingQuiz onComplete={onComplete} />
        </I18nProvider>
      </MemoryRouter>,
    );
  }

  it("clears the draft and completes normally", () => {
    const onComplete = vi.fn();
    const container = renderQuiz(onComplete);
    expect(storage.peek(KEYS.quiz)).not.toBeNull();
    click(findButtonByText(container, "Build my outing"));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(storage.peek(KEYS.quiz)).toBeNull();
  });

  it("renders and answers when the draft cannot be persisted", () => {
    storage.failure = "write";
    const onComplete = vi.fn();
    const container = renderQuiz(onComplete);
    click(findButtonByText(container, "Build my outing"));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("still completes when removing the draft fails (previously stuck on the final step)", () => {
    const onComplete = vi.fn();
    const container = renderQuiz(onComplete);
    storage.failure = "remove";
    click(findButtonByText(container, "Build my outing"));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      companion: "friends",
      category: "gaming",
      vibe: "social",
    });
  });
});

// A failed initial read leaves the stored value unknown. The critical pattern for
// every owner that writes automatically after mounting: stored value survives the
// mount, and a later deliberate action still persists.
describe("a failed initial read never overwrites stored data automatically", () => {
  it("useFavorites: mount keeps stored favorites, a deliberate toggle persists", () => {
    storage.seed(KEYS.favorites, '["a","b"]');
    storage.failure = "read"; // reads fail, writes still work
    const hook = mountHook(useFavorites);
    expect(storage.peek(KEYS.favorites)).toBe('["a","b"]');

    act(() => hook.current().toggleFavorite("c"));
    expect(JSON.parse(storage.peek(KEYS.favorites)!)).toEqual(["c"]);
  });

  it("useRecentActivity: automatic page-view tracking keeps stored history, a deliberate clear persists", () => {
    const stored = JSON.stringify([
      { id: "old", type: "venue", title: "Old", href: "/venues/old", timestamp: "2026-01-01T00:00:00.000Z" },
    ]);
    storage.seed(KEYS.recent, stored);
    storage.failure = "read";
    const hook = mountHook(useRecentActivity);
    act(() => hook.current().trackActivity({ id: "v1", type: "venue", title: "One", href: "/venues/v1" }));
    act(() => hook.current().trackActivity({ id: "v2", type: "venue", title: "Two", href: "/venues/v2" }));
    expect(hook.current().activities.map((a) => a.id)).toEqual(["v2", "v1"]);
    expect(storage.peek(KEYS.recent)).toBe(stored);

    act(() => hook.current().clearActivities());
    expect(storage.peek(KEYS.recent)).toBe("[]");
    act(() => hook.current().trackActivity({ id: "v3", type: "venue", title: "Three", href: "/venues/v3" }));
    expect(JSON.parse(storage.peek(KEYS.recent)!).map((a: { id: string }) => a.id)).toEqual(["v3"]);
  });

  it("OutingQuiz: mount keeps the stored draft, a deliberate answer persists", () => {
    const stored = JSON.stringify({
      version: 1,
      answers: { ...createDefaultQuizAnswers(), companion: "family", category: "sports" },
      stepIndex: 2,
      isComplete: false,
    });
    storage.seed(KEYS.quiz, stored);
    storage.failure = "read";
    const container = renderIntoDocument(
      <MemoryRouter initialEntries={["/plan"]}>
        <I18nProvider>
          <OutingQuiz onComplete={() => {}} />
        </I18nProvider>
      </MemoryRouter>,
    );
    expect(storage.peek(KEYS.quiz)).toBe(stored);

    click([...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith("Friends")));
    expect(JSON.parse(storage.peek(KEYS.quiz)!).answers.companion).toBe("friends");
  });
});
