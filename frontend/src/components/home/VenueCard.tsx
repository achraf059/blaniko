import { Link } from "react-router";
import { CollectionPicker } from "../collections/CollectionPicker";
import { CompareToggle } from "../compare/CompareToggle";
import { type Venue } from "../../data/mockData";
import { getBestForBadges, getVenuePersonalitySignals } from "../../utils/venuePersonality";

type VenueCardProps = {
  slug: string;
  category: string;
  name: string;
  area: string;
  description: string;
  personality?: Pick<
    Venue,
    "bestForTags" | "timeOfDay" | "energyLevel" | "socialLevel" | "spaceType"
  >;
  whyChips?: string[];
  href?: string;
  isFeatured?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (slug: string) => void;
  showCollectionPicker?: boolean;
  showCompareToggle?: boolean;
  labels?: {
    featured: string;
    viewDetails: string;
    saveFavorite: string;
    removeFavorite: string;
  };
};

export function VenueCard({
  slug,
  category,
  name,
  area,
  description,
  personality,
  whyChips,
  href = "#",
  isFeatured = false,
  isFavorite = false,
  onToggleFavorite,
  showCollectionPicker = false,
  showCompareToggle = false,
  labels,
}: VenueCardProps) {
  const featuredLabel = labels?.featured ?? "Featured";
  const viewDetailsLabel = labels?.viewDetails ?? "View details";
  const saveFavoriteLabel = labels?.saveFavorite ?? "Save";
  const removeFavoriteLabel = labels?.removeFavorite ?? "Saved";
  const areaPreview = area.split(",")[0]?.trim() ?? area;
  const bestForBadges = getBestForBadges({ description, ...personality });
  const personalitySignals = getVenuePersonalitySignals({ description, ...personality }).slice(0, 3);

  return (
    <article className="bl-home-venue-card">
      <div className="bl-home-venue-top">
        <div className="bl-home-venue-top-content">
          <p className="bl-home-venue-category">{category}</p>
          {isFeatured ? <span className="bl-home-venue-featured">{featuredLabel}</span> : null}
        </div>

        <div className="bl-home-venue-area-preview">{areaPreview}</div>
      </div>

      {onToggleFavorite ? (
        <button
          type="button"
          className={`bl-home-venue-favorite${isFavorite ? " is-active" : ""}`}
          onClick={() => onToggleFavorite(slug)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? removeFavoriteLabel : saveFavoriteLabel}
          title={isFavorite ? removeFavoriteLabel : saveFavoriteLabel}
        >
          <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
          <span>{isFavorite ? removeFavoriteLabel : saveFavoriteLabel}</span>
        </button>
      ) : null}

      {showCollectionPicker ? <CollectionPicker venueSlug={slug} compact /> : null}

      {showCompareToggle ? <CompareToggle venueSlug={slug} compact /> : null}

      <div className="bl-home-venue-body">
        <h3 className="bl-home-venue-name">{name}</h3>

        <p className="bl-home-venue-area">
          <span aria-hidden="true">📍</span>
          <span>{area}</span>
        </p>

        <p className="bl-home-venue-description">{description}</p>

        {bestForBadges.length > 0 ? (
          <div className="bl-home-venue-bestfor-list">
            {bestForBadges.map((badge, index) => (
              <span key={`${slug}-${badge}-${index}`} className="bl-home-venue-bestfor-chip">
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        {personalitySignals.length > 0 ? (
          <p className="bl-home-venue-signals">{personalitySignals.join(" • ")}</p>
        ) : null}

        {whyChips && whyChips.length > 0 ? (
          <div className="bl-home-venue-why">
            <p className="bl-home-venue-why-title">Why this place?</p>
            <div className="bl-home-venue-why-list">
              {whyChips.map((chip) => (
                <span key={chip} className="bl-home-venue-why-chip">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <Link to={href} className="bl-home-venue-link">
          {viewDetailsLabel}
          <span>→</span>
        </Link>
      </div>
    </article>
  );
}
