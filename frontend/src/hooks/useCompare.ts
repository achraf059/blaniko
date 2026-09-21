import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readStorageItem, tryReadStorageItem, writeStorageItem } from "../utils/safeStorage";

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

type CompareReadResult = { ok: true; slugs: string[] } | { ok: false };

// Re-reads storage right before an explicit mutation (B04 D8): another tab may have
// added/removed a compared venue since this tab last saw a storage event, so this
// tab's own `compareSlugsRef` can be stale. `ok: false` means the read itself failed
// (storage truly unknown), distinct from a confirmed-empty read; callers fall back to
// this tab's own current view in that case, per the same PR #240 tradeoff
// `readCurrentSavedOutings` documents.
function readCurrentCompareSlugs(): CompareReadResult {
  const result = tryReadStorageItem(STORAGE_KEY);
  if (!result.ok) {
    return { ok: false };
  }

  if (!result.value) {
    return { ok: true, slugs: [] };
  }

  try {
    return { ok: true, slugs: sanitizeCompareSlugs(JSON.parse(result.value) as unknown) };
  } catch {
    return { ok: true, slugs: [] };
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
function writeCompareSlugs(slugs: string[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const normalized = sanitizeCompareSlugs(slugs);
  const success = writeStorageItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent<CompareEventDetail>(COMPARE_EVENT, {
      detail: { slugs: normalized },
    })
  );
  return success;
}

// ── Pending-operation model (B04 D8 failure-recovery fix) ───────────────────────
//
// A ref that only mirrors this tab's own last-known state (as useCompare had before
// D8) cannot tell "storage still holds what it held when I last checked" apart from
// "another tab has since written something newer" — so a mutation computed purely
// from that ref can silently erase a concurrent tab's change. Instead, every
// unpersisted user action is recorded as a small, replayable operation — the
// RESOLVED intent at the moment the user acted ("add X" or "remove X", never a
// generic "toggle": replaying a toggle against a different external base could
// invert the wrong way). Every mutation and every incoming event reconciles by
// taking the freshest known persisted base and replaying every still-pending op
// over it, in order. Once a write succeeds, the pending queue — now fully
// represented by what was just persisted — clears. This lets a concurrent external
// write and this tab's own unpersisted action both survive.
type CompareOp = { type: "add"; slug: string } | { type: "remove"; slug: string };

function applyCompareOp(op: CompareOp, base: string[]): string[] {
  switch (op.type) {
    case "add":
      if (base.includes(op.slug)) {
        return base;
      }
      // Defensive re-check: if replaying against a fresher base that has since
      // filled up (another tab added items concurrently), this add is dropped
      // rather than exceeding the 3-item cap. The max-3 rule is a hard invariant,
      // not merely a UX suggestion enforced only at the original click.
      if (base.length >= MAX_COMPARE_ITEMS) {
        return base;
      }
      return [...base, op.slug];
    case "remove":
      return base.filter((slug) => slug !== op.slug);
  }
}

function replayCompareOps(base: string[], ops: CompareOp[]): string[] {
  return ops.reduce((acc, op) => applyCompareOp(op, acc), base);
}

export function useCompare() {
  const [compareSlugs, setCompareSlugs] = useState<string[]>(() => readCompareSlugs());

  // Mirrors `compareSlugs`, updated synchronously (never inside a state updater) on
  // every mutation and every incoming same-tab/cross-tab event. `compareSlugs` itself
  // only exists to trigger re-renders; mutations read and compute against a fresh
  // storage read (reconciled with any still-pending ops) instead, so the
  // {result, next state} pair is determined deterministically from the truly-current
  // persisted value — not a value React may not have applied yet, not a value
  // captured once in a stale closure, and not merely this tab's own last-known view.
  const compareSlugsRef = useRef(compareSlugs);
  // Operations applied in memory but not yet confirmed persisted (B04 D8). Cleared
  // the moment a write succeeds; replayed over the freshest known base otherwise.
  const pendingOpsRef = useRef<CompareOp[]>([]);

  // Reconciles an incoming persisted/broadcast base against this tab's own
  // still-pending operations, rather than blindly replacing visible state — so an
  // unpersisted local action isn't discarded merely because an event arrived.
  // Shared by both the native storage event and the same-tab CustomEvent below.
  const reconcileIncoming = useCallback((incomingBase: string[]) => {
    const reconciled = replayCompareOps(incomingBase, pendingOpsRef.current);
    compareSlugsRef.current = reconciled;
    setCompareSlugs(reconciled);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      let incomingBase: string[] = [];
      if (event.newValue) {
        try {
          incomingBase = sanitizeCompareSlugs(JSON.parse(event.newValue) as unknown);
        } catch {
          incomingBase = [];
        }
      }

      reconcileIncoming(incomingBase);
    };

    const handleCompareUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<CompareEventDetail>;
      reconcileIncoming(sanitizeCompareSlugs(customEvent.detail?.slugs));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(COMPARE_EVENT, handleCompareUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(COMPARE_EVENT, handleCompareUpdated);
    };
  }, [reconcileIncoming]);

  const compareSlugSet = useMemo(() => new Set(compareSlugs), [compareSlugs]);

  const isCompared = useCallback(
    (slug: string) => compareSlugSet.has(slug),
    [compareSlugSet]
  );

  // Re-reads storage fresh and replays any still-pending local operations over it —
  // the single source of truth every mutation below uses as its starting point. A
  // failed read means the true persisted base is currently unknown, so this falls
  // back to the already-reconciled `compareSlugsRef.current` (the same PR #240
  // tradeoff `readCurrentSavedOutings` documents: the action still proceeds against
  // the best information available).
  const readReconciledBase = useCallback((): string[] => {
    const fresh = readCurrentCompareSlugs();
    if (fresh.ok) {
      return replayCompareOps(fresh.slugs, pendingOpsRef.current);
    }
    return compareSlugsRef.current;
  }, []);

  // Applies `op` to `resolvedCurrent` (the result of `readReconciledBase()`), then
  // persists the result as a plain, synchronous step outside any updater — never
  // from inside `setCompareSlugs` — so it always runs exactly once per logical
  // mutation, including under StrictMode. `op` is appended to the pending queue
  // BEFORE calling `writeCompareSlugs` — not after — because that call
  // synchronously dispatches the same-tab CustomEvent, which this same hook
  // instance also listens for; if the queue didn't already include `op` at that
  // moment, the self-received event would reconcile against stale pending ops and
  // clobber the state just set above. Both op types are idempotent under
  // double-application, so this instance briefly re-applying its own already-
  // applied op via that event is a harmless no-op. On success the queue clears —
  // the just-written value fully represents everything that was pending.
  const commitCompareOp = useCallback((op: CompareOp, resolvedCurrent: string[]) => {
    const next = applyCompareOp(op, resolvedCurrent);
    compareSlugsRef.current = next;
    setCompareSlugs(next);
    pendingOpsRef.current = [...pendingOpsRef.current, op];
    const success = writeCompareSlugs(next);
    if (success) {
      pendingOpsRef.current = [];
    }
    return next;
  }, []);

  const addToCompare = useCallback((slug: string): "added" | "exists" | "limit" => {
    const normalized = slug.trim();
    if (!normalized) {
      return "exists";
    }

    const resolvedCurrent = readReconciledBase();

    if (resolvedCurrent.includes(normalized)) {
      return "exists";
    }

    if (resolvedCurrent.length >= MAX_COMPARE_ITEMS) {
      return "limit";
    }

    commitCompareOp({ type: "add", slug: normalized }, resolvedCurrent);
    return "added";
  }, [readReconciledBase, commitCompareOp]);

  const removeFromCompare = useCallback((slug: string) => {
    const resolvedCurrent = readReconciledBase();

    if (!resolvedCurrent.includes(slug)) {
      return;
    }

    commitCompareOp({ type: "remove", slug }, resolvedCurrent);
  }, [readReconciledBase, commitCompareOp]);

  const toggleCompare = useCallback((slug: string): "added" | "removed" | "limit" => {
    const normalized = slug.trim();
    if (!normalized) {
      return "limit";
    }

    // The resolved intent — add or remove — is captured NOW, against the current
    // reconciled view. It is never recorded as a generic "toggle": replaying a
    // toggle against a different (newer) external base could flip the wrong way.
    const resolvedCurrent = readReconciledBase();

    if (resolvedCurrent.includes(normalized)) {
      commitCompareOp({ type: "remove", slug: normalized }, resolvedCurrent);
      return "removed";
    }

    if (resolvedCurrent.length >= MAX_COMPARE_ITEMS) {
      return "limit";
    }

    commitCompareOp({ type: "add", slug: normalized }, resolvedCurrent);
    return "added";
  }, [readReconciledBase, commitCompareOp]);

  const clearCompare = useCallback(() => {
    // Unconditional, like the pre-D8 behavior: clearing doesn't depend on current
    // state, so no fresh read is needed. Also discards any not-yet-persisted
    // pending ops — a clear supersedes them.
    compareSlugsRef.current = [];
    pendingOpsRef.current = [];
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
