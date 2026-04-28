import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "blaniko:favorites:v1";

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

export function useFavorites() {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>(() => readFavoriteSlugs());

  // Persist to localStorage whenever favorites change.
  // Running this in an effect (after commit) keeps state updaters pure and
  // ensures the DOM has already updated before we write — so the first click
  // always reflects immediately in the UI.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const normalized = sanitizeFavoriteSlugs(favoriteSlugs);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }, [favoriteSlugs]);

  // Cross-tab sync: pick up changes made in other browser tabs.
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

  const favoriteSlugSet = useMemo(() => new Set(favoriteSlugs), [favoriteSlugs]);

  const isFavorite = useCallback(
    (slug: string) => favoriteSlugSet.has(slug),
    [favoriteSlugSet]
  );

  const addFavorite = useCallback((slug: string) => {
    if (!slug.trim()) {
      return;
    }

    setFavoriteSlugs((previous) => {
      if (previous.includes(slug)) {
        return previous;
      }

      return [...previous, slug];
    });
  }, []);

  const removeFavorite = useCallback((slug: string) => {
    setFavoriteSlugs((previous) => {
      const next = previous.filter((item) => item !== slug);

      if (next.length === previous.length) {
        return previous;
      }

      return next;
    });
  }, []);

  const toggleFavorite = useCallback((slug: string) => {
    if (!slug.trim()) {
      return;
    }

    setFavoriteSlugs((previous) => {
      return previous.includes(slug)
        ? previous.filter((item) => item !== slug)
        : [...previous, slug];
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavoriteSlugs([]);
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
