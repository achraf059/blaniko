// Browser persistence is optional. Reading `window.localStorage` itself can throw
// (SecurityError when site data is blocked, sandboxed iframes), and getItem/setItem/
// removeItem can throw (QuotaExceededError, SecurityError). These helpers keep that
// access inside the guarded path so a storage failure degrades to "nothing stored" /
// "not persisted" instead of crashing a provider or route.
//
// Only the storage call is guarded — callers still own parsing and validation, so
// application errors (e.g. in JSON handling or state logic) are not swallowed here.

// A failed read is not the same as an absent key: after a failed read the stored
// value is unknown, so callers must not automatically overwrite it with a fallback.
export type StorageReadResult = { ok: true; value: string | null } | { ok: false };

export function tryReadStorageItem(key: string): StorageReadResult {
  if (typeof window === "undefined") {
    return { ok: false };
  }

  try {
    return { ok: true, value: window.localStorage.getItem(key) };
  } catch {
    return { ok: false };
  }
}

export function readStorageItem(key: string): string | null {
  const result = tryReadStorageItem(key);
  return result.ok ? result.value : null;
}

export function writeStorageItem(key: string, value: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
