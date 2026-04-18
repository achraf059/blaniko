import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "blaniko:favorites:v1";
const FAVORITES_EVENT = "blaniko:favorites-updated";

type FavoritesEventDetail = {
  slugs: string[];
};

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

function writeFavoriteSlugs(slugs: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = sanitizeFavoriteSlugs(slugs);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent<FavoritesEventDetail>(FAVORITES_EVENT, {
      detail: { slugs: normalized },
    })
  );
}

export function useFavorites() {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>(() => readFavoriteSlugs());

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

    const handleFavoritesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<FavoritesEventDetail>;
      setFavoriteSlugs(sanitizeFavoriteSlugs(customEvent.detail?.slugs));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(FAVORITES_EVENT, handleFavoritesUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(FAVORITES_EVENT, handleFavoritesUpdated);
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

      const next = [...previous, slug];
      writeFavoriteSlugs(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((slug: string) => {
    setFavoriteSlugs((previous) => {
      const next = previous.filter((item) => item !== slug);

      if (next.length === previous.length) {
        return previous;
      }

      writeFavoriteSlugs(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((slug: string) => {
    if (!slug.trim()) {
      return;
    }

    setFavoriteSlugs((previous) => {
      const next = previous.includes(slug)
        ? previous.filter((item) => item !== slug)
        : [...previous, slug];

      writeFavoriteSlugs(next);
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavoriteSlugs([]);
    writeFavoriteSlugs([]);
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
