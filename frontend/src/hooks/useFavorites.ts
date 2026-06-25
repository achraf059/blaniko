import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../auth/AuthProvider";
import { supabase } from "../lib/supabaseClient";

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

function readFavoriteSlugs(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeFavoriteSlugs(parsed);
  } catch {
    return [];
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFavorites() {
  // Read auth context directly (defensive — if AuthProvider is absent, user
  // is null and we fall back to guest-localStorage mode gracefully).
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id ?? null;

  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>(() => readFavoriteSlugs());

  // Refs let async callbacks and stable callbacks read current values without
  // being listed as effect dependencies (which would cause re-runs / loops).
  // Updated in effects (not inline during render) to satisfy react-hooks/refs.
  const slugsRef = useRef(favoriteSlugs);
  const userIdRef = useRef(userId);

  useEffect(() => { slugsRef.current = favoriteSlugs; }, [favoriteSlugs]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Tracks which userId we've already fetched + merged from Supabase.
  // Using a ref (not state) avoids the re-render that state would cause,
  // and avoids the "missing dep" lint warning if it were in the effect dep array.
  const mergedForRef = useRef<string | null>(null);

  // ── localStorage persist ───────────────────────────────────────────────────
  // Runs after every slug change. Keeps localStorage as a local copy even for
  // logged-in users — so favorites survive a session without network access.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const normalized = sanitizeFavoriteSlugs(favoriteSlugs);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }, [favoriteSlugs]);

  // ── Cross-tab sync ─────────────────────────────────────────────────────────
  // Unchanged from the original — picks up localStorage writes made in other tabs.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        setFavoriteSlugs([]);
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as unknown;
        setFavoriteSlugs(sanitizeFavoriteSlugs(parsed));
      } catch {
        setFavoriteSlugs([]);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // ── Supabase sync on login ─────────────────────────────────────────────────
  // Runs whenever the signed-in userId changes.
  //
  // On login:
  //   1. Fetch all remote favorites from public.user_favorites.
  //   2. Merge with current localStorage slugs (union, deduplicated).
  //   3. Upload any local-only slugs to Supabase so they persist across devices.
  //   4. Update in-memory state to the merged set.
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

        setFavoriteSlugs(merged);
        mergedForRef.current = capturedUserId;
      } catch {
        // Network / unexpected error — stay on localStorage state.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
    if (!slug.trim()) return;

    setFavoriteSlugs((previous) => {
      if (previous.includes(slug)) return previous;
      return [...previous, slug];
    });

    const currentUserId = userIdRef.current;
    if (supabase && currentUserId) {
      void supabase
        .from("user_favorites")
        .insert({ user_id: currentUserId, venue_slug: slug })
        .then(() => {}, () => {});
    }
  }, []);

  const removeFavorite = useCallback((slug: string) => {
    setFavoriteSlugs((previous) => {
      const next = previous.filter((item) => item !== slug);
      if (next.length === previous.length) return previous;
      return next;
    });

    const currentUserId = userIdRef.current;
    if (supabase && currentUserId) {
      void supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", currentUserId)
        .eq("venue_slug", slug)
        .then(() => {}, () => {});
    }
  }, []);

  const toggleFavorite = useCallback((slug: string) => {
    if (!slug.trim()) return;

    // Read current state from ref (not from the closure) to avoid stale reads.
    const isCurrentlyFav = slugsRef.current.includes(slug);
    const currentUserId = userIdRef.current;

    setFavoriteSlugs((previous) =>
      isCurrentlyFav
        ? previous.filter((item) => item !== slug)
        : [...previous, slug],
    );

    if (supabase && currentUserId) {
      if (isCurrentlyFav) {
        void supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", currentUserId)
          .eq("venue_slug", slug)
          .then(() => {}, () => {});
      } else {
        void supabase
          .from("user_favorites")
          .insert({ user_id: currentUserId, venue_slug: slug })
          .then(() => {}, () => {});
      }
    }
  }, []);

  const clearFavorites = useCallback(() => {
    const currentUserId = userIdRef.current;
    setFavoriteSlugs([]);

    if (supabase && currentUserId) {
      void supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", currentUserId)
        .then(() => {}, () => {});
    }
  }, []);

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
