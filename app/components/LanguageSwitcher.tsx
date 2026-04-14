"use client";

import { useRouter } from "next/navigation";
import { LANGUAGE_COOKIE_KEY, type AppLanguage } from "../i18n/types";

type LanguageSwitcherProps = {
  language: AppLanguage;
  labelEn: string;
  labelFr: string;
};

export function LanguageSwitcher({
  language,
  labelEn,
  labelFr,
}: LanguageSwitcherProps) {
  const router = useRouter();

  const setLanguage = (nextLanguage: AppLanguage) => {
    if (nextLanguage === language) {
      return;
    }

    document.cookie = `${LANGUAGE_COOKIE_KEY}=${nextLanguage}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem(LANGUAGE_COOKIE_KEY, nextLanguage);
    router.refresh();
  };

  return (
    <div className="inline-flex rounded-full border border-[#d9cebe] bg-[#fbf8f2] p-1">
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          language === "en"
            ? "bg-amber-100 text-amber-800"
            : "text-slate-600 hover:text-slate-800"
        }`}
      >
        {labelEn}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("fr")}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          language === "fr"
            ? "bg-amber-100 text-amber-800"
            : "text-slate-600 hover:text-slate-800"
        }`}
      >
        {labelFr}
      </button>
    </div>
  );
}
