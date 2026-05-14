import { Link } from "react-router";
import { VenueImage } from "./VenueImage";
import { type Venue } from "../../data/mockData";
import type { AppLanguage } from "../../i18n/types";
import { getBestForBadges } from "../../utils/venuePersonality";
import "./VenueCard.css";

type VenueCardProps = {
  slug: string;
  category: string;
  name: string;
  area: string;
  description: string;
  imageUrl?: string;
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
    <svg
      viewBox="0 0 24 24"
      className="bl-home-venue-favorite-icon"
      aria-hidden="true"
    >
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

export function VenueCard({
  slug,
  category,
  name,
  area,
  description,
  imageUrl,
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
    <article className="bl-home-venue-card">
      {/* Image — category shown via VenueImage's built-in label */}
      <div className="bl-home-venue-image-wrap">
        <VenueImage src={imageUrl} category={category} alt={name} aspectRatio="4 / 3" />

        {onToggleFavorite ? (
          <button
            type="button"
            className={`bl-home-venue-favorite${isFavorite ? " is-active" : ""}`}
            onClick={() => onToggleFavorite(slug)}
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

        <p className="bl-home-venue-area">{areaPreview}</p>

        <p className="bl-home-venue-description">{description}</p>

        <div className="bl-home-venue-footer">
          {bestForBadges.length > 0 ? (
            <div className="bl-home-venue-bestfor-list">
              {bestForBadges.map((badge, index) => (
                <span
                  key={`${slug}-${badge}-${index}`}
                  className="bl-home-venue-bestfor-chip"
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : (
            <div className="bl-home-venue-bestfor-list" />
          )}

          <Link to={href} className="bl-home-venue-link">
            {labels?.viewDetails ?? "Explore"} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
