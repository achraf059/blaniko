// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ThemeProvider, useTheme } from "./useTheme";
import {
  cleanupRendered,
  click,
  installControllableStorage,
  renderIntoDocument,
} from "../test/storageTestUtils";

// Theme persistence must survive storage failures without overwriting an unread
// stored preference (B04 D4 follow-up).

const storage = installControllableStorage();

const THEME_KEY = "blaniko:theme:v1";
const THEME_KEY_LEGACY = "blaniko-theme";

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

function renderTheme() {
  const container = renderIntoDocument(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );
  return {
    theme: () => container.querySelector("button")?.textContent,
    toggle: () => click(container.querySelector("button")),
  };
}

function stubPrefersDark(matches: boolean) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches })));
}

beforeEach(() => {
  storage.reset();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  cleanupRendered();
  vi.unstubAllGlobals();
});

describe("ThemeProvider — normal storage", () => {
  it("restores a stored theme and persists a toggle", () => {
    storage.seed(THEME_KEY, "dark");
    const view = renderTheme();
    expect(view.theme()).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    view.toggle();
    expect(storage.peek(THEME_KEY)).toBe("light");
  });

  it("migrates the legacy key to the current key", () => {
    storage.seed(THEME_KEY_LEGACY, "dark");
    const view = renderTheme();
    expect(view.theme()).toBe("dark");
    expect(storage.peek(THEME_KEY)).toBe("dark");
  });

  it("falls back to the OS preference when nothing is stored", () => {
    stubPrefersDark(true);
    const view = renderTheme();
    expect(view.theme()).toBe("dark");
    expect(storage.peek(THEME_KEY)).toBe("dark");
  });
});

describe("ThemeProvider — a failed read never overwrites the stored preference", () => {
  it("keeps a stored dark theme when the read fails, then persists a deliberate toggle", () => {
    stubPrefersDark(true);
    storage.seed(THEME_KEY, "dark");
    storage.seed(THEME_KEY_LEGACY, "dark");
    storage.failure = "read"; // reads fail, writes still work
    const view = renderTheme();
    expect(view.theme()).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(storage.peek(THEME_KEY)).toBe("dark");

    view.toggle();
    expect(view.theme()).toBe("dark");
    view.toggle();
    expect(storage.peek(THEME_KEY)).toBe("light");
  });

  it("renders and toggles in memory when storage is entirely unavailable", () => {
    storage.failure = "access";
    const view = renderTheme();
    expect(view.theme()).toBe("light");
    view.toggle();
    expect(view.theme()).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
