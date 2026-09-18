// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { I18nProvider } from "./I18nProvider";
import { useI18n } from "./useI18n";
import { LANGUAGE_STORAGE_KEY, LANGUAGE_STORAGE_KEY_LEGACY } from "./types";
import {
  cleanupRendered,
  click,
  installControllableStorage,
  renderIntoDocument,
} from "../test/storageTestUtils";

// Regression coverage for B04 D2: I18nProvider sits above every route
// ErrorBoundary, so a browser-storage failure inside it used to blank the whole
// app. Persistence is optional — the provider must always render.

const storage = installControllableStorage();

function LanguageProbe() {
  const { language, setLanguage } = useI18n();
  return (
    <div>
      <p data-testid="language">{language}</p>
      <button type="button" onClick={() => setLanguage("fr")}>fr</button>
      <button type="button" onClick={() => setLanguage("en")}>en</button>
    </div>
  );
}

function renderProvider() {
  return renderIntoDocument(
    <I18nProvider>
      <LanguageProbe />
    </I18nProvider>,
  );
}

const shownLanguage = (container: HTMLElement) =>
  container.querySelector("[data-testid='language']")?.textContent;
const button = (container: HTMLElement, label: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent === label);

beforeEach(() => {
  storage.reset();
  document.documentElement.lang = "";
});

afterEach(() => {
  cleanupRendered();
});

describe("I18nProvider — normal storage", () => {
  it("restores stored English", () => {
    storage.seed(LANGUAGE_STORAGE_KEY, "en");
    const container = renderProvider();
    expect(shownLanguage(container)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("restores stored French", () => {
    storage.seed(LANGUAGE_STORAGE_KEY, "fr");
    const container = renderProvider();
    expect(shownLanguage(container)).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("falls back to English for an unknown stored language", () => {
    storage.seed(LANGUAGE_STORAGE_KEY, "de");
    const container = renderProvider();
    expect(shownLanguage(container)).toBe("en");
  });

  it("falls back to the legacy key when the current key is absent", () => {
    storage.seed(LANGUAGE_STORAGE_KEY_LEGACY, "fr");
    const container = renderProvider();
    expect(shownLanguage(container)).toBe("fr");
    expect(storage.peek(LANGUAGE_STORAGE_KEY)).toBe("fr");
  });

  it("persists a language switch", () => {
    const container = renderProvider();
    click(button(container, "fr"));
    expect(storage.peek(LANGUAGE_STORAGE_KEY)).toBe("fr");
  });
});

describe("I18nProvider — storage failures (D2)", () => {
  it("still renders children with the default language when window.localStorage access throws", () => {
    storage.failure = "access";
    const container = renderProvider();
    expect(shownLanguage(container)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("still renders children with the default language when getItem throws", () => {
    storage.seed(LANGUAGE_STORAGE_KEY, "fr");
    storage.failure = "read";
    const container = renderProvider();
    expect(shownLanguage(container)).toBe("en");
  });

  it("still renders when the initial persistence write throws", () => {
    storage.failure = "write";
    const container = renderProvider();
    expect(shownLanguage(container)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches language in memory and updates <html lang> when the write throws", () => {
    const container = renderProvider();
    storage.failure = "write";
    click(button(container, "fr"));
    expect(container.isConnected).toBe(true);
    expect(shownLanguage(container)).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
    click(button(container, "en"));
    expect(shownLanguage(container)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches language in memory when storage is entirely unavailable", () => {
    storage.failure = "access";
    const container = renderProvider();
    click(button(container, "fr"));
    expect(shownLanguage(container)).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
  });
});

describe("I18nProvider — a failed read never overwrites the stored preference", () => {
  it("keeps a stored French preference when the read fails, then persists a deliberate switch", () => {
    storage.seed(LANGUAGE_STORAGE_KEY, "fr");
    storage.failure = "read"; // reads fail, writes still work
    const container = renderProvider();
    expect(shownLanguage(container)).toBe("en");
    expect(storage.peek(LANGUAGE_STORAGE_KEY)).toBe("fr");

    click(button(container, "fr"));
    click(button(container, "en"));
    expect(storage.peek(LANGUAGE_STORAGE_KEY)).toBe("en");
  });
});
