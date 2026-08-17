/**
 * useAdminApi
 *
 * Manages admin venue operations via the backend admin API.
 * Authentication is handled via HttpOnly session cookies set by the backend.
 * The PIN is never stored in the frontend — it is sent once to the login
 * endpoint, validated server-side, and a session cookie is returned.
 *
 * A CSRF token is returned on login and session check, held in memory only
 * (never in localStorage, sessionStorage, cookies, or URLs), and sent via
 * the X-CSRF-Token header on all state-changing requests.
 */

import { useCallback, useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

// ─── CSRF token — held in JS memory only ─────────────────────────────────────
let _csrfToken = "";

function setCsrfToken(token: string): void {
  _csrfToken = token;
}

function clearCsrfToken(): void {
  _csrfToken = "";
}

function getCsrfToken(): string {
  return _csrfToken;
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

export type LoginResult = "success" | "invalid" | "rate_limited" | "error";

/** Send PIN to backend. Returns a discriminated result so the caller
 *  can show an appropriate message for each failure mode. */
export async function adminLogin(pin: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_URL}/api/admin/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.status === 429) return "rate_limited";
    if (!res.ok) return "invalid";
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      csrfToken?: string;
    };
    if (body.success && body.csrfToken) {
      setCsrfToken(body.csrfToken);
      return "success";
    }
    return "invalid";
  } catch {
    return "error";
  }
}

export type SessionCheckResult = "authenticated" | "unauthenticated" | "error";

/** Check whether an active admin session exists (cookie-based).
 *  Returns "error" for transient failures (429, network) so the caller
 *  can distinguish "definitely not logged in" from "couldn't reach server". */
export async function adminCheckSession(): Promise<SessionCheckResult> {
  try {
    const res = await fetch(`${API_URL}/api/admin/auth/session`, {
      credentials: "include",
    });
    // Transient server errors — do NOT treat as "unauthenticated"
    if (res.status === 429 || res.status >= 500) return "error";
    if (!res.ok) return "unauthenticated";
    const body = (await res.json().catch(() => ({}))) as {
      authenticated?: boolean;
      csrfToken?: string;
    };
    if (body.authenticated && body.csrfToken) {
      setCsrfToken(body.csrfToken);
      return "authenticated";
    }
    return body.authenticated === true ? "authenticated" : "unauthenticated";
  } catch {
    return "error";
  }
}

/** Log out — clears the session cookie server-side. */
export async function adminLogout(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/admin/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": getCsrfToken() },
    });
  } catch {
    // Best-effort — cookie will expire anyway
  }
  clearCsrfToken();
}

// ─── Types ───────────────────────────────────────────────────────────────────

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
  detail_image_url: string | null;
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
  // V3 canonical fields (present after migration + import)
  additional_experiences?: string[] | null;
  location_text?: string | null;
  google_maps_url?: string | null;
  contact_information?: string | null;
  audience_tags?: string[] | null;
  experience_description?: string | null;
  atmosphere_tags?: string[] | null;
  indoor_outdoor?: string | null;
  facebook?: string | null;
  opening_hours_raw?: string | null;
  booking_method?: string[] | null;
  booking_link?: string | null;
  research_status?: string | null;
  verification_level?: string | null;
  last_verified_date?: string | null;
  verified_by?: string | null;
  price?: string | null;
  price_details?: string | null;
  best_for_tags?: string[] | null;
  space_type?: string | null;
  time_of_day?: string[] | null;
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
  detailImageUrl?: string | null;
  priceLevel?: string | null;
  lat?: number | null;
  lng?: number | null;
  isActive?: boolean;
  website?: string | null;
  instagram?: string | null;
  overview?: string | null;
  vibe?: string | null;
  audience?: string | null;
  // V3 canonical fields
  locationText?: string | null;
  googleMapsUrl?: string | null;
  contactInformation?: string | null;
  experienceDescription?: string | null;
  indoorOutdoor?: string | null;
  facebook?: string | null;
  openingHoursRaw?: string | null;
  bookingLink?: string | null;
  researchStatus?: string | null;
  verificationLevel?: string | null;
  verifiedBy?: string | null;
  // Array fields
  audienceTags?: string[] | null;
  atmosphereTags?: string[] | null;
  additionalExperiences?: string[] | null;
  bookingMethod?: string[] | null;
  bestForTags?: string[] | null;
  timeOfDay?: string[] | null;
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAdminApi() {
  const [rows, setRows] = useState<AdminVenueRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchVenues = useCallback(async (): Promise<true | false | "auth_failed"> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/venues`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 401) {
          clearCsrfToken();
          setLoadError("Session expired. Please log in again.");
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
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": getCsrfToken(),
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
            clearCsrfToken();
            return { ok: false, message: "Session expired — please log in again." };
          }
          if (res.status === 403) {
            return { ok: false, message: "Request rejected — please reload and try again." };
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
