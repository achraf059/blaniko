import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getDictionary } from "./dictionaries";
import { I18nContext, type I18nContextValue } from "./context";
import { tryReadStorageItem, writeStorageItem } from "../utils/safeStorage";
import {
  DEFAULT_LANGUAGE,
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY_LEGACY,
  type AppLanguage,
} from "./types";

type InitialLanguage = {
  language: AppLanguage;
  // True when the stored preference could not be read, so it is unknown.
  readFailed: boolean;
};

function getInitialLanguage(): InitialLanguage {
  if (typeof window === "undefined") {
    return { language: DEFAULT_LANGUAGE, readFailed: false };
  }

  // Read new key first; fall back to legacy key for existing users.
  const current = tryReadStorageItem(LANGUAGE_STORAGE_KEY);
  const legacy =
    current.ok && current.value === null
      ? tryReadStorageItem(LANGUAGE_STORAGE_KEY_LEGACY)
      : null;
  const saved = current.ok && current.value !== null
    ? current.value
    : legacy?.ok
      ? legacy.value
      : null;

  return {
    language: isAppLanguage(saved) ? saved : DEFAULT_LANGUAGE,
    readFailed: !current.ok || legacy?.ok === false,
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(getInitialLanguage);
  const [language, setLanguage] = useState<AppLanguage>(initial.language);
  const languageChangedRef = useRef(false);

  useEffect(() => {
    if (language !== initial.language) {
      languageChangedRef.current = true;
    }

    // After a failed read the stored preference is unknown: don't overwrite it with
    // the fallback just because the provider mounted — persist once the user switches.
    if (!initial.readFailed || languageChangedRef.current) {
      writeStorageItem(LANGUAGE_STORAGE_KEY, language);
    }
    document.documentElement.lang = language;
  }, [initial, language]);

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
