import { useCallback, useEffect, useMemo, useState } from "react";
import type { Venue } from "../data/mockData";

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

// ─── Shared loader ──────────────────────────────────────────────────────────────
//
// Single source of truth for fetching venues. Resolves with the real API
// response and only the real API response — a failed request rejects and is
// NEVER silently substituted with mock/demo venues, in any environment. This
// enforces Blaniko's data policy: an empty, error-flagged UI is correct;
// fictional venues are not.
//
// Cache/de-dup contract:
//   - a populated cache resolves immediately (no network);
//   - one in-flight Promise is shared by all callers during a request;
//   - a successful response fills the cache for the rest of the session;
//   - a rejection clears the in-flight Promise and leaves the cache null,
//     so a later call (e.g. from retry()) starts a fresh real request.
export function loadVenues(): Promise<Venue[]> {
  if (venueCache !== null) return Promise.resolve(venueCache);

  if (!inFlightPromise) {
    inFlightPromise = fetch(`${API_URL}/api/venues`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Venue[]>;
      })
      .then((data) => {
        venueCache = data;       // populate cache for all future callers
        inFlightPromise = null;  // allow a retry if needed later
        return data;
      })
      .catch((err: unknown) => {
        inFlightPromise = null;  // allow retry on next mount
        venueCache = null;       // never cache a failure; force a real re-fetch
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("useVenues: API fetch failed:", message);
        // Propagate so subscribers enter the error state. No mock fallback.
        throw new Error(message);
      });
  }

  return inFlightPromise;
}

export function useVenues() {
  // Initialise directly from cache so components that mount after the first
  // successful fetch skip the loading flash entirely (isLoading: false from
  // the very first render, no useEffect needed).
  const [venues, setVenues] = useState<Venue[]>(() => venueCache ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => venueCache === null);
  const [error, setError] = useState<string | null>(null);
  // Increment to force a re-run of the fetch effect (used by retry).
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    // Clear the module-level cache so the effect re-fetches unconditionally.
    venueCache = null;
    inFlightPromise = null;
    setError(null);
    setIsLoading(true);
    setVenues([]);
    setRetryCount((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Subscribe to the shared loader. loadVenues() resolves from cache when
    // available (deferred via a resolved Promise, so setState is never called
    // synchronously in the effect body) and otherwise shares/starts a single
    // real request. A rejection means the API failed: enter the error state
    // with no venues — mock data is never substituted.
    loadVenues()
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
  }, [retryCount]);

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
    retry,
  };
}
