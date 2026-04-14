export type AppLanguage = "en" | "fr";

export const DEFAULT_LANGUAGE: AppLanguage = "en";
export const LANGUAGE_COOKIE_KEY = "blaniko_lang";

export function isAppLanguage(value: string): value is AppLanguage {
  return value === "en" || value === "fr";
}
