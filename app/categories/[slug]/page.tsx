import Link from "next/link";
import { HomeHeader } from "../../components/home/HomeHeader";
import { VenueCard } from "../../components/home/VenueCard";
import { categories, venues } from "../../data/mockData";
import { getCurrentLanguage } from "../../i18n/server";
import { getDictionary } from "../../i18n/dictionaries";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const language = await getCurrentLanguage();
  const dictionary = getDictionary(language);

  const { slug } = await params;

  const selectedCategory = categories.find((category) => category.slug === slug);

  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-[#f1e9dc] text-slate-900">
        <HomeHeader language={language} labels={dictionary.header} />
        <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 md:py-12">
          <section className="rounded-3xl border border-[#d8cab6] bg-[#fbf7ef] p-6 shadow-sm md:p-8">
            <Link
              href="/"
              className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-800"
            >
              ← {dictionary.categoryPage.backHome}
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              {dictionary.categoryPage.notFoundTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {dictionary.categoryPage.notFoundDescription}
            </p>
          </section>
        </main>
      </div>
    );
  }

  const categoryVenues = venues.filter((venue) => venue.categorySlug === slug);

  return (
    <div className="min-h-screen bg-[#f1e9dc] text-slate-900">
      <HomeHeader language={language} labels={dictionary.header} />

      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 md:py-12">
        <section className="relative overflow-hidden rounded-3xl border border-[#d8cab6] bg-gradient-to-br from-[#fbf7ef] via-[#f6ecdf] to-[#f1e3cf] p-6 shadow-sm md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-amber-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-36 w-36 rounded-full bg-orange-200/25 blur-3xl" />

          <div className="relative">
          <Link
            href="/"
            className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-800"
          >
            ← {dictionary.categoryPage.backHome}
          </Link>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700/80">
            Casablanca category
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {selectedCategory.name}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 md:text-base">
            {dictionary.categoryDescriptions[selectedCategory.slug] ??
              selectedCategory.description}
          </p>

          <div className="mt-5 inline-flex rounded-full border border-[#d8cab6] bg-[#fbf8f2]/90 px-3 py-1.5 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{categoryVenues.length}</span>
            <span className="ml-2">
              {categoryVenues.length === 1
                ? dictionary.categoryPage.result
                : dictionary.categoryPage.results}
            </span>
          </div>
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
            {categoryVenues.map((venue) => (
              <VenueCard
                key={venue.slug}
                category={venue.category}
                name={venue.name}
                area={venue.area}
                description={venue.description}
                href={`/venues/${venue.slug}?from=category&category=${slug}`}
                labels={dictionary.venueCard}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
