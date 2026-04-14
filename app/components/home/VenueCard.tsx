type VenueCardProps = {
  category: string;
  name: string;
  area: string;
  description: string;
  href?: string;
  isFeatured?: boolean;
  labels?: {
    featured: string;
    viewDetails: string;
  };
};

export function VenueCard({
  category,
  name,
  area,
  description,
  href = "#",
  isFeatured = false,
  labels,
}: VenueCardProps) {
  const featuredLabel = labels?.featured ?? "Featured";
  const viewDetailsLabel = labels?.viewDetails ?? "View details";
  const areaPreview = area.split(",")[0]?.trim() ?? area;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#d1c2ab] bg-[#fffaf3] shadow-[0_8px_22px_-18px_rgba(105,74,26,0.42)] transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_18px_38px_-20px_rgba(120,80,20,0.5)]">
      <div className="relative border-b border-[#e1d3c1] bg-gradient-to-br from-[#f5e4cd] via-[#efd9bc] to-[#e6c8a0] p-4">
        <div className="absolute -right-7 -top-8 h-16 w-16 rounded-full bg-amber-50/65 blur-xl" />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#debb94]/30 to-transparent" />
        <div className="relative flex items-center justify-between gap-3">
          <p className="inline-flex rounded-full border border-amber-200 bg-amber-50/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
            {category}
          </p>
          {isFeatured ? (
            <span className="text-[11px] font-medium uppercase tracking-wide text-amber-800/80">
              {featuredLabel}
            </span>
          ) : null}
        </div>

        <div className="relative mt-3 inline-flex rounded-full border border-[#dccfbe] bg-[#fff9f1]/90 px-2.5 py-1 text-[11px] font-medium text-slate-700">
          {areaPreview}
        </div>
      </div>

      <div className="flex h-full flex-col p-5">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{name}</h3>

        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
          <span aria-hidden="true">📍</span>
          <span>{area}</span>
        </p>

        <p className="mt-3 flex-1 text-sm leading-6 text-slate-700">{description}</p>

        <a
          href={href}
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 transition-colors group-hover:text-amber-800"
        >
          {viewDetailsLabel}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </a>
      </div>
    </article>
  );
}
