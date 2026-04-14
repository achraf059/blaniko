import { cookies } from "next/headers";
import { DEFAULT_LANGUAGE, isAppLanguage, LANGUAGE_COOKIE_KEY, type AppLanguage } from "./types";

export async function getCurrentLanguage(): Promise<AppLanguage> {
  const cookieStore = await cookies();
  const languageFromCookie = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;

  if (languageFromCookie && isAppLanguage(languageFromCookie)) {
    return languageFromCookie;
  }

  return DEFAULT_LANGUAGE;
}
