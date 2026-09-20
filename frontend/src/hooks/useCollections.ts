import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readStorageItem, tryReadStorageItem, writeStorageItem } from "../utils/safeStorage";

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

  const raw = readStorageItem(STORAGE_KEY);
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

type CollectionsReadResult = { ok: true; collections: VenueCollection[] } | { ok: false };

// Re-reads storage right before an explicit mutation (B04 D7): another tab may have
// created/renamed/deleted a collection or changed venue membership since this tab
// last saw a storage event or same-tab CustomEvent. `ok: false` means the read
// itself failed (storage truly unknown), distinct from a confirmed-empty read.
function readCurrentCollections(): CollectionsReadResult {
  const result = tryReadStorageItem(STORAGE_KEY);
  if (!result.ok) {
    return { ok: false };
  }

  if (!result.value) {
    return { ok: true, collections: [] };
  }

  try {
    return { ok: true, collections: sanitizeCollections(JSON.parse(result.value) as unknown) };
  } catch {
    return { ok: true, collections: [] };
  }
}

function writeCollections(collections: VenueCollection[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const normalized = sanitizeCollections(collections);
  const success = writeStorageItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent<CollectionsEventDetail>(COLLECTIONS_EVENT, {
      detail: { collections: normalized },
    })
  );
  return success;
}

function createCollectionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

// ── Pending-operation model (B04 D7 failure-recovery fix) ───────────────────────
//
// A boolean "my last write failed, ignore storage" flag is too coarse: it can't
// distinguish "storage still holds what it held before my failed write" from
// "another tab has since written something newer" — so it either always ignores
// storage (losing other tabs' concurrent writes) or always trusts it (losing this
// tab's own unpersisted action). Instead, every unpersisted user action is recorded
// as a small, replayable operation. Every mutation and every incoming event
// reconciles by replaying every still-pending op, in order, over the freshest known
// persisted base. Once a write succeeds, the pending queue clears.
type CollectionsOp =
  | { type: "create"; collection: VenueCollection } // id/createdAt generated ONCE at the original action, never regenerated on replay
  | { type: "rename"; id: string; name: string }
  | { type: "delete"; id: string }
  | { type: "addVenue"; id: string; slug: string }
  | { type: "removeVenue"; id: string; slug: string };

function applyCollectionsOp(op: CollectionsOp, base: VenueCollection[]): VenueCollection[] {
  switch (op.type) {
    case "create":
      // Idempotent: if this exact collection is already present (e.g. this op's own
      // earlier write actually landed despite reporting failure), don't duplicate it.
      return base.some((c) => c.id === op.collection.id) ? base : [op.collection, ...base];
    case "rename":
      // If the target collection no longer exists (deleted by another tab), this is
      // a safe no-op — it does not resurrect the deleted collection.
      return base.map((c) => (c.id === op.id ? { ...c, name: op.name } : c));
    case "delete":
      return base.filter((c) => c.id !== op.id);
    case "addVenue":
      // Same no-op-if-missing safety as rename.
      return base.map((c) =>
        c.id === op.id && !c.venueSlugs.includes(op.slug)
          ? { ...c, venueSlugs: [...c.venueSlugs, op.slug] }
          : c
      );
    case "removeVenue":
      return base.map((c) =>
        c.id === op.id ? { ...c, venueSlugs: c.venueSlugs.filter((slug) => slug !== op.slug) } : c
      );
  }
}

function replayCollectionsOps(base: VenueCollection[], ops: CollectionsOp[]): VenueCollection[] {
  return ops.reduce((acc, op) => applyCollectionsOp(op, acc), base);
}

export function useCollections() {
  const [collections, setCollections] = useState<VenueCollection[]>(() => readCollections());

  // Mirrors `collections`, updated synchronously (never inside a state updater) on
  // every mutation and every incoming same-tab/cross-tab event — same role as
  // `compareSlugsRef` in useCompare.ts.
  const collectionsRef = useRef(collections);
  // Operations applied in memory but not yet confirmed persisted (B04 D7). Cleared
  // the moment a write succeeds; replayed over the freshest known base otherwise.
  const pendingOpsRef = useRef<CollectionsOp[]>([]);

  // Reconciles an incoming persisted/broadcast base against this tab's own
  // still-pending operations, rather than blindly replacing visible state — so an
  // unpersisted local action isn't discarded merely because an event arrived.
  // Shared by both the native storage event and the same-tab CustomEvent below.
  const reconcileIncoming = useCallback((incomingBase: VenueCollection[]) => {
    const reconciled = replayCollectionsOps(incomingBase, pendingOpsRef.current);
    collectionsRef.current = reconciled;
    setCollections(reconciled);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      let incomingBase: VenueCollection[] = [];
      if (event.newValue) {
        try {
          incomingBase = sanitizeCollections(JSON.parse(event.newValue) as unknown);
        } catch {
          incomingBase = [];
        }
      }

      reconcileIncoming(incomingBase);
    };

    const handleCollectionsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<CollectionsEventDetail>;
      reconcileIncoming(sanitizeCollections(customEvent.detail?.collections));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(COLLECTIONS_EVENT, handleCollectionsUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(COLLECTIONS_EVENT, handleCollectionsUpdated);
    };
  }, [reconcileIncoming]);

  const collectionsById = useMemo(() => {
    return collections.reduce<Record<string, VenueCollection>>((accumulator, collection) => {
      accumulator[collection.id] = collection;
      return accumulator;
    }, {});
  }, [collections]);

  // Re-reads storage fresh and replays any still-pending local operations over it —
  // the single source of truth every mutation below uses as its starting point. A
  // failed read means the true persisted base is currently unknown, so this falls
  // back to the already-reconciled `collectionsRef.current` (the same PR #240
  // tradeoff `readCurrentSavedOutings` documents).
  const readReconciledBase = useCallback((): VenueCollection[] => {
    const fresh = readCurrentCollections();
    if (fresh.ok) {
      return replayCollectionsOps(fresh.collections, pendingOpsRef.current);
    }
    return collectionsRef.current;
  }, []);

  // Applies `op` to `resolvedCurrent`, then persists the result as a plain,
  // synchronous step outside any updater (so it runs exactly once per logical
  // mutation, including under StrictMode). `op` is appended to the pending queue
  // BEFORE calling `writeCollections` — not after — because that call synchronously
  // dispatches the same-tab CustomEvent, which this same hook instance also
  // listens for; if the queue didn't already include `op` at that moment, the
  // self-received event would reconcile against stale pending ops and clobber the
  // state just set above. Every op here is idempotent under double-application, so
  // this instance briefly re-applying its own already-applied op via that event is
  // a harmless no-op, not a correctness issue. On success the queue clears — the
  // just-written value fully represents everything that was pending.
  const persistAndSync = useCallback((op: CollectionsOp, resolvedCurrent: VenueCollection[]) => {
    const next = applyCollectionsOp(op, resolvedCurrent);
    collectionsRef.current = next;
    setCollections(next);
    pendingOpsRef.current = [...pendingOpsRef.current, op];
    const success = writeCollections(next);
    if (success) {
      pendingOpsRef.current = [];
    }
  }, []);

  const createCollection = useCallback((name: string, initialVenueSlug?: string) => {
    const nextName = name.trim();
    if (!nextName) {
      return undefined;
    }

    // Generated once, here, at the original action — never regenerated on replay.
    const nextCollection: VenueCollection = {
      id: createCollectionId(),
      name: nextName,
      createdAt: new Date().toISOString(),
      venueSlugs: initialVenueSlug ? [initialVenueSlug] : [],
    };

    const current = readReconciledBase();
    persistAndSync({ type: "create", collection: nextCollection }, current);

    return nextCollection;
  }, [readReconciledBase, persistAndSync]);

  const renameCollection = useCallback((id: string, name: string) => {
    const nextName = name.trim();
    if (!nextName) {
      return;
    }

    const current = readReconciledBase();
    persistAndSync({ type: "rename", id, name: nextName }, current);
  }, [readReconciledBase, persistAndSync]);

  const deleteCollection = useCallback((id: string) => {
    const current = readReconciledBase();
    persistAndSync({ type: "delete", id }, current);
  }, [readReconciledBase, persistAndSync]);

  const addVenueToCollection = useCallback((id: string, venueSlug: string) => {
    const normalizedSlug = venueSlug.trim();
    if (!normalizedSlug) {
      return;
    }

    const current = readReconciledBase();
    persistAndSync({ type: "addVenue", id, slug: normalizedSlug }, current);
  }, [readReconciledBase, persistAndSync]);

  const removeVenueFromCollection = useCallback((id: string, venueSlug: string) => {
    const current = readReconciledBase();
    persistAndSync({ type: "removeVenue", id, slug: venueSlug }, current);
  }, [readReconciledBase, persistAndSync]);

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
