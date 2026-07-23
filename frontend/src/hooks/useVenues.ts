import { useCallback, useEffect, useMemo, useState } from "react";
import { venues as mockVenues, type Venue } from "../data/mockData";

const API_URL = (
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:3001" : "")
).replace(/\/+$/, "");
const VENUE_REQUEST_TIMEOUT_MS = 10_000;

export type VenueLoadError = "offline" | "server" | "timeout";

class VenueRequestError extends Error {
  kind: VenueLoadError;

  constructor(kind: VenueLoadError, message: string) {
    super(message);
    this.name = "VenueRequestError";
    this.kind = kind;
  }
}

async function fetchVenues(): Promise<Venue[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    VENUE_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${API_URL}/api/venues`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new VenueRequestError(
        "server",
        `Venue API returned HTTP ${response.status}`,
      );
    }

    return (await response.json()) as Venue[];
  } catch (error: unknown) {
    if (error instanceof VenueRequestError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new VenueRequestError(
        "timeout",
        `Venue API did not respond within ${VENUE_REQUEST_TIMEOUT_MS}ms`,
      );
    }

    const isOffline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    throw new VenueRequestError(
      isOffline ? "offline" : "server",
      error instanceof Error ? error.message : "Venue API request failed",
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

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
  const [error, setError] = useState<VenueLoadError | null>(null);
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

    // Fast path: cache was already populated before or during this render.
    // The lazy useState initializers handle the common case (cache filled before
    // render). For the narrow race where cache filled between render and this
    // effect, defer the state update via a resolved Promise so we never call
    // setState synchronously inside an effect body.
    if (venueCache !== null) {
      const snapshot = venueCache;
      Promise.resolve(snapshot).then((data) => {
        if (!cancelled) {
          setVenues(data);
          setIsLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    // Start a new fetch only when no request is already in flight.
    if (!inFlightPromise) {
      inFlightPromise = fetchVenues()
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
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setVenues([]);
        setError(
          requestError instanceof VenueRequestError
            ? requestError.kind
            : "server",
        );
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
