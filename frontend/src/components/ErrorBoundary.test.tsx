// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { ErrorBoundary } from "./ErrorBoundary";
import { I18nProvider } from "../i18n/I18nProvider";
import { useI18n } from "../i18n/useI18n";
import { LANGUAGE_STORAGE_KEY } from "../i18n/types";
import {
  cleanupRendered,
  click,
  findButtonByText,
  installControllableStorage,
  renderIntoDocument,
} from "../test/storageTestUtils";

// Regression coverage for B04 D6: ErrorBoundary's recovery fallback was
// hardcoded in English regardless of the app's current language. It now
// reads the current language from I18nContext (see ErrorFallback inside
// ErrorBoundary.tsx) instead, so the same recovery UI is correctly localized.
//
// ErrorBoundary itself stays a class component (required for
// getDerivedStateFromError/componentDidCatch); only the small fallback
// function component it renders reads translation context, and it reads
// I18nContext directly (not the throwing useI18n()) so the fallback can never
// itself fail to render for lack of a provider.

const storage = installControllableStorage();

// A render condition controlled from outside React state and outside the
// caught subtree, so a test can flip it and then click "Try again" to prove
// the boundary's reset genuinely re-renders (and can recover), rather than
// just toggling fallback UI cosmetically. Reset every test.
const throwState = { shouldThrow: true };

function Thrower() {
  if (throwState.shouldThrow) {
    throw new Error("Simulated render crash");
  }
  return <div data-testid="recovered">Recovered content</div>;
}

// Self-contained: starts safe, then crashes itself on click. Used only for
// the "language already set before the crash occurs" test, where the render
// must succeed once (so the app can be in a known language) before the error
// happens.
function CrashOnDemand() {
  const [crashed, setCrashed] = useState(false);
  if (crashed) {
    throw new Error("Simulated render crash");
  }
  return (
    <button type="button" onClick={() => setCrashed(true)}>
      trigger-crash
    </button>
  );
}

function LanguageToggle() {
  const { setLanguage } = useI18n();
  return (
    <div>
      <button type="button" onClick={() => setLanguage("fr")}>set-fr</button>
      <button type="button" onClick={() => setLanguage("en")}>set-en</button>
    </div>
  );
}

function renderBoundary() {
  return renderIntoDocument(
    <I18nProvider>
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    </I18nProvider>,
  );
}

const fallback = (container: HTMLElement) => container.querySelector(".bl-error-boundary");
const eyebrow = (container: HTMLElement) =>
  container.querySelector(".bl-error-boundary-eyebrow")?.textContent;
const title = (container: HTMLElement) =>
  container.querySelector(".bl-error-boundary-title")?.textContent;
const desc = (container: HTMLElement) =>
  container.querySelector(".bl-error-boundary-desc")?.textContent;
const retryBtn = (container: HTMLElement) =>
  container.querySelector(".bl-error-boundary-btn-primary") as HTMLButtonElement | null;
const actionLabels = (container: HTMLElement) =>
  [...container.querySelectorAll(".bl-error-boundary-actions button, .bl-error-boundary-actions a")].map(
    (el) => el.textContent,
  );

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  storage.reset();
  throwState.shouldThrow = true;
  // Every test in this file intentionally throws from a render, which React
  // (in dev builds) reports via console.error in addition to this
  // ErrorBoundary's own componentDidCatch logging. That noise is expected
  // here, so it's suppressed for the duration of this file only, and
  // restored after every test — a genuinely unexpected console.error outside
  // this file, or in a differently-scoped test, is never hidden by this.
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanupRendered();
  consoleErrorSpy.mockRestore();
});

describe("ErrorBoundary — English fallback (default language)", () => {
  it("renders the English recovery heading, body, and button/link labels", () => {
    const container = renderBoundary();
    expect(fallback(container)).not.toBeNull();
    expect(eyebrow(container)).toBe("Something went wrong");
    expect(title(container)).toBe("This page ran into a problem");
    expect(desc(container)).toContain("Your data");
    expect(actionLabels(container)).toEqual(["Try again", "Reload page", "Go to home"]);
  });

  it("Try again resets the boundary and genuinely re-renders recovered children once the error clears", () => {
    const container = renderBoundary();
    expect(fallback(container)).not.toBeNull();
    throwState.shouldThrow = false;
    click(retryBtn(container));
    expect(fallback(container)).toBeNull();
    expect(container.querySelector("[data-testid='recovered']")).not.toBeNull();
  });

  it("Reload page calls window.location.reload exactly once", () => {
    const originalLocation = window.location;
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });
    const container = renderBoundary();
    click(findButtonByText(container, "Reload page"));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("preserves role=\"alert\", heading, and home-link semantics", () => {
    const container = renderBoundary();
    expect(container.querySelector("[role='alert']")).not.toBeNull();
    expect(container.querySelector("h1")?.textContent).toBe("This page ran into a problem");
    expect(container.querySelector("a[href='/']")).not.toBeNull();
  });
});

describe("ErrorBoundary — French fallback (B04 D6 regression)", () => {
  it("renders every recovery string in French, with no English leaking through", () => {
    storage.seed(LANGUAGE_STORAGE_KEY, "fr");
    const container = renderBoundary();
    expect(eyebrow(container)).toBe("Une erreur est survenue");
    expect(title(container)).toBe("Cette page a rencontré un problème");
    expect(desc(container)).toContain("Vos données sont en sécurité");
    expect(actionLabels(container)).toEqual([
      "Réessayer",
      "Recharger la page",
      "Retour à l'accueil",
    ]);

    const fullText = fallback(container)?.textContent ?? "";
    expect(fullText).not.toContain("Something went wrong");
    expect(fullText).not.toContain("This page ran into a problem");
    expect(fullText).not.toContain("Try again");
    expect(fullText).not.toContain("Reload page");
    expect(fullText).not.toContain("Go to home");
  });

  it("Try again still resets and recovers correctly in French", () => {
    storage.seed(LANGUAGE_STORAGE_KEY, "fr");
    const container = renderBoundary();
    throwState.shouldThrow = false;
    click(retryBtn(container));
    expect(fallback(container)).toBeNull();
    expect(container.querySelector("[data-testid='recovered']")).not.toBeNull();
  });

  it("Reload page still works when the fallback is in French", () => {
    storage.seed(LANGUAGE_STORAGE_KEY, "fr");
    const originalLocation = window.location;
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });
    const container = renderBoundary();
    click(findButtonByText(container, "Recharger la page"));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });
});

describe("ErrorBoundary — language already selected before the crash occurs (B04 D6)", () => {
  it("an app switched to French before a crash shows the French fallback, not English", () => {
    const container = renderIntoDocument(
      <I18nProvider>
        <LanguageToggle />
        <ErrorBoundary>
          <CrashOnDemand />
        </ErrorBoundary>
      </I18nProvider>,
    );

    click(findButtonByText(container, "set-fr"));
    click(findButtonByText(container, "trigger-crash"));

    expect(fallback(container)).not.toBeNull();
    expect(eyebrow(container)).toBe("Une erreur est survenue");
    expect(title(container)).toBe("Cette page a rencontré un problème");
  });

  it("stays in English when no language switch occurred before the crash", () => {
    const container = renderIntoDocument(
      <I18nProvider>
        <LanguageToggle />
        <ErrorBoundary>
          <CrashOnDemand />
        </ErrorBoundary>
      </I18nProvider>,
    );

    click(findButtonByText(container, "trigger-crash"));

    expect(fallback(container)).not.toBeNull();
    expect(eyebrow(container)).toBe("Something went wrong");
  });
});

describe("ErrorBoundary — language-storage failure stays safe (D2 compatibility)", () => {
  it("still renders the (default-language) fallback when reading the stored language throws", () => {
    storage.seed(LANGUAGE_STORAGE_KEY, "fr");
    storage.failure = "read";
    const container = renderBoundary();
    // D2: a failed read is treated as unknown and falls back to the default
    // language (English) — not a crash, and not a second, unrelated failure
    // stacked on top of the one the boundary is already recovering from.
    expect(fallback(container)).not.toBeNull();
    expect(eyebrow(container)).toBe("Something went wrong");
  });

  it("still renders the fallback when localStorage access itself throws", () => {
    storage.failure = "access";
    const container = renderBoundary();
    expect(fallback(container)).not.toBeNull();
    expect(eyebrow(container)).toBe("Something went wrong");
  });

  it("Try again still works when language storage is unavailable", () => {
    storage.failure = "access";
    const container = renderBoundary();
    throwState.shouldThrow = false;
    click(retryBtn(container));
    expect(fallback(container)).toBeNull();
    expect(container.querySelector("[data-testid='recovered']")).not.toBeNull();
  });
});

describe("ErrorBoundary — route-level composition (mirrors App.tsx's withRouteBoundary)", () => {
  it("a route child crashing under a real router + I18nProvider stack shows the French fallback", () => {
    storage.seed(LANGUAGE_STORAGE_KEY, "fr");
    const container = renderIntoDocument(
      <I18nProvider>
        <MemoryRouter initialEntries={["/some-route"]}>
          <ErrorBoundary>
            <Thrower />
          </ErrorBoundary>
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(fallback(container)).not.toBeNull();
    expect(eyebrow(container)).toBe("Une erreur est survenue");
    expect(actionLabels(container)).toEqual([
      "Réessayer",
      "Recharger la page",
      "Retour à l'accueil",
    ]);
  });
});
