import { useCallback, useEffect, useState } from "react";
import { venues as baseVenues, type Venue } from "../data/mockData";

const STORAGE_KEY = "blaniko:admin-venues:v1";
const ADMIN_VENUES_EVENT = "blaniko:admin-venues-updated";

type AdminVenuesEventDetail = {
  venues: Venue[];
};

function sanitizeVenue(raw: unknown): Venue | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const input = raw as Partial<Venue>;

  if (
    typeof input.slug !== "string" ||
    typeof input.name !== "string" ||
    typeof input.category !== "string" ||
    typeof input.categorySlug !== "string" ||
    typeof input.area !== "string" ||
    typeof input.description !== "string"
  ) {
    return null;
  }

  const sanitized: Venue = {
    slug: input.slug.trim(),
    name: input.name.trim(),
    category: input.category.trim(),
    categorySlug: input.categorySlug.trim(),
    area: input.area.trim(),
    description: input.description.trim(),
  };

  if (typeof input.shortDescription === "string") {
    sanitized.shortDescription = input.shortDescription.trim();
  }

  if (typeof input.overview === "string") {
    sanitized.overview = input.overview.trim();
  }

  if (typeof input.vibe === "string") {
    sanitized.vibe = input.vibe.trim();
  }

  if (typeof input.audience === "string") {
    sanitized.audience = input.audience.trim();
  }

  if (typeof input.priceLevel === "string") {
    sanitized.priceLevel = input.priceLevel;
  }

  if (
    input.coordinates &&
    typeof input.coordinates.lat === "number" &&
    typeof input.coordinates.lng === "number"
  ) {
    sanitized.coordinates = {
      lat: input.coordinates.lat,
      lng: input.coordinates.lng,
    };
  }

  if (!sanitized.slug || !sanitized.name || !sanitized.categorySlug) {
    return null;
  }

  return sanitized;
}

function sanitizeVenueList(raw: unknown): Venue[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const output: Venue[] = [];

  for (const item of raw) {
    const venue = sanitizeVenue(item);
    if (venue) {
      output.push(venue);
    }
  }

  return output;
}

function readStoredVenues(): Venue[] {
  if (typeof window === "undefined") {
    return baseVenues;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return baseVenues;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeVenueList(parsed);
  } catch {
    return baseVenues;
  }
}

function writeStoredVenues(nextVenues: Venue[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextVenues));
  window.dispatchEvent(
    new CustomEvent<AdminVenuesEventDetail>(ADMIN_VENUES_EVENT, {
      detail: { venues: nextVenues },
    })
  );
}

export function useAdminVenues() {
  const [managedVenues, setManagedVenues] = useState<Venue[]>(() => readStoredVenues());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        setManagedVenues(baseVenues);
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as unknown;
        setManagedVenues(sanitizeVenueList(parsed));
      } catch {
        setManagedVenues(baseVenues);
      }
    };

    const handleAdminVenuesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<AdminVenuesEventDetail>;
      setManagedVenues(sanitizeVenueList(customEvent.detail?.venues ?? []));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(ADMIN_VENUES_EVENT, handleAdminVenuesUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(ADMIN_VENUES_EVENT, handleAdminVenuesUpdated);
    };
  }, []);

  const upsertVenue = useCallback((incomingVenue: Venue) => {
    setManagedVenues((previous) => {
      const existingIndex = previous.findIndex((venue) => venue.slug === incomingVenue.slug);
      const next = [...previous];

      if (existingIndex >= 0) {
        next[existingIndex] = incomingVenue;
      } else {
        next.unshift(incomingVenue);
      }

      writeStoredVenues(next);
      return next;
    });
  }, []);

  const removeVenue = useCallback((slug: string) => {
    setManagedVenues((previous) => {
      const next = previous.filter((venue) => venue.slug !== slug);
      writeStoredVenues(next);
      return next;
    });
  }, []);

  const resetVenues = useCallback(() => {
    setManagedVenues(baseVenues);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(
        new CustomEvent<AdminVenuesEventDetail>(ADMIN_VENUES_EVENT, {
          detail: { venues: baseVenues },
        })
      );
    }
  }, []);

  return {
    managedVenues,
    upsertVenue,
    removeVenue,
    resetVenues,
  };
}
