import Link from "next/link";
import { HomeHeader } from "../../components/home/HomeHeader";
import { venues } from "../../data/mockData";
import { getCurrentLanguage } from "../../i18n/server";
import { getDictionary } from "../../i18n/dictionaries";

export default async function VenueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    from?: string | string[];
    category?: string | string[];
  }>;
}) {
  const language = await getCurrentLanguage();
  const dictionary = getDictionary(language);

  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const from = Array.isArray(resolvedSearchParams.from)
    ? resolvedSearchParams.from[0]
    : resolvedSearchParams.from;
  const categoryFromQuery = Array.isArray(resolvedSearchParams.category)
    ? resolvedSearchParams.category[0]
    : resolvedSearchParams.category;

  const isValidSlug =
    typeof categoryFromQuery === "string" &&
    /^[a-z0-9-]+$/.test(categoryFromQuery);

  const backHref =
    from === "category" && isValidSlug
      ? `/categories/${categoryFromQuery}`
      : "/";
  const backLabel =
    from === "category" && isValidSlug
      ? dictionary.venuePage.backToCategory
      : dictionary.venuePage.backToHome;

  const venue = venues.find((item) => item.slug === slug);

  if (!venue) {
    return (
      <div className="min-h-screen bg-[#ece0cf] text-slate-900">
        <HomeHeader language={language} labels={dictionary.header} />
        <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 md:py-12">
          <section className="rounded-3xl border border-[#d1c2ab] bg-[#fffaf3] p-6 shadow-sm md:p-8">
            <Link
              href={backHref}
              className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-800"
            >
              ← {backLabel}
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              {dictionary.venuePage.notFoundTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {dictionary.venuePage.notFoundDescription}
            </p>
          </section>
        </main>
      </div>
    );
  }

  const shortDescription = venue.shortDescription ?? venue.description;
  const overview =
    venue.overview ??
    dictionary.venuePage.fallbackOverview
      .replace("{name}", venue.name)
      .replace("{category}", venue.category.toLowerCase())
      .replace("{area}", venue.area);
  const vibe = venue.vibe ?? dictionary.venuePage.fallbackVibe;
  const audience = venue.audience ?? dictionary.venuePage.fallbackAudience;
  const priceLevel =
    venue.priceLevel ?? dictionary.venuePage.fallbackPriceLevel;

  return (
    <div className="min-h-screen bg-[#ece0cf] text-slate-900">
      <HomeHeader language={language} labels={dictionary.header} />

      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 md:py-12">
        <section className="relative overflow-hidden rounded-3xl border border-[#d1c2ab] bg-gradient-to-br from-[#fffaf3] via-[#f6ecdf] to-[#f1e3cf] p-6 shadow-sm md:p-8">
          <div className="pointer-events-none absolute -right-14 -top-12 h-44 w-44 rounded-full bg-amber-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-orange-200/25 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <Link
                href={backHref}
                className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-800"
              >
                ← {backLabel}
              </Link>

              <p className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
                {venue.category}
              </p>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl md:leading-[1.1]">
                {venue.name}
              </h1>

              <p className="mt-3 text-sm text-slate-700">
                {dictionary.venuePage.area}:{" "}
                <span className="font-medium">{venue.area}</span>
              </p>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 md:text-base">
                {shortDescription}
              </p>
            </div>

            <div className="rounded-2xl border border-[#d1c2ab] bg-[#fffaf3]/90 p-4">
              <div className="h-28 rounded-xl border border-[#d7c9b6] bg-gradient-to-br from-[#f6e8d3] via-[#f3dfc3] to-[#ecd4b3]" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-800/80">
                {dictionary.venuePage.panelEyebrow}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {dictionary.venuePage.panelSubtitle}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[#d1c2ab] bg-[#fffaf3] p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {dictionary.venuePage.overview}
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-700 md:text-base">
              {overview}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-[#d9cebe] bg-[#f8f2e8] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {dictionary.venuePage.vibe}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">{vibe}</p>
            </div>

            <div className="rounded-2xl border border-[#d9cebe] bg-[#f8f2e8] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {dictionary.venuePage.audience}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {audience}
              </p>
            </div>

            <div className="rounded-2xl border border-[#d9cebe] bg-[#f8f2e8] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {dictionary.venuePage.priceLevel}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {priceLevel}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
