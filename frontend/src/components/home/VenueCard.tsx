import { Link } from "react-router";
import { VenueImage } from "./VenueImage";
import { type Venue } from "../../data/mockData";
import type { AppLanguage } from "../../i18n/types";
import { getBestForBadges } from "../../utils/venuePersonality";
import "./VenueCard.css";

/**
 * VenueCard — redesigned, premium "structured" card.
 *
 * Image area (fixed 4:3) carries the category chip, favourite heart and an
 * optional price pill; the white body carries the name, area, description and a
 * footer of best-for chips + an Explore affordance.
 *
 * The props API is unchanged except for two optional, non-breaking additions:
 *   priceLevel?:       string  — shows the "$$" pill on the image
 *   placeholderStyle?: "monogram" | "initial" | "coastline"
 */

type VenueCardProps = {
  slug: string;
  category: string;
  name: string;
  area: string;
  description: string;
  imageUrl?: string;
  priceLevel?: string;
  placeholderStyle?: "monogram" | "initial" | "coastline";
  personality?: Pick<
    Venue,
    "bestForTags" | "timeOfDay" | "energyLevel" | "socialLevel" | "spaceType"
  >;
  href?: string;
  isFeatured?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (slug: string) => void;
  language?: AppLanguage;
  labels?: {
    featured: string;
    viewDetails: string;
    saveFavorite: string;
    removeFavorite: string;
    whyThisPlace: string;
  };
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="bl-home-venue-favorite-icon" aria-hidden="true">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="bl-home-venue-pin" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function VenueCard({
  slug,
  category,
  name,
  area,
  description,
  imageUrl,
  priceLevel,
  placeholderStyle = "monogram",
  personality,
  href = "#",
  isFavorite = false,
  onToggleFavorite,
  language = "en",
  labels,
}: VenueCardProps) {
  const saveFavoriteLabel = labels?.saveFavorite ?? "Save";
  const removeFavoriteLabel = labels?.removeFavorite ?? "Saved";
  const areaPreview = area.split(",")[0]?.trim() ?? area;
  const bestForBadges = getBestForBadges({ description, ...personality }, 2, language);

  return (
    <Link to={href} className="bl-home-venue-card">
      <div className="bl-home-venue-image-wrap">
        <VenueImage
          src={imageUrl}
          category={category}
          name={name}
          alt={name}
          aspectRatio="4 / 3"
          placeholderStyle={placeholderStyle}
        />

        <span className="bl-home-venue-cat">{category}</span>

        {priceLevel ? <span className="bl-home-venue-price">{priceLevel}</span> : null}

        {onToggleFavorite ? (
          <button
            type="button"
            className={`bl-home-venue-favorite${isFavorite ? " is-active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(slug);
            }}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? removeFavoriteLabel : saveFavoriteLabel}
            title={isFavorite ? removeFavoriteLabel : saveFavoriteLabel}
          >
            <HeartIcon filled={isFavorite} />
          </button>
        ) : null}
      </div>

      <div className="bl-home-venue-body">
        <h3 className="bl-home-venue-name">{name}</h3>

        <p className="bl-home-venue-area">
          <PinIcon /> {areaPreview}
        </p>

        <p className="bl-home-venue-description">{description}</p>

        <div className="bl-home-venue-footer">
          <div className="bl-home-venue-bestfor-list">
            {bestForBadges.map((badge, index) => (
              <span key={`${slug}-${badge}-${index}`} className="bl-home-venue-bestfor-chip">
                {badge}
              </span>
            ))}
          </div>

          <span className="bl-home-venue-link">
            {labels?.viewDetails ?? "Explore"} <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Lightweight placeholder shown while venue data is loading. */
export function VenueCardSkeleton() {
  return (
    <div className="bl-venue-card-skeleton" aria-hidden="true">
      <div className="bl-venue-card-skeleton-image">
        <div className="bl-skeleton-line bl-skeleton-line--image" />
      </div>
      <div className="bl-venue-card-skeleton-body">
        <div className="bl-skeleton-line bl-skeleton-line--cat" />
        <div className="bl-skeleton-line bl-skeleton-line--name" />
        <div className="bl-skeleton-line bl-skeleton-line--area" />
        <div className="bl-skeleton-line bl-skeleton-line--desc1" />
        <div className="bl-skeleton-line bl-skeleton-line--desc2" />
      </div>
    </div>
  );
}
