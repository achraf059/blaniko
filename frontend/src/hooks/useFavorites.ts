import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../auth/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import { tryReadStorageItem, writeStorageItem } from "../utils/safeStorage";

const STORAGE_KEY = "blaniko:favorites:v1";

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeFavoriteSlugs(rawValue: unknown): string[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const unique = new Set<string>();

  for (const item of rawValue) {
    if (typeof item !== "string") {
      continue;
    }

    const slug = item.trim();

    if (!slug) {
      continue;
    }

    unique.add(slug);
  }

  return [...unique];
}

// `readFailed` means the stored favorites are unknown (storage could not be read).
function readFavoriteSlugs(): { slugs: string[]; readFailed: boolean } {
  if (typeof window === "undefined") {
    return { slugs: [], readFailed: false };
  }

  const result = tryReadStorageItem(STORAGE_KEY);

  if (!result.ok) {
    return { slugs: [], readFailed: true };
  }

  if (!result.value) {
    return { slugs: [], readFailed: false };
  }

  try {
    const parsed = JSON.parse(result.value) as unknown;
    return { slugs: sanitizeFavoriteSlugs(parsed), readFailed: false };
  } catch {
    return { slugs: [], readFailed: false };
  }
}

type FavoritesReadResult = { ok: true; slugs: string[] } | { ok: false };

// Re-reads storage right before an explicit mutation (B04 D7): another tab may have
// added/removed a favorite since this tab last saw a storage event, so this tab's own
// `favoriteSlugs` state can be stale. `ok: false` means the read itself failed (storage
// truly unknown), distinct from a confirmed-empty read.
function readCurrentFavoriteSlugs(): FavoritesReadResult {
  const result = tryReadStorageItem(STORAGE_KEY);
  if (!result.ok) {
    return { ok: false };
  }

  if (!result.value) {
    return { ok: true, slugs: [] };
  }

  try {
    return { ok: true, slugs: sanitizeFavoriteSlugs(JSON.parse(result.value) as unknown) };
  } catch {
    return { ok: true, slugs: [] };
  }
}

function persistFavoriteSlugs(slugs: string[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return writeStorageItem(STORAGE_KEY, JSON.stringify(sanitizeFavoriteSlugs(slugs)));
}

// ── Pending-operation model (B04 D7 failure-recovery fix) ───────────────────────
//
// A boolean "my last write failed, ignore storage" flag is too coarse: it can't tell
// the difference between "storage still holds what it held before my failed write"
// and "another tab has since written something newer" — so it either always ignores
// storage (losing other tabs' concurrent writes, as the earlier D7 implementation
// did) or always trusts it (losing this tab's own unpersisted action).
//
// Instead, each unpersisted user action is recorded as a small, replayable operation
// (`FavoritesOp`) — the RESOLVED intent at the moment the user acted (e.g. "add X" or
// "remove X", never a generic "toggle", since replaying a toggle against a different
// external base could invert the wrong way). Every mutation and every incoming
// event reconciles by taking the freshest known persisted base and replaying every
// still-pending op over it, in order. Once a write succeeds, the pending queue —
// which is now fully represented by what was just persisted — clears. This lets a
// concurrent external write and this tab's own unpersisted action both survive.
type FavoritesOp =
  | { type: "add"; slug: string }
  | { type: "remove"; slug: string }
  // Captures the slugs that were visible at the moment of the clear, so a favorite
  // added by another tab *after* this clear was issued is not retroactively erased
  // once the pending clear eventually replays against a newer base.
  | { type: "clearSlugs"; slugs: string[] }
  // Authoritative replace — used only by the Supabase login merge below, which
  // already folds in this tab's local view (see `merged`), so it intentionally
  // ignores whatever base it is replayed against.
  | { type: "set"; slugs: string[] };

function applyFavoritesOp(op: FavoritesOp, base: string[]): string[] {
  switch (op.type) {
    case "add":
      return base.includes(op.slug) ? base : [...base, op.slug];
    case "remove":
      return base.filter((slug) => slug !== op.slug);
    case "clearSlugs":
      return base.filter((slug) => !op.slugs.includes(slug));
    case "set":
      return sanitizeFavoriteSlugs(op.slugs);
  }
}

function replayFavoritesOps(base: string[], ops: FavoritesOp[]): string[] {
  return ops.reduce((acc, op) => applyFavoritesOp(op, acc), base);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFavorites() {
  // Read auth context directly (defensive — if AuthProvider is absent, user
  // is null and we fall back to guest-localStorage mode gracefully).
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id ?? null;

  const [initialFavorites] = useState(readFavoriteSlugs);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>(initialFavorites.slugs);

  // Refs let async callbacks and stable callbacks read current values without
  // being listed as effect dependencies (which would cause re-runs / loops).
  // Updated in effects (not inline during render) to satisfy react-hooks/refs.
  const slugsRef = useRef(favoriteSlugs);
  const userIdRef = useRef(userId);
  // Operations applied in memory but not yet confirmed persisted (B04 D7). Cleared
  // the moment a write succeeds; replayed over the freshest known base otherwise.
  const pendingOpsRef = useRef<FavoritesOp[]>([]);

  useEffect(() => { slugsRef.current = favoriteSlugs; }, [favoriteSlugs]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Tracks which userId we've already fetched + merged from Supabase.
  // Using a ref (not state) avoids the re-render that state would cause,
  // and avoids the "missing dep" lint warning if it were in the effect dep array.
  const mergedForRef = useRef<string | null>(null);

  // ── Cross-tab sync (B04 D7) ────────────────────────────────────────────────
  // Picks up localStorage writes made in other tabs. Reconciles the incoming
  // persisted base against this tab's own still-pending operations (if any) rather
  // than blindly replacing visible state — so an unpersisted local action isn't
  // discarded merely because a storage event arrived. Never persists or dispatches
  // in response to receiving an event, so there is no write-back/ping-pong.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      let incomingBase: string[] = [];
      if (event.newValue) {
        try {
          incomingBase = sanitizeFavoriteSlugs(JSON.parse(event.newValue) as unknown);
        } catch {
          incomingBase = [];
        }
      }

      const reconciled = replayFavoritesOps(incomingBase, pendingOpsRef.current);
      slugsRef.current = reconciled;
      setFavoriteSlugs(reconciled);
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Re-reads storage fresh and replays any still-pending local operations over it —
  // the single source of truth every mutation below uses as its starting point. A
  // failed read means the true persisted base is currently unknown, so this falls
  // back to the already-reconciled `slugsRef.current` (PR #240's tradeoff: the
  // action still proceeds against the best information available).
  const readReconciledBase = useCallback((): string[] => {
    const fresh = readCurrentFavoriteSlugs();
    if (fresh.ok) {
      return replayFavoritesOps(fresh.slugs, pendingOpsRef.current);
    }
    return slugsRef.current;
  }, []);

  // Applies `op` to `resolvedCurrent` (the result of `readReconciledBase()`), then
  // attempts to persist that result as a plain, synchronous step. On success the
  // pending queue clears — the just-written value fully represents everything that
  // was pending. On failure `op` joins the queue so the next reconciliation replays
  // it again over whatever base is fresh at that time.
  const applyOpAndPersist = useCallback((op: FavoritesOp, resolvedCurrent: string[]) => {
    const next = applyFavoritesOp(op, resolvedCurrent);
    slugsRef.current = next;
    setFavoriteSlugs(next);
    const success = persistFavoriteSlugs(next);
    pendingOpsRef.current = success ? [] : [...pendingOpsRef.current, op];
  }, []);

  // ── Supabase sync on login ─────────────────────────────────────────────────
  // Runs whenever the signed-in userId changes.
  //
  // On login:
  //   1. Fetch all remote favorites from public.user_favorites.
  //   2. Merge with current local slugs (union, deduplicated) — `slugsRef.current`
  //      already reflects any still-pending local operations, so they are folded
  //      into the merge automatically.
  //   3. Upload any local-only slugs to Supabase so they persist across devices.
  //   4. Update in-memory state to the merged set via the same op/pending machinery
  //      as any other mutation (an authoritative `"set"` op), so a persistence
  //      failure here degrades exactly the same way instead of silently dropping
  //      the merge result.
  //
  // On logout (userId becomes null):
  //   • Reset mergedForRef so the next login triggers a fresh merge (in case
  //     the user added favorites as a guest between sessions).
  //   • No state change — localStorage already has the latest set.
  //
  // All setState calls are inside the async IIFE, satisfying the
  // react-hooks/set-state-in-effect lint rule (no synchronous setState in body).
  useEffect(() => {
    if (!userId) {
      // Reset merge tracker so the next login re-merges any guest additions.
      mergedForRef.current = null;
      return;
    }

    if (!supabase) {
      // Auth not configured — stay in localStorage-only mode.
      return;
    }

    if (mergedForRef.current === userId) {
      // Already synced for this session; don't re-fetch.
      return;
    }

    let cancelled = false;
    const capturedUserId = userId; // stable over the async lifetime

    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_favorites")
          .select("venue_slug")
          .eq("user_id", capturedUserId);

        if (cancelled) return;
        if (error) return; // fail safely — keep existing localStorage state

        const remoteSlugs = (data as { venue_slug: string }[]).map((r) => r.venue_slug);
        const localSlugs = slugsRef.current;

        // Union: remote authoritative + local additions the user made as a guest.
        const remoteSet = new Set(remoteSlugs);
        const localOnlySlugs = localSlugs.filter((s) => !remoteSet.has(s));
        const merged = [...remoteSlugs, ...localOnlySlugs];

        // Upload local-only slugs to Supabase so they're available on other devices.
        if (localOnlySlugs.length > 0) {
          // Fire-and-forget: if this fails, the local state is still correct.
          // ON CONFLICT on the PK means re-running is safe (idempotent).
          void supabase
            .from("user_favorites")
            .insert(
              localOnlySlugs.map((slug) => ({
                user_id: capturedUserId,
                venue_slug: slug,
              })),
            )
            .then(() => {}, () => {});
        }

        if (cancelled) return;

        applyOpAndPersist({ type: "set", slugs: merged }, slugsRef.current);
        mergedForRef.current = capturedUserId;
      } catch {
        // Network / unexpected error — stay on localStorage state.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, applyOpAndPersist]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const favoriteSlugSet = useMemo(() => new Set(favoriteSlugs), [favoriteSlugs]);

  const isFavorite = useCallback(
    (slug: string) => favoriteSlugSet.has(slug),
    [favoriteSlugSet],
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  //
  // All mutations use refs for current values so the callbacks are stable
  // (empty dependency arrays) — avoiding unnecessary re-renders in consumers.
  //
  // Supabase writes are fire-and-forget: the UI updates optimistically, and
  // a network failure leaves local state correct while Supabase may be stale.
  // The next login merge will reconcile any drift.

  const addFavorite = useCallback((slug: string) => {
    const normalized = slug.trim();
    if (!normalized) return;

    const resolvedCurrent = readReconciledBase();
    // A true no-op (nothing pending, and this slug is already present) writes
    // nothing. Otherwise — including when there's a pending queue to flush even
    // though this particular slug is already present — proceed.
    if (resolvedCurrent.includes(normalized) && pendingOpsRef.current.length === 0) {
      return;
    }

    applyOpAndPersist({ type: "add", slug: normalized }, resolvedCurrent);

    const currentUserId = userIdRef.current;
    if (supabase && currentUserId) {
      void supabase
        .from("user_favorites")
        .insert({ user_id: currentUserId, venue_slug: normalized })
        .then(() => {}, () => {});
    }
  }, [readReconciledBase, applyOpAndPersist]);

  const removeFavorite = useCallback((slug: string) => {
    const resolvedCurrent = readReconciledBase();
    if (!resolvedCurrent.includes(slug) && pendingOpsRef.current.length === 0) {
      return;
    }

    applyOpAndPersist({ type: "remove", slug }, resolvedCurrent);

    const currentUserId = userIdRef.current;
    if (supabase && currentUserId) {
      void supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", currentUserId)
        .eq("venue_slug", slug)
        .then(() => {}, () => {});
    }
  }, [readReconciledBase, applyOpAndPersist]);

  const toggleFavorite = useCallback((slug: string) => {
    const normalized = slug.trim();
    if (!normalized) return;

    // The resolved intent — add or remove — is captured NOW, against the current
    // reconciled view. It is never recorded as a generic "toggle": replaying a
    // toggle against a different (newer) external base could flip the wrong way.
    const resolvedCurrent = readReconciledBase();
    const isCurrentlyFav = resolvedCurrent.includes(normalized);
    const op: FavoritesOp = isCurrentlyFav
      ? { type: "remove", slug: normalized }
      : { type: "add", slug: normalized };

    applyOpAndPersist(op, resolvedCurrent);

    const currentUserId = userIdRef.current;
    if (supabase && currentUserId) {
      if (isCurrentlyFav) {
        void supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", currentUserId)
          .eq("venue_slug", normalized)
          .then(() => {}, () => {});
      } else {
        void supabase
          .from("user_favorites")
          .insert({ user_id: currentUserId, venue_slug: normalized })
          .then(() => {}, () => {});
      }
    }
  }, [readReconciledBase, applyOpAndPersist]);

  const clearFavorites = useCallback(() => {
    const currentUserId = userIdRef.current;
    const resolvedCurrent = readReconciledBase();
    // Scoped to what was actually visible at the moment of the clear (see
    // `clearSlugs` above) — a favorite another tab adds afterward is not
    // retroactively erased once this pending clear eventually replays.
    applyOpAndPersist({ type: "clearSlugs", slugs: resolvedCurrent }, resolvedCurrent);

    if (supabase && currentUserId) {
      void supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", currentUserId)
        .then(() => {}, () => {});
    }
  }, [readReconciledBase, applyOpAndPersist]);

  return {
    favoriteSlugs,
    favoritesCount: favoriteSlugs.length,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearFavorites,
  };
}
