// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { MemoryRouter } from "react-router";
import PlanPage from "./PlanPage";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { I18nProvider } from "../i18n/I18nProvider";
import { ThemeProvider } from "../hooks/useTheme";
import { AuthProvider } from "../auth/AuthProvider";
import { venues as fixtureVenues } from "../data/mockData";
import {
  cleanupRendered,
  click,
  findButtonByText,
  flushAsync,
  installControllableStorage,
  renderIntoDocument,
  type StorageFailure,
} from "../test/storageTestUtils";

// Regression coverage for B04 D4 on the Plan route: a browser-storage failure while
// reading, saving or deleting saved outings must not trip the route ErrorBoundary.
// (D3 — malformed saved-outing *structures*, as opposed to storage failures — has its
// own describe blocks further down, plus a dedicated pure-sanitizer suite in
// savedOutings.test.ts.)

vi.mock("../lib/supabaseClient", () => ({ supabase: null }));

const storage = installControllableStorage();

const SAVED_KEY = "blaniko:saved-outings:v1";
const SAVED_KEY_LEGACY = "blaniko_saved_outings_v1";
const PLAN_URL = "/plan?with=friends&mood=social&style=friends-hangout&seed=0&quizDone=1";

const [first, second] = fixtureVenues;
const storedOuting = {
  id: "stored-1",
  title: "Stored plan",
  summary: "A stored outing",
  createdAt: "2026-09-01T10:00:00.000Z",
  withWho: "friends",
  mood: "social",
  budget: "all",
  area: "any",
  planStyle: "friends-hangout",
  stops: [
    { slug: first.slug, name: first.name },
    { slug: second.slug, name: second.name },
  ],
};

async function renderPlan(): Promise<HTMLElement> {
  const container = renderIntoDocument(
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[PLAN_URL]}>
            <ErrorBoundary>
              <PlanPage />
            </ErrorBoundary>
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  for (let i = 0; i < 10 && !container.querySelector(".bl-plan-saved"); i += 1) {
    await flushAsync();
  }
  return container;
}

const routeCrashed = (container: HTMLElement) =>
  Boolean(container.querySelector(".bl-error-boundary"));
const savedTitles = (container: HTMLElement) =>
  [...container.querySelectorAll(".bl-plan-saved-card-title")].map((node) => node.textContent);
const storedIds = () =>
  (JSON.parse(storage.peek(SAVED_KEY) ?? "[]") as Array<{ id: string }>).map((o) => o.id);

// Simulates another tab writing this key: real browsers fire the `storage` event only
// in *other* documents, never the one that made the write, so a tab's own save/delete
// (which calls writeStorageItem directly) must never dispatch this itself — only tests
// standing in for "another tab" do.
function otherTabWrites(payload: unknown) {
  const value = JSON.stringify(payload);
  storage.seed(SAVED_KEY, value);
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: SAVED_KEY, newValue: value }));
  });
}

function otherTabClears() {
  storage.removeItem(SAVED_KEY);
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: SAVED_KEY, newValue: null }));
  });
}

beforeEach(() => {
  storage.reset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => fixtureVenues })),
  );
});

afterEach(() => {
  cleanupRendered();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PlanPage saved outings — normal storage", () => {
  it("restores stored outings, then persists save and delete", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([storedOuting]));
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual(["Stored plan"]);

    click(findButtonByText(container, "Save outing"));
    expect(storedIds()).toHaveLength(2);

    click(container.querySelector("[aria-label='Delete — Stored plan']"));
    expect(storedIds()).not.toContain("stored-1");
    expect(storedIds()).toHaveLength(1);
  });

  it("still migrates the legacy key", async () => {
    storage.seed(SAVED_KEY_LEGACY, JSON.stringify([storedOuting]));
    const container = await renderPlan();
    expect(savedTitles(container)).toEqual(["Stored plan"]);
    expect(storedIds()).toEqual(["stored-1"]);
  });
});

describe("PlanPage saved outings — storage failures (D4)", () => {
  it.each<StorageFailure>(["access", "read"])(
    "renders the plan route with no saved outings when storage %s fails",
    async (failure) => {
      storage.seed(SAVED_KEY, JSON.stringify([storedOuting]));
      storage.failure = failure;
      const container = await renderPlan();
      expect(routeCrashed(container)).toBe(false);
      expect(container.querySelector(".bl-plan-saved")).not.toBeNull();
      expect(savedTitles(container)).toEqual([]);
    },
  );

  it("saving an outing keeps it in memory without crashing when the write fails", async () => {
    const container = await renderPlan();
    storage.failure = "write";
    click(findButtonByText(container, "Save outing"));
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toHaveLength(1);
    // B04 D5: mount no longer writes anything on its own (only an explicit save/delete
    // does), so a failed save leaves storage exactly as it was — genuinely untouched,
    // not "[]" from an earlier mount-time write.
    expect(storage.peek(SAVED_KEY)).toBeNull();
  });

  it("deleting an outing updates memory without crashing when the write fails", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([storedOuting]));
    const container = await renderPlan();
    storage.failure = "write";
    click(container.querySelector("[aria-label='Delete — Stored plan']"));
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual([]);
    expect(storedIds()).toEqual(["stored-1"]);
  });
});

describe("PlanPage saved outings — a failed initial read never overwrites stored outings", () => {
  it("mount keeps stored outings, a deliberate save persists", async () => {
    const stored = JSON.stringify([storedOuting]);
    storage.seed(SAVED_KEY, stored);
    storage.failure = "read"; // reads fail, writes still work
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(storage.peek(SAVED_KEY)).toBe(stored);

    click(findButtonByText(container, "Save outing"));
    expect(storedIds()).toHaveLength(1);
    expect(storedIds()).not.toContain("stored-1");
  });

  it("does not migrate the legacy key over an unreadable current key", async () => {
    storage.seed(SAVED_KEY_LEGACY, JSON.stringify([storedOuting]));
    storage.failure = "read";
    await renderPlan();
    expect(storage.peek(SAVED_KEY)).toBeNull();
  });
});

// ───────────────────────────── D3: malformed saved-outing structures ─────────────────────────────
//
// A browser-storage FAILURE (D4, above) is different from a structurally MALFORMED
// value that was read successfully (D3, here). Each malformed case below is
// individually proven safe by savedOutings.test.ts; these tests instead prove the full
// route survives, valid outings stay visible, and malformed ones are silently dropped.

function outingWithId(id: string, title = "Valid plan") {
  return { ...storedOuting, id, title };
}

const MALFORMED_SAVED_OUTINGS: Array<[string, unknown]> = [
  ["outing is null", null],
  ["outing is a string", "just a string"],
  ["outing is a number", 42],
  ["stops missing entirely", { ...storedOuting, id: "m", stops: undefined }],
  ["stops is null", { ...storedOuting, id: "m", stops: null }],
  ["stops is a plain object", { ...storedOuting, id: "m", stops: { a: 1 } }],
  ["stops contains a null entry", { ...storedOuting, id: "m", stops: [null, storedOuting.stops[0]] }],
  ["title is an object", { ...storedOuting, id: "m", title: { en: "x" } }],
  ["summary is an object", { ...storedOuting, id: "m", summary: { en: "x" } }],
  ["a stop's name is an object", { ...storedOuting, id: "m", stops: [{ ...storedOuting.stops[0], name: { a: 1 } }] }],
  ["lockedRoles is a string", { ...storedOuting, id: "m", lockedRoles: "main" }],
];

describe("PlanPage saved outings — malformed structures (D3)", () => {
  for (const [label, malformed] of MALFORMED_SAVED_OUTINGS) {
    it(`a saved list containing only "${label}" does not crash /plan`, async () => {
      storage.seed(SAVED_KEY, JSON.stringify([malformed]));
      const container = await renderPlan();
      expect(routeCrashed(container)).toBe(false);
      expect(container.querySelector(".bl-plan-saved")).not.toBeNull();
      expect(savedTitles(container)).toEqual([]);
    });
  }

  it("a valid outing surrounded by malformed ones renders only the valid one, and the route survives", async () => {
    const good = outingWithId("good-1", "Kept plan");
    const list = [
      { ...storedOuting, id: "m1", stops: null },
      good,
      "a string outing",
      null,
      { ...storedOuting, id: "m2", title: {} },
    ];
    storage.seed(SAVED_KEY, JSON.stringify(list));
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual(["Kept plan"]);
  });

  it("several malformed entries mixed with two valid ones preserve both valid outings", async () => {
    const good1 = outingWithId("good-1", "First plan");
    const good2 = outingWithId("good-2", "Second plan");
    const list = [
      42,
      good1,
      { ...storedOuting, id: "m1", stops: "not-an-array" },
      null,
      good2,
      { ...storedOuting, id: "m2", lockedRoles: "main" },
    ];
    storage.seed(SAVED_KEY, JSON.stringify(list));
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual(["First plan", "Second plan"]);
  });

  it("a malformed-only saved list renders the empty state, not a crash", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([null, "x", 1, { stops: null }]));
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(container.querySelector(".bl-plan-saved-empty")).not.toBeNull();
  });

  it("Delete remains reachable for a valid outing stored alongside a malformed one", async () => {
    const good = outingWithId("good-1", "Kept plan");
    storage.seed(SAVED_KEY, JSON.stringify([{ ...storedOuting, id: "m", stops: null }, good]));
    const container = await renderPlan();
    click(container.querySelector("[aria-label='Delete — Kept plan']"));
    expect(savedTitles(container)).toEqual([]);
    // the malformed entry was already dropped by the sanitizer on read, so deleting the
    // only valid outing leaves storage empty, not still holding the malformed one.
    expect(storedIds()).toEqual([]);
  });

  it("the route survives a remount (simulated reload) with the same malformed list still stored", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([{ ...storedOuting, id: "m", stops: null }]));
    const first = await renderPlan();
    expect(routeCrashed(first)).toBe(false);
    cleanupRendered();

    const second = await renderPlan();
    expect(routeCrashed(second)).toBe(false);
    expect(second.querySelector(".bl-plan-saved-empty")).not.toBeNull();
  });
});

describe("PlanPage saved outings — sanitization write-back (current key)", () => {
  it("a malformed current-key entry is hidden from the UI immediately, and dropped from storage by the next save/delete", async () => {
    const good = outingWithId("good-1", "Kept plan");
    const stored = JSON.stringify([{ ...storedOuting, id: "m", stops: null }, good]);
    storage.seed(SAVED_KEY, stored);
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual(["Kept plan"]);

    // B04 D5: mount only reads — it no longer writes the sanitized result back on its
    // own. Automatically rewriting storage just because the page was *viewed* is
    // exactly the kind of unconditional write that caused D5's lost updates, so the
    // malformed entry is left alone in storage until a real user action touches it.
    expect(storage.peek(SAVED_KEY)).toBe(stored);

    // The next explicit action re-reads and sanitizes storage before writing, so the
    // malformed entry disappears as a natural side effect — without a second,
    // independent "cleanup" write path.
    click(container.querySelector("[aria-label='Delete — Kept plan']"));
    expect(storedIds()).toEqual([]);
  });

  it("a failed current-key read leaves the malformed data untouched in storage (PR #240 protection unchanged)", async () => {
    const stored = JSON.stringify([{ ...storedOuting, id: "m", stops: null }, outingWithId("good-1")]);
    storage.seed(SAVED_KEY, stored);
    storage.failure = "read";
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(storage.peek(SAVED_KEY)).toBe(stored);
  });
});

describe("PlanPage saved outings — stale/retired venues are not structurally malformed", () => {
  it("a structurally valid outing referencing an unknown venue stays unavailable, not dropped", async () => {
    const outing = outingWithId("unknown-venue", "Unknown venue plan");
    outing.stops = [{ slug: "ghost-venue-blk-9999", name: "Gone venue" }];
    storage.seed(SAVED_KEY, JSON.stringify([outing]));
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual(["Unknown venue plan"]);
    expect(container.querySelector(".bl-plan-saved-card.is-unavailable")).not.toBeNull();
    const openButton = container.querySelector(".bl-plan-saved-card button[disabled]");
    expect(openButton).not.toBeNull();
  });

  it("a structurally valid outing referencing a retired venue (BLK-0020) stays unavailable, never resurrected", async () => {
    const outing = outingWithId("retired-venue", "Retired venue plan");
    outing.stops = [{ slug: "e-blue-gaming-center-blk-0020", name: "Retired venue" }];
    storage.seed(SAVED_KEY, JSON.stringify([outing]));
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual(["Retired venue plan"]);
    expect(container.querySelector(".bl-plan-saved-card.is-unavailable")).not.toBeNull();
    // still preserved in storage — a stale/retired reference is not malformed and is
    // never auto-mutated.
    expect(storedIds()).toEqual(["retired-venue"]);
  });
});

describe("PlanPage saved outings — legacy key with malformed data (D3)", () => {
  it("a malformed-only legacy list migrates to an empty saved list, not a crash", async () => {
    storage.seed(SAVED_KEY_LEGACY, JSON.stringify([null, "x", { stops: null }]));
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(container.querySelector(".bl-plan-saved-empty")).not.toBeNull();
    expect(JSON.parse(storage.peek(SAVED_KEY)!)).toEqual([]);
  });

  it("a mixed legacy list migrates only its valid outings to the current key", async () => {
    const good = outingWithId("good-1", "Migrated plan");
    storage.seed(
      SAVED_KEY_LEGACY,
      JSON.stringify([{ ...storedOuting, id: "m", stops: null }, good, "a string outing"]),
    );
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual(["Migrated plan"]);
    expect(JSON.parse(storage.peek(SAVED_KEY)!)).toEqual([good]);
  });
});

// ───────────────────────────── D5: cross-tab saved-outing sync ─────────────────────────────
//
// Each `renderPlan()` call below is an independent React root/PlanPage instance sharing
// the same underlying storage double — standing in for a separate browser tab. A tab's
// own save/delete never dispatches a storage event (matching real browsers, where the
// event fires only in *other* documents), so two tabs mounted from the same seed stay
// independently stale from each other exactly the way two real tabs would, until an
// explicit `otherTabWrites`/`otherTabClears` call (or a real cross-tab event) tells one
// of them what the other one did.

describe("PlanPage saved outings — cross-tab UI sync (D5)", () => {
  it("a storage event from another tab adds a saved outing to this tab's list", async () => {
    const container = await renderPlan();
    expect(savedTitles(container)).toEqual([]);

    otherTabWrites([outingWithId("from-b", "From tab B")]);
    expect(savedTitles(container)).toEqual(["From tab B"]);
  });

  it("a storage event from another tab removes an outing from this tab's list", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("a", "Plan A"), outingWithId("b", "Plan B")]));
    const container = await renderPlan();
    expect(savedTitles(container)).toEqual(["Plan A", "Plan B"]);

    otherTabWrites([outingWithId("b", "Plan B")]);
    expect(savedTitles(container)).toEqual(["Plan B"]);
  });

  it("a malformed storage-event payload does not crash the route", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("a", "Plan A")]));
    const container = await renderPlan();

    otherTabWrites([{ ...storedOuting, id: "bad", stops: null }]);
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual([]);
  });

  it("a mixed malformed + valid storage-event payload keeps only the valid entry", async () => {
    const container = await renderPlan();

    otherTabWrites([{ ...storedOuting, id: "bad", title: {} }, outingWithId("good", "Good plan")]);
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual(["Good plan"]);
  });

  it("newValue null (another tab cleared storage) safely becomes the empty state", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("a", "Plan A")]));
    const container = await renderPlan();
    expect(savedTitles(container)).toEqual(["Plan A"]);

    otherTabClears();
    expect(routeCrashed(container)).toBe(false);
    expect(container.querySelector(".bl-plan-saved-empty")).not.toBeNull();
  });
});

describe("PlanPage saved outings — lost-update protection (D5)", () => {
  it("A and B both start empty; A saves, then a still-stale B saves — both survive", async () => {
    const tabA = await renderPlan();
    const tabB = await renderPlan();

    click(findButtonByText(tabA, "Save outing"));
    // B never received a storage event for A's write — it is still stale here, exactly
    // as a real second tab would be.
    click(findButtonByText(tabB, "Save outing"));

    expect(storedIds()).toHaveLength(2);
  });

  it("A saves A2 on top of a pre-existing A1; a stale B (mounted before A2) also saves — A1 and A2 both survive alongside B's save", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("A1", "Plan A1")]));
    const tabA = await renderPlan();
    const tabB = await renderPlan();

    click(findButtonByText(tabA, "Save outing")); // A2
    click(findButtonByText(tabB, "Save outing")); // B's save, from B's still-stale [A1] state

    const ids = storedIds();
    expect(ids).toContain("A1");
    expect(ids).toHaveLength(3);
  });

  it("delete race: A deletes A1 from [A1, A2]; a stale B still saves — A1 is NOT resurrected", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("A1", "Plan A1"), outingWithId("A2", "Plan A2")]));
    const tabA = await renderPlan();
    const tabB = await renderPlan();

    click(tabA.querySelector("[aria-label='Delete — Plan A1']")); // storage is now [A2]
    click(findButtonByText(tabB, "Save outing")); // B is still stale with [A1, A2] in its own state

    const ids = storedIds();
    expect(ids).not.toContain("A1");
    expect(ids).toContain("A2");
    expect(ids).toHaveLength(2); // A2 + B's new save
  });

  it("save/delete race: A saves A2 on top of [A1]; a stale B deletes A1 — A2 remains and A1 is deleted", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("A1", "Plan A1")]));
    const tabA = await renderPlan();
    const tabB = await renderPlan();

    click(findButtonByText(tabA, "Save outing")); // storage is now [A2, A1]
    click(tabB.querySelector("[aria-label='Delete — Plan A1']")); // B deletes A1 from its own stale [A1] view

    const ids = storedIds();
    expect(ids).not.toContain("A1");
    expect(ids).toHaveLength(1); // just A2
  });

  it("a longer chain of cross-tab saves and deletes without notification preserves every intended entry", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("seed-1", "Seed plan")]));
    const tabA = await renderPlan();
    const tabB = await renderPlan(); // both start from the same seeded [seed-1]

    // The save button's own label briefly changes to a "saved" confirmation after a
    // click, so a tab that saves twice can't be found by its resting label alone.
    const clickSave = (container: HTMLElement) =>
      click(findButtonByText(container, "Save outing") ?? findButtonByText(container, "Outing saved."));

    clickSave(tabA); // A re-reads fresh → storage: [A-new, seed-1]
    // B is still stale with only [seed-1] in its own state, but its own delete still
    // re-reads storage fresh first, so it sees A's save too.
    click(tabB.querySelector("[aria-label='Delete — Seed plan']")); // → [A-new]
    clickSave(tabA); // A re-reads fresh again → [A-new-2, A-new]

    const ids = storedIds();
    expect(ids).not.toContain("seed-1");
    expect(ids).toHaveLength(2);
  });
});

describe("PlanPage saved outings — ordering and cap (D5)", () => {
  it("newest-first ordering is preserved across a fresh-read merge", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("A1", "Plan A1")]));
    const container = await renderPlan();
    click(findButtonByText(container, "Save outing"));
    const titles = savedTitles(container);
    expect(titles[titles.length - 1]).toBe("Plan A1");
    expect(titles).toHaveLength(2);
  });

  it("the 20-item cap is still enforced after a merge-aware save", async () => {
    const twenty = Array.from({ length: 20 }, (_, i) => outingWithId(`existing-${i}`, `Existing ${i}`));
    storage.seed(SAVED_KEY, JSON.stringify(twenty));
    const container = await renderPlan();
    expect(savedTitles(container)).toHaveLength(20);

    click(findButtonByText(container, "Save outing"));
    expect(storedIds()).toHaveLength(20);
  });

  it("saving past the cap drops exactly the oldest (last) entry, same as the pre-D5 behavior", async () => {
    const twenty = Array.from({ length: 20 }, (_, i) => outingWithId(`existing-${i}`, `Existing ${i}`));
    storage.seed(SAVED_KEY, JSON.stringify(twenty));
    const container = await renderPlan();

    click(findButtonByText(container, "Save outing"));
    const ids = storedIds();
    expect(ids).not.toContain("existing-19");
    expect(ids).toContain("existing-0");
  });
});

describe("PlanPage saved outings — storage failures around save/delete (D5)", () => {
  it("a fresh read failure before save does not crash and still saves in memory", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("A1", "Plan A1")]));
    const container = await renderPlan();
    storage.failure = "read";
    click(findButtonByText(container, "Save outing"));
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toHaveLength(2);
  });

  it("a fresh read failure before delete does not crash and still deletes in memory", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("A1", "Plan A1")]));
    const container = await renderPlan();
    storage.failure = "read";
    click(container.querySelector("[aria-label='Delete — Plan A1']"));
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual([]);
  });

  it("a write failure during save does not crash and the in-memory list still reflects the save", async () => {
    const container = await renderPlan();
    storage.failure = "write";
    click(findButtonByText(container, "Save outing"));
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toHaveLength(1);
  });

  it("a fresh read failure before save does NOT discard this tab's existing visible entries (not confused with genuinely empty storage)", async () => {
    storage.seed(SAVED_KEY, JSON.stringify([outingWithId("A1", "Plan A1")]));
    const container = await renderPlan();
    expect(savedTitles(container)).toEqual(["Plan A1"]);

    storage.failure = "read";
    click(findButtonByText(container, "Save outing"));
    // falls back to this tab's own in-memory state as the merge base, not an empty list
    expect(savedTitles(container)).toContain("Plan A1");
    expect(savedTitles(container)).toHaveLength(2);
  });
});

describe("PlanPage saved outings — D3 compatibility during save (D5)", () => {
  it("malformed current storage is sanitized before the save merges into it", async () => {
    const good = outingWithId("good-1", "Kept plan");
    storage.seed(SAVED_KEY, JSON.stringify([{ ...storedOuting, id: "bad", stops: null }, good]));
    const container = await renderPlan();
    expect(savedTitles(container)).toEqual(["Kept plan"]);

    click(findButtonByText(container, "Save outing"));
    const ids = storedIds();
    expect(ids).not.toContain("bad");
    expect(ids).toContain("good-1");
    expect(ids).toHaveLength(2);
  });

  it("a stale/retired-venue outing survives a save elsewhere and keeps its unavailable state", async () => {
    const stale = outingWithId("stale-1", "Stale plan");
    stale.stops = [{ slug: "e-blue-gaming-center-blk-0020", name: "Retired venue" }];
    storage.seed(SAVED_KEY, JSON.stringify([stale]));
    const container = await renderPlan();
    expect(container.querySelector(".bl-plan-saved-card.is-unavailable")).not.toBeNull();

    click(findButtonByText(container, "Save outing"));
    expect(routeCrashed(container)).toBe(false);
    expect(storedIds()).toContain("stale-1");
    expect(container.querySelector(".bl-plan-saved-card.is-unavailable")).not.toBeNull();
  });
});

describe("PlanPage saved outings — normal single-tab behavior remains correct (D5)", () => {
  it("save, delete, and reload all still work with no other tab involved", async () => {
    const first = await renderPlan();
    click(findButtonByText(first, "Save outing"));
    expect(storedIds()).toHaveLength(1);
    const [savedId] = storedIds();

    cleanupRendered();
    const second = await renderPlan();
    expect(savedTitles(second)).toHaveLength(1);

    click(second.querySelector(`[aria-label$="— ${savedTitles(second)[0]}"]`));
    expect(storedIds()).toEqual([]);
    expect(savedId).toBeTruthy();
  });

  it("valid legacy migration still works with the new save/delete architecture", async () => {
    storage.seed(SAVED_KEY_LEGACY, JSON.stringify([storedOuting]));
    const container = await renderPlan();
    expect(savedTitles(container)).toEqual(["Stored plan"]);
    expect(storedIds()).toEqual(["stored-1"]);
  });
});
