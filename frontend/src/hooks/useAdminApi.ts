/**
 * useAdminApi
 *
 * Manages admin venue operations via the backend admin API.
 * All writes go through the backend, which validates the PIN server-side
 * before writing to Supabase. The service role key is never exposed to the browser.
 *
 * The PIN is held in a module-level variable for the current page session only.
 * It is never written to sessionStorage or localStorage.
 * Refreshing the page clears it and requires re-authentication.
 */

import { useCallback, useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

// Module-level PIN holder — lives only in JS memory for the current page session.
// Cleared automatically on page refresh. Never written to any storage.
let _adminPin = "";

export function setAdminPin(pin: string): void {
  _adminPin = pin;
}

export function clearAdminPin(): void {
  _adminPin = "";
}

/** Returns true if an in-memory PIN is currently held (used to restore auth state on SPA navigation). */
export function hasAdminPin(): boolean {
  return _adminPin !== "";
}

// Raw Supabase row shape returned by GET /api/admin/venues
export type AdminVenueRow = {
  id: string;
  external_id: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string | null;
  neighborhood: string | null;
  region: string | null;
  address: string | null;
  google_maps_link: string | null;
  phone: string | null;
  short_description: string | null;
  image_url: string | null;
  is_active: boolean;
  price_level: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  instagram: string | null;
  overview: string | null;
  vibe: string | null;
  audience: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

// Fields accepted by PATCH /api/admin/venues/:externalId (camelCase)
export type AdminVenuePatch = {
  name?: string;
  category?: string;
  subcategory?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  googleMapsLink?: string | null;
  phone?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  priceLevel?: string | null;
  lat?: number | null;
  lng?: number | null;
  isActive?: boolean;
  website?: string | null;
  instagram?: string | null;
  overview?: string | null;
  vibe?: string | null;
  audience?: string | null;
};

function getPin(): string {
  return _adminPin;
}

export function useAdminApi() {
  const [rows, setRows] = useState<AdminVenueRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchVenues = useCallback(async (): Promise<true | false | "auth_failed"> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/venues`, {
        headers: { "x-admin-pin": getPin() },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 401) {
          clearAdminPin();
          setLoadError("Incorrect PIN. Reload the page and try again.");
          setIsLoading(false);
          return "auth_failed";
        }
        setLoadError(`API error ${res.status}: ${body.error ?? "unknown"}`);
        setIsLoading(false);
        return false;
      }
      const data = (await res.json()) as AdminVenueRow[];
      setRows(data);
      setIsLoading(false);
      return true;
    } catch {
      setLoadError("Cannot reach the admin API. Make sure the backend is running.");
      setIsLoading(false);
      return false;
    }
  }, []);

  const patchVenue = useCallback(
    async (
      externalId: string,
      fields: AdminVenuePatch,
    ): Promise<{ ok: true; row: AdminVenueRow } | { ok: false; message: string }> => {
      try {
        const res = await fetch(`${API_URL}/api/admin/venues/${externalId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-pin": getPin(),
          },
          body: JSON.stringify(fields),
        });

        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          venue?: AdminVenueRow;
          error?: string;
        };

        if (!res.ok || !body.success) {
          if (res.status === 401) {
            clearAdminPin();
            return { ok: false, message: "Incorrect PIN — reload and log in again." };
          }
          if (res.status === 404) return { ok: false, message: `Venue ${externalId} not found in Supabase.` };
          return { ok: false, message: body.error ?? `Server error ${res.status}` };
        }

        const updated = body.venue!;
        // Update local rows in-place so the list refreshes without a full reload
        setRows((prev) =>
          prev.map((r) => (r.external_id === externalId ? updated : r)),
        );
        return { ok: true, row: updated };
      } catch {
        return { ok: false, message: "Network error — backend may be offline." };
      }
    },
    [],
  );

  return { rows, isLoading, loadError, fetchVenues, patchVenue };
}
