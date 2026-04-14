import Link from "next/link";
import { LanguageSwitcher } from "../LanguageSwitcher";
import type { AppLanguage } from "../../i18n/types";

type HomeHeaderProps = {
  language: AppLanguage;
  labels: {
    home: string;
    categories: string;
    venues: string;
    about: string;
    exploreNow: string;
    languageEn: string;
    languageFr: string;
  };
};

export function HomeHeader({ language, labels }: HomeHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#d8cab6] bg-[#f8f1e6]/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-900">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500/80" />
          <span className="text-lg font-semibold tracking-tight">Blaniko</span>
        </Link>

        <ul className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <li>
            <Link href="/" className="transition-colors hover:text-slate-900">
              {labels.home}
            </Link>
          </li>
          <li>
            <Link
              href="/#categories"
              className="transition-colors hover:text-slate-900"
            >
              {labels.categories}
            </Link>
          </li>
          <li>
            <Link
              href="/#venues"
              className="transition-colors hover:text-slate-900"
            >
              {labels.venues}
            </Link>
          </li>
          <li>
            <Link href="/" className="transition-colors hover:text-slate-900">
              {labels.about}
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher
            language={language}
            labelEn={labels.languageEn}
            labelFr={labels.languageFr}
          />

          <Link
            href="/#venues"
            className="hidden rounded-full border border-[#d8cab6] bg-[#fffaf2] px-5 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-[#f2e7d5] sm:inline-flex"
          >
            {labels.exploreNow}
          </Link>
        </div>
      </nav>
    </header>
  );
}
