import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tryReadStorageItem, writeStorageItem } from "../utils/safeStorage";

const STORAGE_KEY = "blaniko:recent-activity:v1";
const RECENT_ACTIVITY_EVENT = "blaniko:recent-activity-updated";
const MAX_RECENT_ACTIVITY_ITEMS = 18;

export type RecentActivityType = "venue" | "guide" | "area" | "outing";

export type RecentActivityItem = {
  id: string;
  type: RecentActivityType;
  title: string;
  href: string;
  timestamp: string;
};

type TrackRecentActivityInput = {
  id: string;
  type: RecentActivityType;
  title: string;
  href: string;
};

type RecentActivityEventDetail = {
  items: RecentActivityItem[];
};

function getActivityKey(item: Pick<RecentActivityItem, "id" | "type">): string {
  return `${item.type}:${item.id}`;
}

function sanitizeRecentActivityType(value: unknown): RecentActivityType | undefined {
  if (value === "venue" || value === "guide" || value === "area" || value === "outing") {
    return value;
  }

  return undefined;
}

function sanitizeRecentActivityItem(rawValue: unknown): RecentActivityItem | undefined {
  if (!rawValue || typeof rawValue !== "object") {
    return undefined;
  }

  const rawItem = rawValue as Record<string, unknown>;
  const id = typeof rawItem.id === "string" ? rawItem.id.trim() : "";
  const type = sanitizeRecentActivityType(rawItem.type);
  const title = typeof rawItem.title === "string" ? rawItem.title.trim() : "";
  const href = typeof rawItem.href === "string" ? rawItem.href.trim() : "";
  const timestamp =
    typeof rawItem.timestamp === "string" ? rawItem.timestamp : new Date().toISOString();

  if (!id || !type || !title || !href) {
    return undefined;
  }

  return {
    id,
    type,
    title,
    href,
    timestamp,
  };
}

function sanitizeRecentActivity(rawValue: unknown): RecentActivityItem[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const unique = new Map<string, RecentActivityItem>();

  for (const item of rawValue) {
    const activity = sanitizeRecentActivityItem(item);
    if (!activity) {
      continue;
    }

    const key = getActivityKey(activity);
    if (unique.has(key)) {
      continue;
    }

    unique.set(key, activity);
  }

  return [...unique.values()].slice(0, MAX_RECENT_ACTIVITY_ITEMS);
}

// `readFailed` means the stored history is unknown (storage could not be read).
function readRecentActivity(): { items: RecentActivityItem[]; readFailed: boolean } {
  if (typeof window === "undefined") {
    return { items: [], readFailed: false };
  }

  const result = tryReadStorageItem(STORAGE_KEY);
  if (!result.ok) {
    return { items: [], readFailed: true };
  }

  if (!result.value) {
    return { items: [], readFailed: false };
  }

  try {
    const parsed = JSON.parse(result.value) as unknown;
    return { items: sanitizeRecentActivity(parsed), readFailed: false };
  } catch {
    return { items: [], readFailed: false };
  }
}

function writeRecentActivity(items: RecentActivityItem[], persist = true): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = sanitizeRecentActivity(items);
  if (persist) {
    writeStorageItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  window.dispatchEvent(
    new CustomEvent<RecentActivityEventDetail>(RECENT_ACTIVITY_EVENT, {
      detail: { items: normalized },
    })
  );
}

export function useRecentActivity() {
  const [initialActivity] = useState(readRecentActivity);
  const [activities, setActivities] = useState<RecentActivityItem[]>(initialActivity.items);
  // Page views are tracked automatically on mount. After a failed read the stored
  // history is unknown, so tracking must not overwrite it; an explicit remove/clear
  // is a deliberate change and re-enables persistence.
  const suppressTrackPersistRef = useRef(initialActivity.readFailed);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        setActivities([]);
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as unknown;
        setActivities(sanitizeRecentActivity(parsed));
      } catch {
        setActivities([]);
      }
    };

    const handleRecentActivityUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<RecentActivityEventDetail>;
      setActivities(sanitizeRecentActivity(customEvent.detail?.items));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(RECENT_ACTIVITY_EVENT, handleRecentActivityUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(RECENT_ACTIVITY_EVENT, handleRecentActivityUpdated);
    };
  }, []);

  const activityCount = activities.length;

  const activityByKey = useMemo(() => {
    return activities.reduce<Record<string, RecentActivityItem>>((accumulator, item) => {
      accumulator[getActivityKey(item)] = item;
      return accumulator;
    }, {});
  }, [activities]);

  const trackActivity = useCallback((input: TrackRecentActivityInput) => {
    const normalizedInput = sanitizeRecentActivityItem({
      ...input,
      timestamp: new Date().toISOString(),
    });

    if (!normalizedInput) {
      return;
    }

    const persist = !suppressTrackPersistRef.current;
    setActivities((previous) => {
      const previousItems = sanitizeRecentActivity(previous);
      const next = [
        normalizedInput,
        ...previousItems.filter((item) => getActivityKey(item) !== getActivityKey(normalizedInput)),
      ].slice(0, MAX_RECENT_ACTIVITY_ITEMS);
      writeRecentActivity(next, persist);
      return next;
    });
  }, []);

  const removeActivity = useCallback((item: Pick<RecentActivityItem, "id" | "type">) => {
    suppressTrackPersistRef.current = false;
    setActivities((previous) => {
      const next = previous.filter((entry) => getActivityKey(entry) !== getActivityKey(item));
      writeRecentActivity(next);
      return next;
    });
  }, []);

  const clearActivities = useCallback(() => {
    suppressTrackPersistRef.current = false;
    setActivities([]);
    writeRecentActivity([]);
  }, []);

  return {
    activities,
    activityCount,
    activityByKey,
    trackActivity,
    removeActivity,
    clearActivities,
  };
}
