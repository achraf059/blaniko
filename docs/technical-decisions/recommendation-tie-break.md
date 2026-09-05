# Recommendation Tie-Break Redesign

**Code:** `frontend/src/utils/recommendationEngine.ts` (`seededHash`)
**Tests:** `frontend/src/utils/recommendationEngine.test.ts` ("Determinism")

## Problem

The recommendation engine scores venues on structured data (category, audience tags, atmosphere tags). At ~100 venues, many candidates end up with identical scores, so the tie-break decides which venue the user actually sees. Requirements:

1. **Deterministic** — identical inputs and seed must always produce the same plan.
2. **Fair across seeds** — over different seeds, every tied peer should be reachable, so the same venue doesn't permanently shadow its equally-scored peers.

## Previous approach and why it failed

Ties were broken with `(stableHash(slug) + seed) % 11`. A saturation audit showed this is structurally defective: adding the same seed to every venue's hash shifts every venue's modulo-11 bucket **equally**, so relative order between venues barely changes and the whole scheme has period 11 (seed 11 behaves identically to seed 0). Some tied venues were unreachable under *any* seed.

## Chosen change

Replace the modulo scheme with a dependency-free 32-bit FNV-1a hash over the string `${seed}:${slug}`.

Two deliberate details:

- **Full 32-bit space instead of modulo-11 buckets** removes the structural ceiling: the seed materially changes the ordering and there is no small period.
- **The seed is placed first, not last.** FNV-1a only avalanches a byte through the multiplications that follow it, so a trailing seed digit barely mixes — consecutive seeds would differ by a near-constant offset applied to every slug, preserving relative order (an audit showed seeds 0 and 1 produced identical orderings with a trailing seed). Hashing the seed first lets the entire slug avalanche it, so each seed yields an uncorrelated ordering.

## Tradeoffs

- FNV-1a is **not cryptographic** and doesn't need to be — the goal is deterministic, well-distributed ordering, not unpredictability.
- A hand-rolled hash adds ~10 lines vs. pulling in a dependency; for a pure function this small, zero dependencies won.

## Verification

Invariant tests assert that identical inputs and seed produce identical selections across runs, that the explicit category always wins, and that price and area changes cannot reorder results. The defect analysis itself came from a saturation audit (exhaustively checking reachability of tied peers across seed ranges).

## Remaining limitation

Fairness is statistical, not exact: FNV-1a distributes well but does not guarantee perfectly uniform rotation through tied peers.
