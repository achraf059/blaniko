import { useEffect, useMemo, useState } from "react";
import { venues as mockVenues, type Venue } from "../data/mockData";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// ─── Module-level cache ────────────────────────────────────────────────────────
//
// Shared across every hook instance for the lifetime of the SPA session.
// Cleared on hard page reload (module re-evaluation); not persisted to
// localStorage to avoid stale-data complexity.
//
// venueCache — populated on first successful fetch; null until then.
// inFlightPromise — a single shared Promise while a request is in flight.
//   All instances that mount during the same request subscribe to this
//   Promise instead of starting their own, so the API is called exactly
//   once per session no matter how many pages use useVenues().
//   Set back to null after resolve or reject so a retry is possible.

let venueCache: Venue[] | null = null;
let inFlightPromise: Promise<Venue[]> | null = null;

export function useVenues() {
  // Initialise directly from cache so components that mount after the first
  // successful fetch skip the loading flash entirely (isLoading: false from
  // the very first render, no useEffect needed).
  const [venues, setVenues] = useState<Venue[]>(() => venueCache ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => venueCache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Fast path: cache was populated (by this or another instance).
    // Guard against the race where the cache filled between render and this
    // effect firing — state may still show [] / isLoading: true in that case.
    if (venueCache !== null) {
      setVenues(venueCache);
      setIsLoading(false);
      return;
    }

    // Start a new fetch only when no request is already in flight.
    if (!inFlightPromise) {
      inFlightPromise = fetch(`${API_URL}/api/venues`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<Venue[]>;
        })
        .then((data) => {
          venueCache = data;       // populate cache for all future mounts
          inFlightPromise = null;  // allow a retry if needed later
          return data;
        })
        .catch((err: unknown) => {
          inFlightPromise = null;  // allow retry on next mount
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("useVenues: API fetch failed:", message);
          if (!import.meta.env.PROD) {
            // Development: fall back to mock data and treat as success so
            // the UI stays usable without a running backend.
            venueCache = mockVenues;
            return mockVenues as Venue[];
          }
          // Production: propagate so subscribers can enter the error state.
          throw new Error(message);
        });
    }

    // Subscribe to the in-flight (or just-started) promise.
    inFlightPromise
      .then((data) => {
        if (cancelled) return;
        setVenues(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setVenues([]);
        setError("api_error");
        setIsLoading(false);
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
