// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { CompareToggle } from "./CompareToggle";
import { I18nProvider } from "../../i18n/I18nProvider";
import {
  cleanupRendered,
  click,
  installControllableStorage,
  renderIntoDocument,
} from "../../test/storageTestUtils";

// Regression coverage for B04 D1: the feedback text CompareToggle shows must always
// describe the operation useCompare() actually reports, in both English and French.
// (useCompare.test.tsx covers the underlying result correctness; this file covers the
// component's message selection and the exact EN/FR strings.)

const STORAGE_KEY = "blaniko:compare:v1";
const LANGUAGE_KEY = "blaniko:language:v1";
const storage = installControllableStorage();

function mount(slug: string) {
  return renderIntoDocument(
    <MemoryRouter>
      <I18nProvider>
        <CompareToggle venueSlug={slug} />
      </I18nProvider>
    </MemoryRouter>,
  );
}

const feedback = (container: HTMLElement) =>
  container.querySelector(".bl-compare-toggle-feedback")?.textContent ?? null;
const toggleButton = (container: HTMLElement) => container.querySelector("button")!;

beforeEach(() => {
  storage.reset();
});

afterEach(() => {
  cleanupRendered();
});

describe("CompareToggle — English feedback", () => {
  it("shows the added message when a venue is added", () => {
    const container = mount("a");
    click(toggleButton(container));
    expect(feedback(container)).toBe("Added to compare.");
  });

  it("shows the removed message when an already-compared venue is toggled off", () => {
    storage.seed(STORAGE_KEY, '["a"]');
    const container = mount("a");
    click(toggleButton(container));
    expect(feedback(container)).toBe("Removed from compare.");
  });

  it("shows the limit message only when a 4th venue is rejected", () => {
    storage.seed(STORAGE_KEY, '["a","b","c"]');
    const container = mount("d");
    click(toggleButton(container));
    expect(feedback(container)).toBe("Compare is limited to 3 venues.");
  });

  it("the exact D1 regression: removing after a rejected add shows removed, not limit", () => {
    storage.seed(STORAGE_KEY, '["a","b","c"]');
    const rejected = mount("d");
    click(toggleButton(rejected)); // rejected: "Compare is limited to 3 venues."

    const removeB = mount("b");
    click(toggleButton(removeB));
    expect(feedback(removeB)).toBe("Removed from compare.");
    expect(JSON.parse(storage.peek(STORAGE_KEY)!)).toEqual(["a", "c"]);
  });
});

describe("CompareToggle — French feedback", () => {
  beforeEach(() => {
    storage.seed(LANGUAGE_KEY, "fr");
  });

  it("shows the added message when a venue is added", () => {
    const container = mount("a");
    click(toggleButton(container));
    expect(feedback(container)).toBe("Ajouté à la comparaison.");
  });

  it("shows the removed message when an already-compared venue is toggled off", () => {
    storage.seed(STORAGE_KEY, '["a"]');
    const container = mount("a");
    click(toggleButton(container));
    expect(feedback(container)).toBe("Retiré de la comparaison.");
  });

  it("shows the limit message only when a 4th venue is rejected", () => {
    storage.seed(STORAGE_KEY, '["a","b","c"]');
    const container = mount("d");
    click(toggleButton(container));
    expect(feedback(container)).toBe("La comparaison est limitée à 3 lieux.");
  });

  it("the exact D1 regression in French: removing after a rejected add shows the removed message", () => {
    storage.seed(STORAGE_KEY, '["a","b","c"]');
    const rejected = mount("d");
    click(toggleButton(rejected));

    const removeB = mount("b");
    click(toggleButton(removeB));
    expect(feedback(removeB)).toBe("Retiré de la comparaison.");
  });
});
