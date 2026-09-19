// Saved-outing structural validation for PlanPage (B04 D3).
//
// A saved outing is arbitrary JSON read back from localStorage: it can be edited by
// hand, corrupted by a browser extension, or left over from a future/older schema. The
// loader used to trust the parsed value once it confirmed the top-level shape was an
// array (`Array.isArray(parsed)`), then treated every element as a well-formed
// `SavedOuting`. A single malformed element crashed the /plan route on every visit,
// because later code assumes `outing.stops` is an array of stop objects, that
// `outing.title` / `outing.summary` / `stop.name` are safe to render directly, and that
// `outing.lockedRoles` is an array it can `.join()`.
//
// `sanitizeSavedOutings` filters the parsed value down to outings that genuinely satisfy
// the `SavedOuting` type below — every check mirrors a declared field's real type, so the
// `value is SavedOuting` type guards below are sound (they never claim a value matches a
// shape it doesn't actually have). This never repairs a malformed outing into a guessed
// shape: an outing is either kept exactly as stored, or dropped entirely.
//
// Every field this app has ever written to a saved outing (see PlanPage's
// `handleSaveOuting`) is always a genuine string (or an array of `StopRoleKey`, for
// `lockedRoles`) — there is no historical schema variant where, say, `budget` or a
// stop's `slug` was ever anything else. So requiring each field to match its declared
// type here costs nothing for real, app-produced data; it only rejects outings that
// could never have been legitimately written, which is exactly what should be dropped.
//
// `category` and `planStyle` stay optional on the outing, matching their existing,
// documented optionality (older saved outings predate the `category` field; both
// already fall back safely when absent). A stop's `role`, `roleHint`, `area` and
// `category` are also optional: unlike `slug` and `name`, none of the four is ever read
// back for a stored outing (only used when a *new* outing is first saved), so requiring
// them would reject outings that are otherwise perfectly safe to render and reopen.
//
// A structurally valid outing whose venue no longer exists (stale/retired) is NOT
// malformed: a stale/retired slug is still a genuine, correctly-typed string — it is
// simply one `resolveRequestedStops` (called later, against the live venue set) does not
// recognize. Requiring `stop.slug` to be a string does not affect that outing at all; it
// only rejects a stop whose slug isn't a string in the first place, which no stale-venue
// outing ever has.

import { stopRoleOrder, type StopRoleKey } from "../utils/recommendationEngine";

export type SavedOutingStop = {
  role?: string;
  roleHint?: string;
  slug: string;
  name: string;
  area?: string;
  category?: string;
};

export type SavedOuting = {
  id: string;
  title: string;
  summary: string;
  planStyle?: string;
  area: string;
  budget: string;
  withWho: string;
  mood: string;
  // Explicit "Looking for" category. Optional so pre-existing saved outings (without it)
  // safely fall back to "any" / legacy behavior when reopened.
  category?: string;
  lockedRoles?: StopRoleKey[];
  stops: SavedOutingStop[];
  createdAt: string;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStopRoleKey(value: unknown): value is StopRoleKey {
  return typeof value === "string" && (stopRoleOrder as string[]).includes(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

// `slug` and `name` are the only stop fields ever read back for a stored outing (see
// the file header), so they are required. `role`/`roleHint`/`area`/`category` are
// write-only metadata from when the outing was first saved — optional here so an
// outing missing them (as every saved outing predating this PR does) is not rejected.
function isSanitizedStop(value: unknown): value is SavedOutingStop {
  return (
    isPlainRecord(value) &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    isOptionalString(value.role) &&
    isOptionalString(value.roleHint) &&
    isOptionalString(value.area) &&
    isOptionalString(value.category)
  );
}

function isSanitizedSavedOuting(value: unknown): value is SavedOuting {
  if (!isPlainRecord(value)) {
    return false;
  }

  // Required for React's list key and for unambiguous Delete lookups
  // (`previous.filter((outing) => outing.id !== id)`); every outing this app has ever
  // saved has a non-empty string id (`handleSaveOuting` builds it from a timestamp).
  if (!isNonEmptyString(value.id)) {
    return false;
  }

  if (typeof value.title !== "string" || typeof value.summary !== "string") {
    return false;
  }

  if (
    typeof value.area !== "string" ||
    typeof value.budget !== "string" ||
    typeof value.withWho !== "string" ||
    typeof value.mood !== "string"
  ) {
    return false;
  }

  if (value.planStyle !== undefined && typeof value.planStyle !== "string") {
    return false;
  }

  if (value.category !== undefined && typeof value.category !== "string") {
    return false;
  }

  if (typeof value.createdAt !== "string") {
    return false;
  }

  // Every stop must itself be a fully-typed SavedOutingStop. An empty stops array is
  // valid — it renders as an outing with no stops, and reopening it starts a fresh plan
  // rather than resurrecting anything (unchanged from existing behavior).
  if (!Array.isArray(value.stops) || !value.stops.every(isSanitizedStop)) {
    return false;
  }

  // `buildPlanUrl` calls `.join(",")` on `lockedRoles` when it is truthy — a non-array
  // value that still has a `.length` (e.g. a string) throws there. Each element must be
  // a genuine StopRoleKey; an unrecognized value there would otherwise falsely satisfy
  // `StopRoleKey[]`.
  if (value.lockedRoles !== undefined) {
    if (!Array.isArray(value.lockedRoles) || !value.lockedRoles.every(isStopRoleKey)) {
      return false;
    }
  }

  return true;
}

// Drops only the outings that don't genuinely satisfy the SavedOuting shape; every other
// outing — including one whose stops reference a stale, retired, or unknown venue — is
// preserved exactly as stored.
export function sanitizeSavedOutings(rawValue: unknown): SavedOuting[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue.filter(isSanitizedSavedOuting);
}
