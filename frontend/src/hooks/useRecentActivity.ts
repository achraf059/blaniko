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

type RecentActivityReadResult = { ok: true; items: RecentActivityItem[] } | { ok: false };

// Re-reads storage right before an explicit mutation (B04 D7): another tab may have
// tracked/removed/cleared activity since this tab last saw a storage event or
// same-tab CustomEvent. `ok: false` means the read itself failed (storage truly
// unknown), distinct from a confirmed-empty read.
function readCurrentRecentActivity(): RecentActivityReadResult {
  const result = tryReadStorageItem(STORAGE_KEY);
  if (!result.ok) {
    return { ok: false };
  }

  if (!result.value) {
    return { ok: true, items: [] };
  }

  try {
    return { ok: true, items: sanitizeRecentActivity(JSON.parse(result.value) as unknown) };
  } catch {
    return { ok: true, items: [] };
  }
}

function writeRecentActivity(items: RecentActivityItem[], persist = true): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const normalized = sanitizeRecentActivity(items);
  const success = persist ? writeStorageItem(STORAGE_KEY, JSON.stringify(normalized)) : true;
  window.dispatchEvent(
    new CustomEvent<RecentActivityEventDetail>(RECENT_ACTIVITY_EVENT, {
      detail: { items: normalized },
    })
  );
  return success;
}

// ── Pending-operation model (B04 D7 failure-recovery fix) ───────────────────────
//
// A boolean "my last write failed, ignore storage" flag is too coarse: it can't
// distinguish "storage still holds what it held before my failed write" from
// "another tab has since written something newer". Instead, every unpersisted user
// action is recorded as a small, replayable operation — a `track` op stores the
// FULLY RESOLVED item (including its timestamp, computed once at the original
// action) so replay never regenerates a new timestamp. Every mutation and every
// incoming event reconciles by replaying every still-pending op, in order, over the
// freshest known persisted base. Once a write succeeds, the pending queue clears.
type RecentActivityOp =
  | { type: "track"; item: RecentActivityItem }
  | { type: "remove"; key: string }
  // Captures the item keys that were visible at the moment of the clear, so
  // activity tracked by another tab *after* this clear was issued is not
  // retroactively erased once this pending clear eventually replays against a
  // newer base (see B04 D7 review: a later explicit clear must not silently
  // discard genuinely newer activity it never knew about).
  | { type: "clearKeys"; keys: string[] };

function applyRecentActivityOp(
  op: RecentActivityOp,
  base: RecentActivityItem[],
): RecentActivityItem[] {
  switch (op.type) {
    case "track": {
      const key = getActivityKey(op.item);
      return [op.item, ...base.filter((item) => getActivityKey(item) !== key)].slice(
        0,
        MAX_RECENT_ACTIVITY_ITEMS,
      );
    }
    case "remove":
      return base.filter((item) => getActivityKey(item) !== op.key);
    case "clearKeys":
      return base.filter((item) => !op.keys.includes(getActivityKey(item)));
  }
}

function replayRecentActivityOps(
  base: RecentActivityItem[],
  ops: RecentActivityOp[],
): RecentActivityItem[] {
  return ops.reduce((acc, op) => applyRecentActivityOp(op, acc), base);
}

export function useRecentActivity() {
  const [initialActivity] = useState(readRecentActivity);
  const [activities, setActivities] = useState<RecentActivityItem[]>(initialActivity.items);
  // Page views are tracked automatically on mount. After a failed read the stored
  // history is unknown, so tracking must not overwrite it; an explicit remove/clear
  // is a deliberate change and re-enables persistence.
  const suppressTrackPersistRef = useRef(initialActivity.readFailed);

  // Mirrors `activities`, updated synchronously (never inside a state updater) on
  // every mutation and every incoming same-tab/cross-tab event — same role as
  // `compareSlugsRef` in useCompare.ts.
  const activitiesRef = useRef(activities);
  // Operations applied in memory but not yet confirmed persisted (B04 D7). Cleared
  // the moment a write succeeds; replayed over the freshest known base otherwise.
  const pendingOpsRef = useRef<RecentActivityOp[]>([]);

  // Reconciles an incoming persisted/broadcast base against this tab's own
  // still-pending operations, rather than blindly replacing visible state — so an
  // unpersisted local action isn't discarded merely because an event arrived.
  const reconcileIncoming = useCallback((incomingBase: RecentActivityItem[]) => {
    const reconciled = replayRecentActivityOps(incomingBase, pendingOpsRef.current);
    activitiesRef.current = reconciled;
    setActivities(reconciled);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      let incomingBase: RecentActivityItem[] = [];
      if (event.newValue) {
        try {
          incomingBase = sanitizeRecentActivity(JSON.parse(event.newValue) as unknown);
        } catch {
          incomingBase = [];
        }
      }

      reconcileIncoming(incomingBase);
    };

    const handleRecentActivityUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<RecentActivityEventDetail>;
      reconcileIncoming(sanitizeRecentActivity(customEvent.detail?.items));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(RECENT_ACTIVITY_EVENT, handleRecentActivityUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(RECENT_ACTIVITY_EVENT, handleRecentActivityUpdated);
    };
  }, [reconcileIncoming]);

  const activityCount = activities.length;

  const activityByKey = useMemo(() => {
    return activities.reduce<Record<string, RecentActivityItem>>((accumulator, item) => {
      accumulator[getActivityKey(item)] = item;
      return accumulator;
    }, {});
  }, [activities]);

  // Re-reads storage fresh and replays any still-pending local operations over it.
  // A failed read means the true persisted base is currently unknown, so this falls
  // back to the already-reconciled `activitiesRef.current` (the same PR #240
  // tradeoff `readCurrentSavedOutings` documents).
  const readReconciledBase = useCallback((): RecentActivityItem[] => {
    const fresh = readCurrentRecentActivity();
    if (fresh.ok) {
      return replayRecentActivityOps(fresh.items, pendingOpsRef.current);
    }
    return activitiesRef.current;
  }, []);

  const trackActivity = useCallback((input: TrackRecentActivityInput) => {
    const normalizedInput = sanitizeRecentActivityItem({
      ...input,
      timestamp: new Date().toISOString(),
    });

    if (!normalizedInput) {
      return;
    }

    const persist = !suppressTrackPersistRef.current;
    // While persistence is suppressed (unknown initial read, no explicit action
    // yet), storage is never touched at all — matches the prior behavior exactly —
    // so there is nothing to reconcile against yet; use the ref directly.
    const current = persist ? readReconciledBase() : activitiesRef.current;

    const op: RecentActivityOp = { type: "track", item: normalizedInput };
    const next = applyRecentActivityOp(op, current);

    activitiesRef.current = next;
    setActivities(next);

    if (persist) {
      // Appended to the pending queue BEFORE writing — not after — because the
      // write synchronously dispatches the same-tab CustomEvent, which this same
      // hook instance also listens for; if the queue didn't already include `op`
      // at that moment, the self-received event would reconcile against stale
      // pending ops and clobber the state just set above. Every op here is
      // idempotent under double-application, so briefly re-applying this
      // instance's own already-applied op via that event is a harmless no-op.
      pendingOpsRef.current = [...pendingOpsRef.current, op];
      const success = writeRecentActivity(next, true);
      if (success) {
        pendingOpsRef.current = [];
      }
    } else {
      writeRecentActivity(next, false);
    }
  }, [readReconciledBase]);

  const removeActivity = useCallback((item: Pick<RecentActivityItem, "id" | "type">) => {
    suppressTrackPersistRef.current = false;

    const current = readReconciledBase();
    const op: RecentActivityOp = { type: "remove", key: getActivityKey(item) };
    const next = applyRecentActivityOp(op, current);

    activitiesRef.current = next;
    setActivities(next);
    pendingOpsRef.current = [...pendingOpsRef.current, op];
    const success = writeRecentActivity(next);
    if (success) {
      pendingOpsRef.current = [];
    }
  }, [readReconciledBase]);

  const clearActivities = useCallback(() => {
    suppressTrackPersistRef.current = false;

    const current = readReconciledBase();
    // Scoped to what was actually visible at the moment of the clear — activity
    // tracked by another tab afterward is not retroactively erased once this
    // pending clear eventually replays.
    const op: RecentActivityOp = { type: "clearKeys", keys: current.map(getActivityKey) };
    const next = applyRecentActivityOp(op, current);

    activitiesRef.current = next;
    setActivities(next);
    pendingOpsRef.current = [...pendingOpsRef.current, op];
    const success = writeRecentActivity(next);
    if (success) {
      pendingOpsRef.current = [];
    }
  }, [readReconciledBase]);

  return {
    activities,
    activityCount,
    activityByKey,
    trackActivity,
    removeActivity,
    clearActivities,
  };
}
