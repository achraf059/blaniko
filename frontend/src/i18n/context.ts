import { createContext } from "react";
import type { Dictionary } from "./dictionaries";
import type { AppLanguage } from "./types";

export type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  dictionary: Dictionary;
};

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);
