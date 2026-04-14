type HomeHeroProps = {
  texts: {
    badge: string;
    title: string;
    subtitle: string;
    discoverVenues: string;
    browseCategories: string;
    popularAreas: string;
  };
};

export function HomeHero({ texts }: HomeHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#d8cab6] bg-gradient-to-br from-[#fbf7ef] via-[#f6ede1] to-[#f2e7d8] p-7 shadow-sm sm:p-8 md:p-10 lg:p-12">
      <div className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-orange-200/25 blur-3xl" />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            {texts.badge}
          </p>

          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-5xl md:leading-[1.08]">
            {texts.title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
            {texts.subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#venues"
              className="inline-flex h-11 items-center justify-center rounded-full bg-amber-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            >
              {texts.discoverVenues}
            </a>
            <a
              href="#categories"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#d8cab6] bg-[#fbf8f2] px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-amber-300 hover:text-amber-700"
            >
              {texts.browseCategories}
            </a>
          </div>

          <p className="mt-6 text-sm text-slate-600">{texts.popularAreas}</p>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-[#d4c4ad] bg-[#fcf8f0] p-5 shadow-[0_14px_34px_-20px_rgba(110,76,24,0.38)]">
            <div className="relative h-56 overflow-hidden rounded-2xl border border-[#d8cab6] bg-gradient-to-br from-[#f4e4cd] via-[#efd9bd] to-[#e6c9a2]">
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#dcb488]/55 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full border border-amber-200/80 bg-[#fff8ef]/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                Casablanca
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#dccfbe] bg-[#fffaf3]/90 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  Maarif
                </span>
                <span className="rounded-full border border-[#dccfbe] bg-[#fffaf3]/90 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  Ain Diab
                </span>
                <span className="rounded-full border border-[#dccfbe] bg-[#fffaf3]/90 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  Old Medina
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#dccfbe] bg-[#fffaf3] px-3 py-2.5 text-xs text-slate-700">
                <p className="font-semibold text-slate-800">Curated city moments</p>
                <p className="mt-1 text-slate-600">Coffee, walks, social plans</p>
              </div>
              <div className="rounded-xl border border-[#dccfbe] bg-[#fffaf3] px-3 py-2.5 text-xs text-slate-700">
                <p className="font-semibold text-slate-800">Lifestyle discovery</p>
                <p className="mt-1 text-slate-600">Places people actually browse</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
