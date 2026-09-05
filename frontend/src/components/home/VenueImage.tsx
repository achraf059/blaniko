import { useState } from "react";
import "./VenueImage.css";

/**
 * VenueImage — renders a venue photo, or a branded, intentional placeholder
 * when no photo is available (or the <img> 404s).
 *
 * API is unchanged from the original component. One optional prop is added:
 *   placeholderStyle?: "monogram" | "initial" | "coastline"  (default "monogram")
 *
 * The image resolution / onError fallback behaviour is identical to before, so
 * getVenueImageSrc() keeps working as-is.
 */

type PlaceholderStyle = "monogram" | "initial" | "coastline";

type VenueImageProps = {
  src?: string;
  alt?: string;
  category?: string;
  categorySlug?: string;
  /** Name is used to derive the serif-initial placeholder. Optional. */
  name?: string;
  label?: string;
  aspectRatio?: string;
  placeholderStyle?: PlaceholderStyle;
  className?: string;
};

/** First word of the category, lowercased — used to pick the placeholder tint. */
function categoryTintKey(value?: string) {
  if (!value) return "default";
  return value.trim().toLowerCase().replace(/\s+/g, "-").split("-")[0];
}

export function VenueImage({
  src,
  alt,
  category,
  categorySlug,
  name,
  label,
  aspectRatio = "4 / 3",
  placeholderStyle = "monogram",
  className,
}: VenueImageProps) {
  // Track which src failed rather than a boolean — resets automatically when src changes.
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);
  const imgFailed = failedSrc === src;

  const tint = categoryTintKey(categorySlug ?? category);
  const initial = (name ?? category ?? "B").trim().charAt(0).toUpperCase();
  const imageAlt = alt ?? label ?? name ?? "";
  const showImg = src && !imgFailed;

  const wrapperClassName = ["bl-venue-image", className].filter(Boolean).join(" ");

  return (
    <div
      className={wrapperClassName}
      data-cat={tint}
      style={{ "--bl-venue-ar": aspectRatio } as React.CSSProperties}
    >
      {showImg ? (
        <img
          src={src}
          alt={imageAlt}
          className="bl-venue-image-media"
          loading="lazy"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div
          className={`bl-venue-ph ph-${placeholderStyle}`}
          role="img"
          aria-label={`${imageAlt || "Venue"} — photo coming soon`}
        >
          <span className="bl-venue-ph-tint" aria-hidden="true" />

          {placeholderStyle === "initial" ? (
            <span className="bl-venue-ph-initial" aria-hidden="true">
              {initial}
            </span>
          ) : placeholderStyle === "coastline" ? (
            <span className="bl-venue-ph-waves" aria-hidden="true" />
          ) : (
            <span className="bl-venue-ph-mark" aria-hidden="true">
              <svg
                className="bl-venue-ph-coast"
                width="30"
                height="9"
                viewBox="0 0 26 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              >
                <path d="M1 5c2-3 4-3 6 0s4 3 6 0 4-3 6 0 4 3 6 0" />
              </svg>
              <span className="bl-venue-ph-word">Blaniko</span>
            </span>
          )}

          <span className="bl-venue-ph-note" aria-hidden="true">
            Photo coming soon
          </span>
        </div>
      )}

      {label ? <span className="bl-venue-image-label">{label}</span> : null}
    </div>
  );
}

export type { VenueImageProps };
