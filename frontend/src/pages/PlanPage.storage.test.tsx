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
// (Malformed saved-outing structures are a separate defect and are not covered here.)

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
