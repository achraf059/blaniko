import { Link } from "react-router";

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
    <article className="bl-home-venue-card">
      <div className="bl-home-venue-top">
        <div className="bl-home-venue-top-content">
          <p className="bl-home-venue-category">{category}</p>
          {isFeatured ? <span className="bl-home-venue-featured">{featuredLabel}</span> : null}
        </div>

        <div className="bl-home-venue-area-preview">{areaPreview}</div>
      </div>

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
