import "./VenueImage.css";

type VenueImageProps = {
  src?: string;
  alt?: string;
  category?: string;
  categorySlug?: string;
  label?: string;
  aspectRatio?: string;
  className?: string;
};

const CATEGORY_GRADIENT_CLASS: Record<string, string> = {
  water: "is-water",
  culture: "is-culture",
  outdoor: "is-outdoor",
  gaming: "is-gaming",
  workshop: "is-workshop",
  wellness: "is-wellness",
  sports: "is-sports",
};

function normalizeCategoryKey(categoryValue?: string) {
  if (!categoryValue) {
    return "default";
  }

  const normalized = categoryValue.trim().toLowerCase().replace(/\s+/g, "-");

  if (CATEGORY_GRADIENT_CLASS[normalized]) {
    return normalized;
  }

  const fallbackKey = Object.keys(CATEGORY_GRADIENT_CLASS).find((key) =>
    normalized.includes(key),
  );

  return fallbackKey ?? "default";
}

export function VenueImage({
  src,
  alt,
  category,
  categorySlug,
  label,
  aspectRatio = "16 / 10",
  className,
}: VenueImageProps) {
  const categoryKey = normalizeCategoryKey(categorySlug ?? category);
  const gradientClass = CATEGORY_GRADIENT_CLASS[categoryKey] ?? "is-default";
  const resolvedLabel = label ?? category;
  const imageAlt = alt ?? label ?? "";

  const wrapperClassName = ["bl-venue-image", className].filter(Boolean).join(" ");

  return (
    <div
      className={wrapperClassName}
      style={{ "--bl-venue-image-aspect-ratio": aspectRatio } as React.CSSProperties}
    >
      {src ? (
        <img src={src} alt={imageAlt} className="bl-venue-image-media" loading="lazy" />
      ) : (
        <div
          className={`bl-venue-image-placeholder ${gradientClass}`}
          aria-label={imageAlt || resolvedLabel || "Venue placeholder"}
          role="img"
        >
          <span className="bl-venue-image-placeholder-stripes" aria-hidden="true" />
        </div>
      )}

      {resolvedLabel ? (
        <span className="bl-venue-image-label">{resolvedLabel}</span>
      ) : null}
    </div>
  );
}

export type { VenueImageProps };
