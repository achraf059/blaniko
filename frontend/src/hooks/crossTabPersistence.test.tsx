// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, useEffect, StrictMode } from "react";
import { useFavorites } from "./useFavorites";
import { useCollections } from "./useCollections";
import { useRecentActivity } from "./useRecentActivity";
import {
  cleanupRendered,
  installControllableStorage,
  renderIntoDocument,
} from "../test/storageTestUtils";

// Regression coverage for B04 D7: useFavorites/useCollections/useRecentActivity all
// persisted by writing this tab's own (possibly stale) in-memory state — inside a
// functional state updater for Collections/RecentActivity, inside a blanket
// "persist on every state change" effect for Favorites — with no fresh-storage-read
// step before writing. A concurrent write from another tab, not yet reflected in
// this tab's state (the native `storage` event only fires in OTHER tabs, so a
// second tab that hasn't received it is exactly what `storage.seed()` below,
// without dispatching an event, simulates), was silently erased by the next
// mutation performed here. Each hook now re-reads storage fresh immediately before
// every explicit mutation (see the `readMutationBase` helper in each hook file).

vi.mock("../lib/supabaseClient", () => ({ supabase: null }));

const storage = installControllableStorage();

const FAVORITES_KEY = "blaniko:favorites:v1";
const COLLECTIONS_KEY = "blaniko:collections:v1";
const RECENT_KEY = "blaniko:recent-activity:v1";

function mountHook<T>(useHook: () => T) {
  const box: { value?: T } = {};
  function Probe() {
    const result = useHook();
    useEffect(() => {
      box.value = result;
    });
    return null;
  }
  renderIntoDocument(<Probe />);
  return { current: () => box.value! };
}

function mountHookStrict<T>(useHook: () => T) {
  const box: { value?: T } = {};
  function Probe() {
    const result = useHook();
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

function venueItem(id: string, title: string) {
  return { id, type: "venue" as const, title, href: `/venues/${id}` };
}

beforeEach(() => {
  storage.reset();
});

afterEach(() => {
  cleanupRendered();
});

describe("useFavorites — cross-tab lost updates (B04 D7)", () => {
  it("F1: a stale add preserves a favorite added by another tab", () => {
    const tabB = mountHook(useFavorites);
    expect(tabB.current().favoriteSlugs).toEqual([]);

    // Tab A's write arrives in storage; B has not been notified via a storage event.
    storage.seed(FAVORITES_KEY, JSON.stringify(["a"]));

    act(() => {
      tabB.current().addFavorite("b");
    });

    expect(JSON.parse(storage.peek(FAVORITES_KEY)!)).toEqual(["a", "b"]);
  });

  it("F2: a stale tab's later mutation does not resurrect a favorite removed by another tab", () => {
    storage.seed(FAVORITES_KEY, JSON.stringify(["a", "b"]));
    const tabB = mountHook(useFavorites);
    expect(tabB.current().favoriteSlugs).toEqual(["a", "b"]);

    // Tab A removes "a"; B is still stale with ["a","b"] in its own state.
    storage.seed(FAVORITES_KEY, JSON.stringify(["b"]));

    act(() => {
      tabB.current().addFavorite("c");
    });

    const stored = JSON.parse(storage.peek(FAVORITES_KEY)!);
    expect(stored).not.toContain("a");
    expect(stored).toEqual(["b", "c"]);
  });

  it("F3: a stale add of an already-persisted favorite does not create a duplicate", () => {
    const tabB = mountHook(useFavorites);
    storage.seed(FAVORITES_KEY, JSON.stringify(["a"]));

    act(() => {
      tabB.current().addFavorite("a");
    });

    expect(JSON.parse(storage.peek(FAVORITES_KEY)!)).toEqual(["a"]);
  });

  it("a real cross-tab storage event still updates this tab's state", () => {
    const hook = mountHook(useFavorites);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: FAVORITES_KEY, newValue: '["x","y"]' }),
      );
    });
    expect(hook.current().favoriteSlugs).toEqual(["x", "y"]);
  });

  it("repeated toggles remain correct in memory across a sustained write failure (no stale-storage confusion)", () => {
    const hook = mountHook(useFavorites);
    storage.failure = "write";
    act(() => hook.current().toggleFavorite("a"));
    expect(hook.current().isFavorite("a")).toBe(true);
    act(() => hook.current().toggleFavorite("a"));
    expect(hook.current().isFavorite("a")).toBe(false);
    act(() => hook.current().toggleFavorite("a"));
    expect(hook.current().isFavorite("a")).toBe(true);
  });

  it("a mutation still succeeds in memory when the fresh read itself fails", () => {
    storage.seed(FAVORITES_KEY, JSON.stringify(["a"]));
    const hook = mountHook(useFavorites);
    storage.failure = "read";
    act(() => hook.current().addFavorite("b"));
    expect(hook.current().favoriteSlugs).toContain("b");
  });
});

describe("useCollections — cross-tab lost updates (B04 D7)", () => {
  it("a stale create preserves a collection created by another tab", () => {
    const tabB = mountHook(useCollections);
    expect(tabB.current().collections).toEqual([]);

    storage.seed(
      COLLECTIONS_KEY,
      JSON.stringify([{ id: "from-a", name: "From A", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: [] }]),
    );

    act(() => {
      tabB.current().createCollection("From B");
    });

    const stored = JSON.parse(storage.peek(COLLECTIONS_KEY)!);
    const names = stored.map((c: { name: string }) => c.name);
    expect(names).toEqual(["From B", "From A"]);
  });

  it("a stale tab's later mutation does not resurrect a collection deleted by another tab", () => {
    storage.seed(
      COLLECTIONS_KEY,
      JSON.stringify([
        { id: "a", name: "A", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: [] },
        { id: "b", name: "B", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: [] },
      ]),
    );
    const tabB = mountHook(useCollections);
    expect(tabB.current().collections.map((c) => c.id)).toEqual(["a", "b"]);

    // Tab A deletes "a"; B is still stale with both in its own state.
    storage.seed(
      COLLECTIONS_KEY,
      JSON.stringify([{ id: "b", name: "B", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: [] }]),
    );

    act(() => {
      tabB.current().addVenueToCollection("b", "venue-1");
    });

    const stored = JSON.parse(storage.peek(COLLECTIONS_KEY)!);
    expect(stored.map((c: { id: string }) => c.id)).toEqual(["b"]);
    expect(stored[0].venueSlugs).toEqual(["venue-1"]);
  });

  it("addVenueToCollection against a stale view preserves an unrelated collection added by another tab", () => {
    const tabB = mountHook(useCollections);
    let bId = "";
    act(() => {
      bId = tabB.current().createCollection("Mine")!.id;
    });

    // Another tab creates its own collection; B hasn't been notified.
    const currentStored = JSON.parse(storage.peek(COLLECTIONS_KEY)!);
    storage.seed(
      COLLECTIONS_KEY,
      JSON.stringify([
        { id: "from-a", name: "From A", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: [] },
        ...currentStored,
      ]),
    );

    act(() => {
      tabB.current().addVenueToCollection(bId, "venue-1");
    });

    const stored = JSON.parse(storage.peek(COLLECTIONS_KEY)!);
    expect(stored.map((c: { id: string }) => c.id)).toEqual(["from-a", bId]);
    expect(stored.find((c: { id: string }) => c.id === bId).venueSlugs).toEqual(["venue-1"]);
  });

  it("same-tab: a second useCollections() instance sees this instance's change via the custom event", () => {
    const first = mountHook(useCollections);
    const second = mountHook(useCollections);
    act(() => {
      first.current().createCollection("Shared");
    });
    expect(second.current().collections.map((c) => c.name)).toEqual(["Shared"]);
  });

  it("a real cross-tab storage event still updates this tab's state", () => {
    const hook = mountHook(useCollections);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: COLLECTIONS_KEY,
          newValue: JSON.stringify([{ id: "x", name: "X", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: [] }]),
        }),
      );
    });
    expect(hook.current().collections.map((c) => c.name)).toEqual(["X"]);
  });

  it("repeated mutations remain correct in memory across a sustained write failure", () => {
    const hook = mountHook(useCollections);
    storage.failure = "write";
    let id = "";
    act(() => {
      id = hook.current().createCollection("Trip")!.id;
    });
    act(() => hook.current().addVenueToCollection(id, "a"));
    expect(hook.current().collections[0].venueSlugs).toEqual(["a"]);
    act(() => hook.current().deleteCollection(id));
    expect(hook.current().collections).toEqual([]);
  });
});

describe("useRecentActivity — cross-tab lost updates (B04 D7)", () => {
  it("a stale track preserves activity tracked by another tab, newest-first", () => {
    const tabB = mountHook(useRecentActivity);
    expect(tabB.current().activities).toEqual([]);

    storage.seed(
      RECENT_KEY,
      JSON.stringify([{ ...venueItem("a", "From A"), timestamp: "2026-01-01T00:00:00.000Z" }]),
    );

    act(() => {
      tabB.current().trackActivity(venueItem("b", "From B"));
    });

    const stored = JSON.parse(storage.peek(RECENT_KEY)!);
    expect(stored.map((i: { id: string }) => i.id)).toEqual(["b", "a"]);
  });

  it("a stale track does not resurrect activity cleared by another tab", () => {
    storage.seed(
      RECENT_KEY,
      JSON.stringify([{ ...venueItem("a", "From A"), timestamp: "2026-01-01T00:00:00.000Z" }]),
    );
    const tabB = mountHook(useRecentActivity);
    expect(tabB.current().activities.map((i) => i.id)).toEqual(["a"]);

    // Another tab clears everything; B is still stale with "a" in its own state.
    storage.seed(RECENT_KEY, JSON.stringify([]));

    act(() => {
      tabB.current().trackActivity(venueItem("b", "From B"));
    });

    const stored = JSON.parse(storage.peek(RECENT_KEY)!);
    expect(stored.map((i: { id: string }) => i.id)).toEqual(["b"]);
  });

  it("caps at MAX_RECENT_ACTIVITY_ITEMS (18) after a fresh-read merge, dropping the oldest", () => {
    const seeded = Array.from({ length: 18 }, (_, i) => ({
      ...venueItem(`seed-${i}`, `Seed ${i}`),
      timestamp: `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`,
    }));
    storage.seed(RECENT_KEY, JSON.stringify(seeded));
    const hook = mountHook(useRecentActivity);

    act(() => {
      hook.current().trackActivity(venueItem("newest", "Newest"));
    });

    const stored = JSON.parse(storage.peek(RECENT_KEY)!);
    expect(stored).toHaveLength(18);
    expect(stored[0].id).toBe("newest");
    expect(stored.map((i: { id: string }) => i.id)).not.toContain("seed-17");
  });

  it("tracking the same id+type again dedups and moves it to the front, even against a fresh stale read", () => {
    storage.seed(
      RECENT_KEY,
      JSON.stringify([
        { ...venueItem("a", "From A"), timestamp: "2026-01-01T00:00:00.000Z" },
        { ...venueItem("b", "From B"), timestamp: "2026-01-01T00:00:01.000Z" },
      ]),
    );
    const hook = mountHook(useRecentActivity);

    act(() => {
      hook.current().trackActivity(venueItem("a", "From A again"));
    });

    const stored = JSON.parse(storage.peek(RECENT_KEY)!);
    expect(stored.map((i: { id: string }) => i.id)).toEqual(["a", "b"]);
  });

  it("same-tab: a second useRecentActivity() instance sees this instance's change via the custom event", () => {
    const first = mountHook(useRecentActivity);
    const second = mountHook(useRecentActivity);
    act(() => {
      first.current().trackActivity(venueItem("a", "From first"));
    });
    expect(second.current().activities.map((i) => i.id)).toEqual(["a"]);
  });

  it("a real cross-tab storage event still updates this tab's state", () => {
    const hook = mountHook(useRecentActivity);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: RECENT_KEY,
          newValue: JSON.stringify([{ ...venueItem("x", "X"), timestamp: "2026-01-01T00:00:00.000Z" }]),
        }),
      );
    });
    expect(hook.current().activities.map((i) => i.id)).toEqual(["x"]);
  });

  it("repeated tracking remains correct in memory across a sustained write failure", () => {
    const hook = mountHook(useRecentActivity);
    storage.failure = "write";
    act(() => hook.current().trackActivity(venueItem("a", "A")));
    act(() => hook.current().trackActivity(venueItem("b", "B")));
    expect(hook.current().activities.map((i) => i.id)).toEqual(["b", "a"]);
  });
});

describe("StrictMode — one logical mutation stays one write (B04 D7)", () => {
  // Collections/RecentActivity used to persist from inside a `setState` functional
  // updater — the same purity problem D1 removed from Compare — so StrictMode's
  // dev-mode double-invocation of that updater could turn one click into two writes
  // and two event dispatches. Persistence now runs as a plain step outside any
  // updater, so it must run exactly once per logical mutation even under StrictMode.

  it("useCollections: one createCollection call under StrictMode is exactly one write and one dispatch", () => {
    const hook = mountHookStrict(useCollections);
    const setItemSpy = vi.spyOn(Object.getPrototypeOf(storage), "setItem");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    act(() => {
      hook.current().createCollection("Only one");
    });

    expect(hook.current().collections.map((c) => c.name)).toEqual(["Only one"]);
    const writes = setItemSpy.mock.calls.filter((c) => c[0] === COLLECTIONS_KEY).length;
    const dispatches = dispatchSpy.mock.calls.filter(
      (c) => (c[0] as CustomEvent).type === "blaniko:collections-updated",
    ).length;
    expect(writes).toBe(1);
    expect(dispatches).toBe(1);

    setItemSpy.mockRestore();
    dispatchSpy.mockRestore();
  });

  it("useRecentActivity: one trackActivity call under StrictMode is exactly one write and one dispatch", () => {
    const hook = mountHookStrict(useRecentActivity);
    const setItemSpy = vi.spyOn(Object.getPrototypeOf(storage), "setItem");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    act(() => {
      hook.current().trackActivity(venueItem("only-one", "Only one"));
    });

    expect(hook.current().activities.map((i) => i.id)).toEqual(["only-one"]);
    const writes = setItemSpy.mock.calls.filter((c) => c[0] === RECENT_KEY).length;
    const dispatches = dispatchSpy.mock.calls.filter(
      (c) => (c[0] as CustomEvent).type === "blaniko:recent-activity-updated",
    ).length;
    expect(writes).toBe(1);
    expect(dispatches).toBe(1);

    setItemSpy.mockRestore();
    dispatchSpy.mockRestore();
  });

  it("useFavorites: mounting under StrictMode performs no destructive persistence (blanket effect removed)", () => {
    storage.seed(FAVORITES_KEY, JSON.stringify(["a", "b"]));
    const setItemSpy = vi.spyOn(Object.getPrototypeOf(storage), "setItem");

    const hook = mountHookStrict(useFavorites);

    expect(hook.current().favoriteSlugs).toEqual(["a", "b"]);
    // Mounting alone must never write — only an explicit mutation persists.
    const writes = setItemSpy.mock.calls.filter((c) => c[0] === FAVORITES_KEY).length;
    expect(writes).toBe(0);
    expect(JSON.parse(storage.peek(FAVORITES_KEY)!)).toEqual(["a", "b"]);

    setItemSpy.mockRestore();
  });
});

describe("failure-recovery reconciliation (B04 D7 correction)", () => {
  // A boolean "my last write failed, ignore storage" flag cannot distinguish
  // "storage still holds what it held before my failed write" from "another tab
  // has since written something newer" — so it either always ignores storage
  // (losing other tabs' concurrent writes) or always trusts it (losing this tab's
  // own unpersisted action). These tests prove the corrected pending-operation
  // model preserves BOTH kinds of change once recovery succeeds.

  describe("useFavorites", () => {
    it("R1: no concurrent external write — a locally-pending favorite is not lost on recovery", () => {
      const hook = mountHook(useFavorites);
      storage.failure = "write";
      act(() => hook.current().addFavorite("B"));
      expect(hook.current().favoriteSlugs).toEqual(["B"]);
      expect(storage.peek(FAVORITES_KEY)).toBeNull();

      storage.failure = "none";
      act(() => hook.current().addFavorite("C"));

      expect(hook.current().favoriteSlugs).toEqual(["B", "C"]);
      expect(JSON.parse(storage.peek(FAVORITES_KEY)!)).toEqual(["B", "C"]);
    });

    it("R2: a concurrent external write survives this tab's failure-recovery mutation", () => {
      storage.seed(FAVORITES_KEY, JSON.stringify(["A"]));
      const hook = mountHook(useFavorites);
      storage.failure = "write";
      act(() => hook.current().addFavorite("B"));
      expect(hook.current().favoriteSlugs).toEqual(["A", "B"]);
      expect(JSON.parse(storage.peek(FAVORITES_KEY)!)).toEqual(["A"]); // write failed

      // Another tab successfully persists "D"; this tab has not received an event.
      storage.failure = "none";
      storage.seed(FAVORITES_KEY, JSON.stringify(["A", "D"]));

      act(() => hook.current().addFavorite("C"));

      const stored = JSON.parse(storage.peek(FAVORITES_KEY)!);
      expect(stored).toContain("D"); // <-- the exact defect this correction fixes
      expect(stored).toContain("B");
      expect(stored).toContain("C");
      expect(stored).toEqual(["A", "D", "B", "C"]);
    });

    it("R3: a native storage event while dirty reconciles external data with pending local intent, without persisting", () => {
      storage.seed(FAVORITES_KEY, JSON.stringify(["A"]));
      const hook = mountHook(useFavorites);
      storage.failure = "write";
      act(() => hook.current().addFavorite("B"));
      expect(hook.current().favoriteSlugs).toEqual(["A", "B"]);

      // The event fires because another tab's write already landed in storage —
      // `seed` here mirrors that real write directly (bypassing `setItem`, exactly
      // as a genuinely separate tab's own write would not go through this tab's
      // `setItem`), then the event notifies this tab about it, matching a real
      // browser's native `storage` event semantics.
      storage.seed(FAVORITES_KEY, JSON.stringify(["A", "D"]));
      const setItemSpy = vi.spyOn(Object.getPrototypeOf(storage), "setItem");
      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", { key: FAVORITES_KEY, newValue: JSON.stringify(["A", "D"]) }),
        );
      });
      // Receiving the event must not itself persist.
      expect(setItemSpy).not.toHaveBeenCalled();
      setItemSpy.mockRestore();

      // Visible state reconciles external "D" with this tab's still-pending "B".
      expect(hook.current().favoriteSlugs).toEqual(["A", "D", "B"]);

      // The next explicit mutation resumes from that reconciled situation.
      storage.failure = "none";
      act(() => hook.current().addFavorite("C"));
      expect(JSON.parse(storage.peek(FAVORITES_KEY)!)).toEqual(["A", "D", "B", "C"]);
    });

    it("recovery success clears pending state: a later normal mutation is not duplicated", () => {
      const hook = mountHook(useFavorites);
      storage.failure = "write";
      act(() => hook.current().addFavorite("B"));
      storage.failure = "none";
      act(() => hook.current().addFavorite("C")); // recovers, pending clears

      // A further mutation must not replay "B" or "C" again.
      act(() => hook.current().addFavorite("D"));
      expect(hook.current().favoriteSlugs).toEqual(["B", "C", "D"]);
      expect(JSON.parse(storage.peek(FAVORITES_KEY)!)).toEqual(["B", "C", "D"]);
    });

    it("a fresh read failure while dirty still uses the reconciled local view (PR #240 tradeoff)", () => {
      const hook = mountHook(useFavorites);
      storage.failure = "write";
      act(() => hook.current().addFavorite("B"));
      expect(hook.current().favoriteSlugs).toEqual(["B"]);

      storage.failure = "read";
      act(() => hook.current().addFavorite("C"));
      expect(hook.current().favoriteSlugs).toEqual(["B", "C"]);
    });
  });

  describe("useCollections", () => {
    it("R1: no concurrent external write — a locally-pending collection is not lost on recovery", () => {
      const hook = mountHook(useCollections);
      storage.failure = "write";
      let bId = "";
      act(() => {
        bId = hook.current().createCollection("B")!.id;
      });
      expect(hook.current().collections.map((c) => c.name)).toEqual(["B"]);

      storage.failure = "none";
      act(() => hook.current().addVenueToCollection(bId, "v1"));

      const stored = JSON.parse(storage.peek(COLLECTIONS_KEY)!);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe("B");
      expect(stored[0].venueSlugs).toEqual(["v1"]);
    });

    it("R2: a concurrent external collection survives this tab's failure-recovery mutation", () => {
      storage.seed(
        COLLECTIONS_KEY,
        JSON.stringify([{ id: "a", name: "A", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: [] }]),
      );
      const hook = mountHook(useCollections);
      storage.failure = "write";
      let bId = "";
      act(() => {
        bId = hook.current().createCollection("B")!.id;
      });
      expect(hook.current().collections.map((c) => c.id)).toEqual([bId, "a"]);

      // Another tab successfully persists a new collection "D"; no event received.
      storage.failure = "none";
      storage.seed(
        COLLECTIONS_KEY,
        JSON.stringify([
          { id: "d", name: "D", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: [] },
          { id: "a", name: "A", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: [] },
        ]),
      );

      act(() => {
        hook.current().createCollection("C");
      });

      const storedNames = JSON.parse(storage.peek(COLLECTIONS_KEY)!).map((c: { name: string }) => c.name);
      expect(storedNames).toContain("D"); // <-- the exact defect this correction fixes
      expect(storedNames).toContain("B");
      expect(storedNames).toContain("C");
      expect(storedNames).toContain("A");
    });

    it("R3: a native storage event while dirty reconciles external data with pending local intent, without persisting", () => {
      const hook = mountHook(useCollections);
      storage.failure = "write";
      let bId = "";
      act(() => {
        bId = hook.current().createCollection("B")!.id;
      });

      const dEventValue = JSON.stringify([
        { id: "d", name: "D", createdAt: "2026-01-01T00:00:00.000Z", venueSlugs: [] },
      ]);
      storage.seed(COLLECTIONS_KEY, dEventValue);
      const setItemSpy = vi.spyOn(Object.getPrototypeOf(storage), "setItem");
      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: COLLECTIONS_KEY,
            newValue: dEventValue,
          }),
        );
      });
      expect(setItemSpy).not.toHaveBeenCalled();
      setItemSpy.mockRestore();

      const namesAfterEvent = hook.current().collections.map((c) => c.name);
      expect(namesAfterEvent).toContain("D");
      expect(namesAfterEvent).toContain("B");

      storage.failure = "none";
      act(() => {
        hook.current().addVenueToCollection(bId, "v1");
      });
      const stored = JSON.parse(storage.peek(COLLECTIONS_KEY)!);
      expect(stored.map((c: { name: string }) => c.name)).toEqual(expect.arrayContaining(["D", "B"]));
      expect(stored.find((c: { id: string }) => c.id === bId).venueSlugs).toEqual(["v1"]);
    });

    it("recovery success clears pending state: a later normal mutation is not duplicated", () => {
      const hook = mountHook(useCollections);
      storage.failure = "write";
      let bId = "";
      act(() => {
        bId = hook.current().createCollection("B")!.id;
      });
      storage.failure = "none";
      act(() => hook.current().addVenueToCollection(bId, "v1")); // recovers, pending clears

      act(() => hook.current().addVenueToCollection(bId, "v2"));
      const stored = JSON.parse(storage.peek(COLLECTIONS_KEY)!);
      expect(stored).toHaveLength(1);
      expect(stored[0].venueSlugs).toEqual(["v1", "v2"]);
    });
  });

  describe("useRecentActivity", () => {
    it("R1: no concurrent external write — a locally-pending activity is not lost on recovery", () => {
      const hook = mountHook(useRecentActivity);
      storage.failure = "write";
      act(() => hook.current().trackActivity(venueItem("b", "B")));
      expect(hook.current().activities.map((i) => i.id)).toEqual(["b"]);

      storage.failure = "none";
      act(() => hook.current().trackActivity(venueItem("c", "C")));

      const stored = JSON.parse(storage.peek(RECENT_KEY)!);
      expect(stored.map((i: { id: string }) => i.id)).toEqual(["c", "b"]);
    });

    it("R2: a concurrent external activity survives this tab's failure-recovery mutation", () => {
      storage.seed(
        RECENT_KEY,
        JSON.stringify([{ ...venueItem("a", "A"), timestamp: "2026-01-01T00:00:00.000Z" }]),
      );
      const hook = mountHook(useRecentActivity);
      storage.failure = "write";
      act(() => hook.current().trackActivity(venueItem("b", "B")));
      expect(hook.current().activities.map((i) => i.id)).toEqual(["b", "a"]);

      // Another tab successfully tracks "d"; this tab has not received an event.
      storage.failure = "none";
      storage.seed(
        RECENT_KEY,
        JSON.stringify([
          { ...venueItem("d", "D"), timestamp: "2026-01-02T00:00:00.000Z" },
          { ...venueItem("a", "A"), timestamp: "2026-01-01T00:00:00.000Z" },
        ]),
      );

      act(() => hook.current().trackActivity(venueItem("c", "C")));

      const storedIds = JSON.parse(storage.peek(RECENT_KEY)!).map((i: { id: string }) => i.id);
      expect(storedIds).toContain("d"); // <-- the exact defect this correction fixes
      expect(storedIds).toContain("b");
      expect(storedIds).toContain("c");
      expect(storedIds).toEqual(["c", "b", "d", "a"]);
    });

    it("R3: a native storage event while dirty reconciles external data with pending local intent, without persisting", () => {
      const hook = mountHook(useRecentActivity);
      storage.failure = "write";
      act(() => hook.current().trackActivity(venueItem("b", "B")));

      const dEventValue = JSON.stringify([{ ...venueItem("d", "D"), timestamp: "2026-01-02T00:00:00.000Z" }]);
      storage.seed(RECENT_KEY, dEventValue);
      const setItemSpy = vi.spyOn(Object.getPrototypeOf(storage), "setItem");
      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: RECENT_KEY,
            newValue: dEventValue,
          }),
        );
      });
      expect(setItemSpy).not.toHaveBeenCalled();
      setItemSpy.mockRestore();

      expect(hook.current().activities.map((i) => i.id)).toEqual(["b", "d"]);

      storage.failure = "none";
      act(() => hook.current().trackActivity(venueItem("c", "C")));
      const storedIds = JSON.parse(storage.peek(RECENT_KEY)!).map((i: { id: string }) => i.id);
      expect(storedIds).toEqual(["c", "b", "d"]);
    });

    it("recovery success clears pending state: a later normal mutation is not duplicated", () => {
      const hook = mountHook(useRecentActivity);
      storage.failure = "write";
      act(() => hook.current().trackActivity(venueItem("b", "B")));
      storage.failure = "none";
      act(() => hook.current().trackActivity(venueItem("c", "C"))); // recovers, pending clears

      act(() => hook.current().trackActivity(venueItem("d", "D")));
      const storedIds = JSON.parse(storage.peek(RECENT_KEY)!).map((i: { id: string }) => i.id);
      expect(storedIds).toEqual(["d", "c", "b"]);
    });

    it("a stale clear does not erase activity tracked by another tab after the clear was issued", () => {
      storage.seed(
        RECENT_KEY,
        JSON.stringify([{ ...venueItem("a", "A"), timestamp: "2026-01-01T00:00:00.000Z" }]),
      );
      const hook = mountHook(useRecentActivity);
      storage.failure = "write";
      act(() => hook.current().clearActivities());
      expect(hook.current().activities).toEqual([]);

      // Another tab tracks new activity after the clear was issued.
      storage.failure = "none";
      storage.seed(
        RECENT_KEY,
        JSON.stringify([{ ...venueItem("e", "External"), timestamp: "2026-01-02T00:00:00.000Z" }]),
      );

      act(() => hook.current().trackActivity(venueItem("c", "C")));

      const storedIds = JSON.parse(storage.peek(RECENT_KEY)!).map((i: { id: string }) => i.id);
      expect(storedIds).toContain("e"); // survives — it postdates the clear
      expect(storedIds).not.toContain("a"); // still correctly cleared
      expect(storedIds).toContain("c");
    });
  });
});
