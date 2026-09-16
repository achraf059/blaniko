// Pure state-selection helpers for PlanPage.
//
// PlanPage couples together the router, localStorage, i18n and several hooks, so its
// state decisions are extracted here as small pure functions that can be unit-tested
// without rendering the component. The component itself only wires these to JSX.

export type PlanViewState = "quiz" | "loading" | "error" | "unavailable" | "plan";

/**
 * Decides which top-level view PlanPage renders.
 *
 * Precedence:
 *   1. `quiz`        — a fresh /plan visit with no completed-plan URL signal. The quiz
 *                      does not need venue data, so it wins even while venues load.
 *   2. `error`       — venue loading failed. Wins over `loading` so a lingering error can
 *                      never be masked by a stale loading flag (they are mutually exclusive
 *                      in practice, but error-first is the safe ordering).
 *   3. `loading`     — venue data is still resolving for a completed/shared plan.
 *   4. `unavailable` — venues loaded successfully but an explicitly requested plan
 *                      (a `stops` URL param) references venues that no longer exist.
 *                      Only reachable after loading completed without error, so an
 *                      unloaded dataset is never misclassified as missing venues.
 *   5. `plan`        — venues loaded with no error and every requested stop resolved;
 *                      the plan (or the genuine insufficient-venues message) may render.
 *
 * Crucially, `loading` and `error` are returned instead of `plan`/`unavailable`, so both
 * the "Not enough venues" message and the stale-plan state are only reachable once
 * loading has genuinely completed without error. `requestedStopsUnavailable` defaults to
 * false so callers that never request explicit stops keep the original 4-state behavior.
 */
export function selectPlanViewState(input: {
  showQuiz: boolean;
  venuesLoading: boolean;
  venuesError: string | null;
  requestedStopsUnavailable?: boolean;
}): PlanViewState {
  if (input.showQuiz) return "quiz";
  if (input.venuesError) return "error";
  if (input.venuesLoading) return "loading";
  if (input.requestedStopsUnavailable) return "unavailable";
  return "plan";
}

/**
 * Classifies an explicitly requested plan (the `stops` URL param) against the
 * authoritative set of known venue slugs. This is the core intent distinction:
 *
 *   - `none`        — no explicit stops were requested; the caller should generate a
 *                     normal plan (unchanged legacy behavior).
 *   - `resolved`    — every requested slug maps to a real venue; restore them in the
 *                     exact requested order.
 *   - `unavailable` — one or more requested slugs do not resolve. The caller must NOT
 *                     silently substitute generated venues and must NOT show a partial
 *                     plan; it should surface the stale/unavailable-plan state instead.
 *
 * A resolved count that merely happens to be > 0 is never treated as proof of validity:
 * every requested slug must resolve. `knownSlugs` must be the successfully-loaded venue
 * set — call this only once loading has finished without error, otherwise an empty set
 * would misclassify a still-loading valid plan as unavailable.
 */
export type RequestedStopsResolution =
  | { kind: "none" }
  | { kind: "resolved"; slugs: string[] }
  | { kind: "unavailable"; requestedSlugs: string[]; missingSlugs: string[] };

export function resolveRequestedStops(
  requestedSlugs: string[],
  knownSlugs: ReadonlySet<string>,
): RequestedStopsResolution {
  if (requestedSlugs.length === 0) {
    return { kind: "none" };
  }

  const missingSlugs = requestedSlugs.filter((slug) => !knownSlugs.has(slug));
  if (missingSlugs.length === 0) {
    return { kind: "resolved", slugs: requestedSlugs };
  }

  return { kind: "unavailable", requestedSlugs, missingSlugs };
}

/**
 * Chooses the `stops` value to persist back into the plan URL during the URL-sync pass.
 *
 * Prefers freshly-derived stop slugs; when none exist yet (e.g. a refresh landed before
 * venues resolved), carries the existing `stops` URL param forward so a completed plan's
 * durable stops are never clobbered while data loads.
 */
export function resolveStopsToPersist(
  derivedStopSlugs: string,
  stopsFromUrl: string,
): string {
  return derivedStopSlugs || stopsFromUrl;
}
