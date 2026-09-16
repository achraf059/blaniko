// Pure state-selection helpers for PlanPage.
//
// PlanPage couples together the router, localStorage, i18n and several hooks, so its
// state decisions are extracted here as small pure functions that can be unit-tested
// without rendering the component. The component itself only wires these to JSX.

export type PlanViewState = "quiz" | "loading" | "error" | "plan";

/**
 * Decides which top-level view PlanPage renders.
 *
 * Precedence:
 *   1. `quiz`    — a fresh /plan visit with no completed-plan URL signal. The quiz
 *                  does not need venue data, so it wins even while venues load.
 *   2. `error`   — venue loading failed. Wins over `loading` so a lingering error can
 *                  never be masked by a stale loading flag (they are mutually exclusive
 *                  in practice, but error-first is the safe ordering).
 *   3. `loading` — venue data is still resolving for a completed/shared plan.
 *   4. `plan`    — venues loaded with no error; the plan (or the genuine
 *                  insufficient-venues message) may render.
 *
 * Crucially, `loading` and `error` are returned instead of `plan`, so the
 * "Not enough venues for this exact combination yet" message is only reachable in the
 * `plan` state — i.e. after loading has genuinely completed without error.
 */
export function selectPlanViewState(input: {
  showQuiz: boolean;
  venuesLoading: boolean;
  venuesError: string | null;
}): PlanViewState {
  if (input.showQuiz) return "quiz";
  if (input.venuesError) return "error";
  if (input.venuesLoading) return "loading";
  return "plan";
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
