import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDictionary } from "./dictionaries";
import { I18nContext, type I18nContextValue } from "./context";
import {
  DEFAULT_LANGUAGE,
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY_LEGACY,
  type AppLanguage,
} from "./types";

function getInitialLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  // Read new key first; fall back to legacy key for existing users.
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    ?? window.localStorage.getItem(LANGUAGE_STORAGE_KEY_LEGACY);
  return isAppLanguage(saved) ? saved : DEFAULT_LANGUAGE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      dictionary: getDictionary(language),
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
