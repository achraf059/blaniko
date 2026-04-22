import Link from "next/link";
import { HomeHeader } from "./components/home/HomeHeader";
import { HomeHero } from "./components/home/HomeHero";
import { VenueCard } from "./components/home/VenueCard";
import { categories, featuredVenueSlugs, venues } from "./data/mockData";
import { getCurrentLanguage } from "./i18n/server";
import { getDictionary } from "./i18n/dictionaries";

export default async function Home() {
  const language = await getCurrentLanguage();
  const dictionary = getDictionary(language);

  const featuredVenues = featuredVenueSlugs
    .map((slug) => venues.find((venue) => venue.slug === slug))
    .filter((venue): venue is (typeof venues)[number] => venue !== undefined);

  return (
    <div className="min-h-screen bg-[#ece0cf] text-slate-900">
      <HomeHeader language={language} labels={dictionary.header} />

      <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-6 md:py-14">
        <HomeHero texts={dictionary.hero} />

        <section id="categories" className="mt-10 md:mt-12">
          <div className="mb-6 flex items-end justify-between gap-4 md:mb-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700/80">
                {dictionary.home.categoriesEyebrow}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                {dictionary.home.categoriesTitle}
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-600">
                {dictionary.home.categoriesSubtitle}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-[#d1c2ab] bg-[#fffaf3] p-4 shadow-[0_8px_22px_-18px_rgba(105,74,26,0.42)] transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_18px_38px_-20px_rgba(120,80,20,0.5)] sm:p-5"
              >
                <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-amber-100/50 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-slate-900">
                      {category.name}
                    </h3>
                    <span className="text-stone-400 transition-all group-hover:translate-x-0.5 group-hover:text-amber-700">
                      →
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {dictionary.categoryDescriptions[category.slug] ??
                      category.description}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-700/90">
                    {dictionary.home.categoriesAction}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="venues" className="mt-10 md:mt-12">
          <div className="mb-6 flex items-center justify-between md:mb-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700/80">
                {dictionary.home.featuredEyebrow}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                {dictionary.home.featuredTitle}
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-600">
                {dictionary.home.featuredSubtitle}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {featuredVenues.map((venue) => (
              <VenueCard
                key={venue.slug}
                category={venue.category}
                name={venue.name}
                area={venue.area}
                description={venue.description}
                href={`/venues/${venue.slug}?from=home`}
                isFeatured
                labels={dictionary.venueCard}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-10 border-t border-[#d1c2ab] bg-[#ece0cf] md:mt-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Blaniko</p>
          <p>{dictionary.home.footerText}</p>
        </div>
      </footer>
    </div>
  );
}
