import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Venue } from "../../data/mockData";
import { VenueImage } from "../home/VenueImage";
import { getVenueImageSrc } from "../../utils/venueImage";
import { useI18n } from "../../i18n/useI18n";
import "./LeafletMap.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type MappedVenue = Venue & {
  coordinates: { lat: number; lng: number };
};

export type LeafletMapProps = {
  venues: MappedVenue[];
  activeSlug: string | null;
  onSelectVenue: (slug: string) => void;
  buildVenueHref: (slug: string) => string;
  viewDetailsLabel: string;
};

// ─── Static icons — teardrop (active) and dot (inactive) ─────────────────────

const PIN_INACTIVE = L.divIcon({
  className: "",
  html: '<div class="blm-pin"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -8],
});

const PIN_ACTIVE = L.divIcon({
  className: "",
  html: '<div class="blm-pin-active"><span class="blm-head"></span><span class="blm-tail"></span></div>',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

// ─── Map behaviour sub-component ─────────────────────────────────────────────

type MapBehaviorProps = {
  venues: MappedVenue[];
  activeSlug: string | null;
};

function MapBehavior({ venues, activeSlug }: MapBehaviorProps) {
  const map = useMap();
  const lastVenueKeyRef = useRef("");
  const lastActiveRef = useRef<string | null>(null);

  // Fit bounds when the filtered venue set changes
  useEffect(() => {
    if (venues.length === 0) return;
    const venueKey = venues.map((v) => v.slug).join(",");
    if (venueKey === lastVenueKeyRef.current) return;
    lastVenueKeyRef.current = venueKey;

    if (venues.length === 1) {
      map.setView(
        [venues[0].coordinates.lat, venues[0].coordinates.lng],
        15,
        { animate: true },
      );
    } else {
      const bounds = L.latLngBounds(
        venues.map((v) => [v.coordinates.lat, v.coordinates.lng]),
      );
      map.fitBounds(bounds, { padding: [50, 50], animate: true, maxZoom: 15 });
    }
  }, [venues, map]);

  // Pan to active marker when selection changes
  useEffect(() => {
    if (!activeSlug || activeSlug === lastActiveRef.current) return;
    lastActiveRef.current = activeSlug;
    const venue = venues.find((v) => v.slug === activeSlug);
    if (!venue) return;
    map.panTo([venue.coordinates.lat, venue.coordinates.lng], { animate: true });
  }, [activeSlug, venues, map]);

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

const CASABLANCA_CENTER: [number, number] = [33.5731, -7.5898];

export function LeafletMap({
  venues,
  activeSlug,
  onSelectVenue,
  buildVenueHref,
  viewDetailsLabel,
}: LeafletMapProps) {
  const { dictionary } = useI18n();

  return (
    <MapContainer
      center={CASABLANCA_CENTER}
      zoom={13}
      className="blm-map"
      scrollWheelZoom={false}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapBehavior venues={venues} activeSlug={activeSlug} />

      {venues.map((venue) => {
        const isActive = activeSlug === venue.slug;
        const categoryLabel =
          dictionary.categoryNames[venue.categorySlug] ?? venue.category;
        const imageSrc = getVenueImageSrc(venue);
        const primaryArea = venue.area.split(",")[0].trim();

        return (
          <Marker
            key={venue.slug}
            position={[venue.coordinates.lat, venue.coordinates.lng]}
            icon={isActive ? PIN_ACTIVE : PIN_INACTIVE}
            zIndexOffset={isActive ? 1000 : 0}
            eventHandlers={{ click: () => onSelectVenue(venue.slug) }}
          >
            <Popup className="blm-popup" closeButton>
              <div className="blm-pop-media">
                <VenueImage
                  src={imageSrc}
                  alt={venue.name}
                  categorySlug={venue.categorySlug}
                  category={venue.category}
                  name={venue.name}
                  aspectRatio="auto"
                />
                <span className="blm-pop-scrim" aria-hidden="true" />
                <span className="blm-pop-cat">{categoryLabel}</span>
              </div>
              <div className="blm-pop-body">
                <h4 className="blm-pop-name">{venue.name}</h4>
                <p className="blm-pop-area">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.4" />
                  </svg>
                  {primaryArea}
                </p>
                <a href={buildVenueHref(venue.slug)} className="blm-pop-link">
                  {viewDetailsLabel} →
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
