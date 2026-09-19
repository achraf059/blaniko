// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, useEffect, StrictMode } from "react";
import { useCompare } from "./useCompare";
import {
  cleanupRendered,
  installControllableStorage,
  renderIntoDocument,
} from "../test/storageTestUtils";

// Regression coverage for B04 D1: addToCompare/toggleCompare used to derive their
// returned operation result from inside the setCompareSlugs state-updater function
// ("let result; setCompareSlugs(prev => { result = ...; return next; }); return
// result;"). React does not guarantee that updater function runs synchronously, exactly
// once, before the enclosing call returns — it's an internal "eager state" optimization
// that can be skipped, and one React explicitly double-invokes in development
// StrictMode specifically to catch impure updaters. Reading a variable an updater may
// assign is not a safe way to learn what actually happened.
//
// The fix computes {result, next} synchronously against a ref that mirrors the
// authoritative current value, and calls setCompareSlugs/writeCompareSlugs as plain,
// side-effect-free-to-React steps outside any updater.

const STORAGE_KEY = "blaniko:compare:v1";
const COMPARE_EVENT = "blaniko:compare-updated";
const storage = installControllableStorage();

function mountCompare() {
  const box: { value?: ReturnType<typeof useCompare> } = {};
  function Probe() {
    const result = useCompare();
    useEffect(() => {
      box.value = result;
    });
    return null;
  }
  renderIntoDocument(<Probe />);
  return { current: () => box.value! };
}

function mountCompareStrict() {
  const box: { value?: ReturnType<typeof useCompare> } = {};
  function Probe() {
    const result = useCompare();
    useEffect(() => {
      box.value = result;
    });
    return null;
  }
  renderIntoDocument(
    <StrictMode>
      <Probe />
    </StrictMode>,
  );
  return { current: () => box.value! };
}

beforeEach(() => {
  storage.reset();
});

afterEach(() => {
  cleanupRendered();
});

describe("useCompare — basic operation results", () => {
  it("adding the 1st, 2nd, and 3rd venue each report 'added'", () => {
    const hook = mountCompare();
    let r1 = "", r2 = "", r3 = "";
    act(() => {
      r1 = hook.current().addToCompare("a");
      r2 = hook.current().addToCompare("b");
      r3 = hook.current().addToCompare("c");
    });
    expect([r1, r2, r3]).toEqual(["added", "added", "added"]);
    expect(hook.current().compareSlugs).toEqual(["a", "b", "c"]);
  });

  it("a 4th add reports 'limit' and does not change the stored list", () => {
    storage.seed(STORAGE_KEY, '["a","b","c"]');
    const hook = mountCompare();
    let result = "";
    act(() => {
      result = hook.current().addToCompare("d");
    });
    expect(result).toBe("limit");
    expect(hook.current().compareSlugs).toEqual(["a", "b", "c"]);
  });

  it("removing an existing venue reports 'removed'", () => {
    storage.seed(STORAGE_KEY, '["a","b","c"]');
    const hook = mountCompare();
    let result = "";
    act(() => {
      result = hook.current().toggleCompare("b");
    });
    expect(result).toBe("removed");
    expect(hook.current().compareSlugs).toEqual(["a", "c"]);
  });

  it("toggling after previously hitting the limit reports 'removed', not 'limit' (the core D1 regression)", () => {
    storage.seed(STORAGE_KEY, '["a","b","c"]');
    const hook = mountCompare();
    const results: string[] = [];
    act(() => {
      results.push(hook.current().addToCompare("d")); // rejected: at cap
      results.push(hook.current().toggleCompare("b")); // removes an existing venue
    });
    expect(results).toEqual(["limit", "removed"]);
    expect(hook.current().compareSlugs).toEqual(["a", "c"]);
  });

  it("after a removal, adding a new venue reports 'added', not a stale 'limit'", () => {
    storage.seed(STORAGE_KEY, '["a","b","c"]');
    const hook = mountCompare();
    const results: string[] = [];
    act(() => {
      results.push(hook.current().toggleCompare("b")); // removed -> room for one more
      results.push(hook.current().addToCompare("d"));
    });
    expect(results).toEqual(["removed", "added"]);
    expect(hook.current().compareSlugs).toEqual(["a", "c", "d"]);
  });
});

describe("useCompare — exact D1 regression sequence", () => {
  it("reproduces the diagnostic's reported sequence and confirms every result matches the actual stored state", () => {
    // Smallest deterministic sequence from the B04 diagnostic: reach 3, reject a 4th,
    // then remove one — the reported symptom was seeing "limit" feedback for that
    // removal instead of "removed".
    const hook = mountCompare();
    const results: Array<{ op: string; result: string; slugsAfter: string[] }> = [];

    const step = (op: string, slug: string) => {
      let result = "";
      act(() => {
        result = hook.current().toggleCompare(slug);
      });
      results.push({ op, result, slugsAfter: [...hook.current().compareSlugs] });
    };

    step("add a", "a");
    step("add b", "b");
    step("add c", "c");
    step("add d (rejected)", "d");
    step("remove b", "b");
    step("add d (now fits)", "d");

    expect(results.map((r) => r.result)).toEqual(["added", "added", "added", "limit", "removed", "added"]);
    // Every reported result matches what the stored array actually did at that step.
    expect(results[3].slugsAfter).toEqual(["a", "b", "c"]); // rejected add: unchanged
    expect(results[4].slugsAfter).toEqual(["a", "c"]); // "b" genuinely removed
    expect(results[5].slugsAfter).toEqual(["a", "c", "d"]); // "d" genuinely added, appended
    expect(JSON.parse(storage.peek(STORAGE_KEY)!)).toEqual(results[5].slugsAfter);
  });
});

describe("useCompare — StrictMode correctness", () => {
  it("a single toggle under StrictMode reports the correct result on the first call, with exactly one persisted change", () => {
    const hook = mountCompareStrict();
    const setItemSpy = vi.spyOn(Object.getPrototypeOf(storage), "setItem");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    let result = "";
    act(() => {
      result = hook.current().toggleCompare("only-slug");
    });

    expect(result).toBe("added");
    expect(hook.current().compareSlugs).toEqual(["only-slug"]);
    expect(JSON.parse(storage.peek(STORAGE_KEY)!)).toEqual(["only-slug"]);

    // Exactly one logical persisted change and one same-tab notification — StrictMode's
    // double-invocation must not turn one click into two writes/events.
    const compareWrites = setItemSpy.mock.calls.filter((c) => c[0] === STORAGE_KEY).length;
    const compareEventDispatches = dispatchSpy.mock.calls.filter(
      (c) => (c[0] as CustomEvent).type === COMPARE_EVENT,
    ).length;
    expect(compareWrites).toBe(1);
    expect(compareEventDispatches).toBe(1);

    setItemSpy.mockRestore();
    dispatchSpy.mockRestore();
  });

  it("reach-limit-then-remove sequence under StrictMode still reports correct results, no second click needed", () => {
    storage.seed(STORAGE_KEY, '["a","b","c"]');
    const hook = mountCompareStrict();
    const results: string[] = [];

    act(() => {
      results.push(hook.current().toggleCompare("d")); // rejected
    });
    act(() => {
      results.push(hook.current().toggleCompare("b")); // removed
    });

    expect(results).toEqual(["limit", "removed"]);
    expect(hook.current().compareSlugs).toEqual(["a", "c"]);
  });
});

describe("useCompare — English/French feedback mapping stays consistent with the result", () => {
  // The hook itself never renders text (see CompareToggle.test.tsx for the actual EN/FR
  // strings) — this just re-confirms the exact result vocabulary CompareToggle branches
  // on ("limit" | "added" | "removed") is exactly what the hook returns, in both
  // add-from-empty and remove-after-limit cases.
  it("returns only the three vocabulary values CompareToggle understands", () => {
    storage.seed(STORAGE_KEY, '["a","b","c"]');
    const hook = mountCompare();
    const seen = new Set<string>();
    act(() => { seen.add(hook.current().toggleCompare("d")); }); // limit
    act(() => { seen.add(hook.current().toggleCompare("a")); }); // removed
    act(() => { seen.add(hook.current().toggleCompare("a")); }); // added
    expect(seen).toEqual(new Set(["limit", "removed", "added"]));
  });
});

describe("useCompare — existing behavior preserved", () => {
  it("max 3 items and duplicate prevention", () => {
    const hook = mountCompare();
    act(() => {
      hook.current().addToCompare("a");
      hook.current().addToCompare("a"); // duplicate
      hook.current().addToCompare("b");
      hook.current().addToCompare("c");
      hook.current().addToCompare("d"); // over cap
    });
    expect(hook.current().compareSlugs).toEqual(["a", "b", "c"]);
  });

  it("clearCompare empties the list and persists", () => {
    storage.seed(STORAGE_KEY, '["a","b"]');
    const hook = mountCompare();
    act(() => {
      hook.current().clearCompare();
    });
    expect(hook.current().compareSlugs).toEqual([]);
    expect(storage.peek(STORAGE_KEY)).toBe("[]");
  });

  it("restores stored slugs on mount", () => {
    storage.seed(STORAGE_KEY, '["x","y"]');
    const hook = mountCompare();
    expect(hook.current().compareSlugs).toEqual(["x", "y"]);
  });

  it("a storage read failure starts empty without crashing", () => {
    storage.seed(STORAGE_KEY, '["x"]');
    storage.failure = "read";
    const hook = mountCompare();
    expect(hook.current().compareSlugs).toEqual([]);
  });

  it("a storage write failure keeps working in memory without crashing", () => {
    const hook = mountCompare();
    storage.failure = "write";
    let result = "";
    act(() => {
      result = hook.current().addToCompare("a");
    });
    expect(result).toBe("added");
    expect(hook.current().compareSlugs).toEqual(["a"]);
  });

  it("cross-tab: a storage event from another tab updates this instance", () => {
    const hook = mountCompare();
    act(() => {
      storage.seed(STORAGE_KEY, '["x","y"]');
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: '["x","y"]' }));
    });
    expect(hook.current().compareSlugs).toEqual(["x", "y"]);
  });

  it("same-tab: a second useCompare() instance sees this instance's change via the custom event", () => {
    const first = mountCompare();
    const second = mountCompare();
    act(() => {
      first.current().addToCompare("a");
    });
    expect(second.current().compareSlugs).toEqual(["a"]);
  });
});
