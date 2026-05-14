import { useEffect, useMemo, useState } from "react";
import { venues as mockVenues, type Venue } from "../data/mockData";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/venues`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Venue[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setVenues(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("useVenues: failed to load venues from API:", message);
        // Fall back to mock data so the UI is never empty during development
        setVenues(mockVenues);
        setIsLoading(false);
        setError("Could not reach venues API — showing mock data.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const venuesBySlug = useMemo(() => {
    return venues.reduce<Record<string, Venue>>((acc, venue) => {
      acc[venue.slug] = venue;
      return acc;
    }, {});
  }, [venues]);

  const getVenueBySlug = (slug: string): Venue | undefined => {
    return venuesBySlug[slug];
  };

  return {
    venues,
    venuesBySlug,
    getVenueBySlug,
    isLoading,
    error,
  };
}
