// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
    expect(storage.peek(SAVED_KEY)).toBe("[]");
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
  it("a successful read replaces a malformed current-key entry with only the sanitized outings", async () => {
    const good = outingWithId("good-1", "Kept plan");
    storage.seed(SAVED_KEY, JSON.stringify([{ ...storedOuting, id: "m", stops: null }, good]));
    const container = await renderPlan();
    expect(routeCrashed(container)).toBe(false);
    expect(savedTitles(container)).toEqual(["Kept plan"]);
    // the malformed entry is gone from storage itself, not just hidden in the UI —
    // acceptable per PR #240 because the read succeeded and only a provably malformed
    // entry was removed; the valid outing's own data is untouched.
    expect(storedIds()).toEqual(["good-1"]);
    const persisted = JSON.parse(storage.peek(SAVED_KEY)!);
    expect(persisted).toEqual([good]);
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
