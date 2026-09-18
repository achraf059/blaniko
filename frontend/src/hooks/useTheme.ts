import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { tryReadStorageItem, writeStorageItem } from "../utils/safeStorage";

export type Theme = "light" | "dark";
const STORAGE_KEY = "blaniko:theme:v1";
const STORAGE_KEY_LEGACY = "blaniko-theme";

type InitialTheme = {
  theme: Theme;
  // True when the stored preference could not be read, so it is unknown.
  readFailed: boolean;
};

function getInitialTheme(): InitialTheme {
  const stored = tryReadStorageItem(STORAGE_KEY);
  // localStorage unavailable (SSR, sandboxed iframe, etc.)
  if (!stored.ok) return { theme: "light", readFailed: true };
  if (stored.value === "dark" || stored.value === "light") {
    return { theme: stored.value, readFailed: false };
  }
  // Migrate from old key for existing users.
  const legacy = tryReadStorageItem(STORAGE_KEY_LEGACY);
  if (!legacy.ok) return { theme: "light", readFailed: true };
  if (legacy.value === "dark" || legacy.value === "light") {
    return { theme: legacy.value, readFailed: false };
  }
  // No saved preference — respect OS dark-mode setting.
  try {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return { theme: "dark", readFailed: false };
    }
  } catch {
    // matchMedia unavailable
  }
  return { theme: "light", readFailed: false };
}

// ─── Context ────────────────────────────────────────────────────────────────

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────
//
// Mount this ONCE at the app root (main.tsx). It is the single source of
// truth for theme state. Every call to useTheme() reads from this context,
// so toggling the theme in any component (Nav, GlobalNav, etc.) instantly
// updates all consumers — no isolated useState copies fighting each other.

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [initial] = useState(getInitialTheme);
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const themeChangedRef = useRef(false);

  // useLayoutEffect fires synchronously before the browser paints, so
  // data-theme is always set before any child component renders its visuals.
  useLayoutEffect(() => {
    const root = document.documentElement;

    // 1. Set the CSS-selector anchor used by all [data-theme="dark"] rules.
    root.setAttribute("data-theme", theme);

    // 2. Tell the browser's native color-scheme stack (scrollbars, inputs, etc.).
    root.style.colorScheme = theme;

    // 3. Belt-and-suspenders: set an inline background-color on <html> so the
    //    page base color is always correct even if a CSS rule with unexpected
    //    source order wins the [data-theme="dark"] body selector race in dev mode.
    //    Inline styles have specificity (1,0,0,0) — nothing in a stylesheet can
    //    override them. Cleared on light mode so CSS gradients take full control.
    if (theme === "dark") {
      root.style.backgroundColor = "#0f0920";

      // 4. Evict any light-palette inline CSS variables that App.jsx (or any
      //    other effect) may have written via style.setProperty().  Inline
      //    custom properties override *all* stylesheet rules, so if App.jsx's
      //    palette effect already ran with "--bg: #FAF7FC" etc., those values
      //    would shadow [data-theme="dark"] { --bg: #0f0920 } entirely.
      //    Removing them here (useLayoutEffect = synchronous, before paint)
      //    lets the CSS dark-mode token block take back control immediately.
      [
        "--bg", "--bg-warm", "--surface", "--mist", "--heather",
        "--plum", "--plum-deep", "--ink", "--ink-soft",
        "--line", "--line-soft", "--accent",
      ].forEach((v) => root.style.removeProperty(v));
    } else {
      root.style.backgroundColor = "";
    }

    if (theme !== initial.theme) {
      themeChangedRef.current = true;
    }

    // After a failed read the stored preference is unknown: don't overwrite it with
    // the fallback just because the provider mounted — persist once the user toggles.
    if (!initial.readFailed || themeChangedRef.current) {
      writeStorageItem(STORAGE_KEY, theme);
    }
  }, [initial, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

// ─── Hook ───────────────────────────────────────────────────────────────────
//
// Use this anywhere a component needs the current theme or the toggle.
// Throws if called outside <ThemeProvider> so misconfiguration fails fast.

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
