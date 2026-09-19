import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readStorageItem, writeStorageItem } from "../utils/safeStorage";

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

  const raw = readStorageItem(STORAGE_KEY);
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

// Persists `slugs` and notifies every other same-tab `useCompare()` instance (via the
// custom event) and every other tab (via the native storage event). Never call this
// from inside a state updater: it has side effects (a localStorage write and an event
// dispatch), and React does not guarantee an updater function runs exactly once for a
// given call — the eager-state optimization can skip it entirely when a call is queued
// behind a pending update, and StrictMode deliberately invokes it twice in development
// to surface exactly this class of bug. Called as a plain, synchronous step outside any
// updater, it always runs exactly once per logical mutation.
function writeCompareSlugs(slugs: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = sanitizeCompareSlugs(slugs);
  writeStorageItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent<CompareEventDetail>(COMPARE_EVENT, {
      detail: { slugs: normalized },
    })
  );
}

export function useCompare() {
  const [compareSlugs, setCompareSlugs] = useState<string[]>(() => readCompareSlugs());

  // Mirrors `compareSlugs`, updated synchronously (never inside a state updater) on
  // every mutation and every incoming same-tab/cross-tab event. `compareSlugs` itself
  // only exists to trigger re-renders; every mutation below reads and computes against
  // this ref instead, so the {result, next state} pair is determined deterministically
  // from the truly-current value — not a value React may not have applied yet, and not
  // a value captured once in a stale closure — even if two mutations happen in the same
  // tick, before React has re-rendered between them.
  const compareSlugsRef = useRef(compareSlugs);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      let next: string[] = [];
      if (event.newValue) {
        try {
          next = sanitizeCompareSlugs(JSON.parse(event.newValue) as unknown);
        } catch {
          next = [];
        }
      }

      compareSlugsRef.current = next;
      setCompareSlugs(next);
    };

    const handleCompareUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<CompareEventDetail>;
      const next = sanitizeCompareSlugs(customEvent.detail?.slugs);
      compareSlugsRef.current = next;
      setCompareSlugs(next);
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

    const current = compareSlugsRef.current;

    if (current.includes(normalized)) {
      return "exists";
    }

    if (current.length >= MAX_COMPARE_ITEMS) {
      return "limit";
    }

    const next = [...current, normalized];
    compareSlugsRef.current = next;
    writeCompareSlugs(next);
    setCompareSlugs(next);
    return "added";
  }, []);

  const removeFromCompare = useCallback((slug: string) => {
    const current = compareSlugsRef.current;
    const next = current.filter((item) => item !== slug);

    if (next.length === current.length) {
      return;
    }

    compareSlugsRef.current = next;
    writeCompareSlugs(next);
    setCompareSlugs(next);
  }, []);

  const toggleCompare = useCallback((slug: string): "added" | "removed" | "limit" => {
    const normalized = slug.trim();
    if (!normalized) {
      return "limit";
    }

    const current = compareSlugsRef.current;

    if (current.includes(normalized)) {
      const next = current.filter((item) => item !== normalized);
      compareSlugsRef.current = next;
      writeCompareSlugs(next);
      setCompareSlugs(next);
      return "removed";
    }

    if (current.length >= MAX_COMPARE_ITEMS) {
      return "limit";
    }

    const next = [...current, normalized];
    compareSlugsRef.current = next;
    writeCompareSlugs(next);
    setCompareSlugs(next);
    return "added";
  }, []);

  const clearCompare = useCallback(() => {
    compareSlugsRef.current = [];
    writeCompareSlugs([]);
    setCompareSlugs([]);
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
