export type AppLanguage = "en" | "fr";

export const DEFAULT_LANGUAGE: AppLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "blaniko.language";

export function isAppLanguage(value: string | null): value is AppLanguage {
  return value === "en" || value === "fr";
}
