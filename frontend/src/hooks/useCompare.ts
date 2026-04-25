import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "blaniko:compare:v1";
const COMPARE_EVENT = "blaniko:compare-updated";
const MAX_COMPARE_ITEMS = 3;

type CompareEventDetail = {
  slugs: string[];
};

function sanitizeCompareSlugs(rawValue: unknown): string[] {
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

  return [...unique].slice(0, MAX_COMPARE_ITEMS);
}

function readCompareSlugs(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeCompareSlugs(parsed);
  } catch {
    return [];
  }
}

function writeCompareSlugs(slugs: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = sanitizeCompareSlugs(slugs);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent<CompareEventDetail>(COMPARE_EVENT, {
      detail: { slugs: normalized },
    })
  );
}

export function useCompare() {
  const [compareSlugs, setCompareSlugs] = useState<string[]>(() => readCompareSlugs());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        setCompareSlugs([]);
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as unknown;
        setCompareSlugs(sanitizeCompareSlugs(parsed));
      } catch {
        setCompareSlugs([]);
      }
    };

    const handleCompareUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<CompareEventDetail>;
      setCompareSlugs(sanitizeCompareSlugs(customEvent.detail?.slugs));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(COMPARE_EVENT, handleCompareUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(COMPARE_EVENT, handleCompareUpdated);
    };
  }, []);

  const compareSlugSet = useMemo(() => new Set(compareSlugs), [compareSlugs]);

  const isCompared = useCallback(
    (slug: string) => compareSlugSet.has(slug),
    [compareSlugSet]
  );

  const addToCompare = useCallback((slug: string): "added" | "exists" | "limit" => {
    const normalized = slug.trim();
    if (!normalized) {
      return "exists";
    }

    let result: "added" | "exists" | "limit" = "exists";

    setCompareSlugs((previous) => {
      if (previous.includes(normalized)) {
        result = "exists";
        return previous;
      }

      if (previous.length >= MAX_COMPARE_ITEMS) {
        result = "limit";
        return previous;
      }

      const next = [...previous, normalized];
      writeCompareSlugs(next);
      result = "added";
      return next;
    });

    return result;
  }, []);

  const removeFromCompare = useCallback((slug: string) => {
    setCompareSlugs((previous) => {
      const next = previous.filter((item) => item !== slug);
      if (next.length === previous.length) {
        return previous;
      }

      writeCompareSlugs(next);
      return next;
    });
  }, []);

  const toggleCompare = useCallback((slug: string): "added" | "removed" | "limit" => {
    const normalized = slug.trim();
    if (!normalized) {
      return "limit";
    }

    let result: "added" | "removed" | "limit" = "limit";

    setCompareSlugs((previous) => {
      if (previous.includes(normalized)) {
        const next = previous.filter((item) => item !== normalized);
        writeCompareSlugs(next);
        result = "removed";
        return next;
      }

      if (previous.length >= MAX_COMPARE_ITEMS) {
        result = "limit";
        return previous;
      }

      const next = [...previous, normalized];
      writeCompareSlugs(next);
      result = "added";
      return next;
    });

    return result;
  }, []);

  const clearCompare = useCallback(() => {
    setCompareSlugs([]);
    writeCompareSlugs([]);
  }, []);

  return {
    compareSlugs,
    compareCount: compareSlugs.length,
    maxCompareItems: MAX_COMPARE_ITEMS,
    isCompared,
    addToCompare,
    removeFromCompare,
    toggleCompare,
    clearCompare,
  };
}
