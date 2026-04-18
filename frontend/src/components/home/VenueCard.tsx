import { Link } from "react-router";

type VenueCardProps = {
  slug: string;
  category: string;
  name: string;
  area: string;
  description: string;
  href?: string;
  isFeatured?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (slug: string) => void;
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
  href = "#",
  isFeatured = false,
  isFavorite = false,
  onToggleFavorite,
  labels,
}: VenueCardProps) {
  const featuredLabel = labels?.featured ?? "Featured";
  const viewDetailsLabel = labels?.viewDetails ?? "View details";
  const saveFavoriteLabel = labels?.saveFavorite ?? "Save";
  const removeFavoriteLabel = labels?.removeFavorite ?? "Saved";
  const areaPreview = area.split(",")[0]?.trim() ?? area;

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

      <div className="bl-home-venue-body">
        <h3 className="bl-home-venue-name">{name}</h3>

        <p className="bl-home-venue-area">
          <span aria-hidden="true">📍</span>
          <span>{area}</span>
        </p>

        <p className="bl-home-venue-description">{description}</p>

        <Link to={href} className="bl-home-venue-link">
          {viewDetailsLabel}
          <span>→</span>
        </Link>
      </div>
    </article>
  );
}
