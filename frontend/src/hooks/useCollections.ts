import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "blaniko:collections:v1";
const COLLECTIONS_EVENT = "blaniko:collections-updated";

export type VenueCollection = {
  id: string;
  name: string;
  createdAt: string;
  venueSlugs: string[];
};

type CollectionsEventDetail = {
  collections: VenueCollection[];
};

function sanitizeSlugList(rawValue: unknown): string[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const seen = new Set<string>();

  for (const item of rawValue) {
    if (typeof item !== "string") {
      continue;
    }

    const slug = item.trim();
    if (!slug) {
      continue;
    }

    seen.add(slug);
  }

  return [...seen];
}

function sanitizeCollection(rawValue: unknown): VenueCollection | undefined {
  if (!rawValue || typeof rawValue !== "object") {
    return undefined;
  }

  const rawCollection = rawValue as Record<string, unknown>;
  const id = typeof rawCollection.id === "string" ? rawCollection.id.trim() : "";
  const name = typeof rawCollection.name === "string" ? rawCollection.name.trim() : "";
  const createdAt =
    typeof rawCollection.createdAt === "string"
      ? rawCollection.createdAt
      : new Date().toISOString();

  if (!id || !name) {
    return undefined;
  }

  return {
    id,
    name,
    createdAt,
    venueSlugs: sanitizeSlugList(rawCollection.venueSlugs),
  };
}

function sanitizeCollections(rawValue: unknown): VenueCollection[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const seenIds = new Set<string>();
  const output: VenueCollection[] = [];

  for (const item of rawValue) {
    const collection = sanitizeCollection(item);
    if (!collection || seenIds.has(collection.id)) {
      continue;
    }

    seenIds.add(collection.id);
    output.push(collection);
  }

  return output;
}

function readCollections(): VenueCollection[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeCollections(parsed);
  } catch {
    return [];
  }
}

function writeCollections(collections: VenueCollection[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = sanitizeCollections(collections);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent<CollectionsEventDetail>(COLLECTIONS_EVENT, {
      detail: { collections: normalized },
    })
  );
}

function createCollectionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function useCollections() {
  const [collections, setCollections] = useState<VenueCollection[]>(() => readCollections());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        setCollections([]);
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as unknown;
        setCollections(sanitizeCollections(parsed));
      } catch {
        setCollections([]);
      }
    };

    const handleCollectionsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<CollectionsEventDetail>;
      setCollections(sanitizeCollections(customEvent.detail?.collections));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(COLLECTIONS_EVENT, handleCollectionsUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(COLLECTIONS_EVENT, handleCollectionsUpdated);
    };
  }, []);

  const collectionsById = useMemo(() => {
    return collections.reduce<Record<string, VenueCollection>>((accumulator, collection) => {
      accumulator[collection.id] = collection;
      return accumulator;
    }, {});
  }, [collections]);

  const createCollection = useCallback((name: string, initialVenueSlug?: string) => {
    const nextName = name.trim();
    if (!nextName) {
      return undefined;
    }

    const nextCollection: VenueCollection = {
      id: createCollectionId(),
      name: nextName,
      createdAt: new Date().toISOString(),
      venueSlugs: initialVenueSlug ? [initialVenueSlug] : [],
    };

    setCollections((previous) => {
      const next = [nextCollection, ...previous];
      writeCollections(next);
      return next;
    });

    return nextCollection;
  }, []);

  const renameCollection = useCallback((id: string, name: string) => {
    const nextName = name.trim();
    if (!nextName) {
      return;
    }

    setCollections((previous) => {
      const next = previous.map((collection) =>
        collection.id === id ? { ...collection, name: nextName } : collection
      );
      writeCollections(next);
      return next;
    });
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections((previous) => {
      const next = previous.filter((collection) => collection.id !== id);
      writeCollections(next);
      return next;
    });
  }, []);

  const addVenueToCollection = useCallback((id: string, venueSlug: string) => {
    const normalizedSlug = venueSlug.trim();
    if (!normalizedSlug) {
      return;
    }

    setCollections((previous) => {
      const next = previous.map((collection) => {
        if (collection.id !== id || collection.venueSlugs.includes(normalizedSlug)) {
          return collection;
        }

        return {
          ...collection,
          venueSlugs: [...collection.venueSlugs, normalizedSlug],
        };
      });

      writeCollections(next);
      return next;
    });
  }, []);

  const removeVenueFromCollection = useCallback((id: string, venueSlug: string) => {
    setCollections((previous) => {
      const next = previous.map((collection) => {
        if (collection.id !== id) {
          return collection;
        }

        return {
          ...collection,
          venueSlugs: collection.venueSlugs.filter((slug) => slug !== venueSlug),
        };
      });

      writeCollections(next);
      return next;
    });
  }, []);

  const isVenueInCollection = useCallback(
    (collectionId: string, venueSlug: string) => {
      const collection = collectionsById[collectionId];
      return collection ? collection.venueSlugs.includes(venueSlug) : false;
    },
    [collectionsById]
  );

  const collectionsForVenue = useCallback(
    (venueSlug: string) => {
      return collections.filter((collection) => collection.venueSlugs.includes(venueSlug));
    },
    [collections]
  );

  return {
    collections,
    collectionsById,
    createCollection,
    renameCollection,
    deleteCollection,
    addVenueToCollection,
    removeVenueFromCollection,
    isVenueInCollection,
    collectionsForVenue,
  };
}
