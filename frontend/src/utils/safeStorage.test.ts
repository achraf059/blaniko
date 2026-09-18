// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  readStorageItem,
  removeStorageItem,
  tryReadStorageItem,
  writeStorageItem,
} from "./safeStorage";
import { installControllableStorage } from "../test/storageTestUtils";

const storage = installControllableStorage();

beforeEach(() => {
  storage.reset();
});

describe("safeStorage — normal storage", () => {
  it("reads a stored value and returns null for a missing key", () => {
    storage.seed("k", "v");
    expect(readStorageItem("k")).toBe("v");
    expect(readStorageItem("missing")).toBeNull();
  });

  it("writes a value and reports success", () => {
    expect(writeStorageItem("k", "v")).toBe(true);
    expect(storage.peek("k")).toBe("v");
  });

  it("removes only the requested key and reports success", () => {
    storage.seed("k", "v");
    storage.seed("other", "keep");
    expect(removeStorageItem("k")).toBe(true);
    expect(storage.peek("k")).toBeNull();
    expect(storage.peek("other")).toBe("keep");
  });

  it("returns the raw stored string without parsing it (callers own validation)", () => {
    storage.seed("k", "{not json");
    expect(readStorageItem("k")).toBe("{not json");
  });
});

describe("safeStorage — storage failures", () => {
  it("accessing window.localStorage throws SecurityError → read null, write/remove false", () => {
    storage.seed("k", "v");
    storage.failure = "access";
    expect(() => window.localStorage).toThrow(DOMException);
    expect(readStorageItem("k")).toBeNull();
    expect(writeStorageItem("k", "x")).toBe(false);
    expect(removeStorageItem("k")).toBe(false);
    storage.failure = "none";
    expect(storage.peek("k")).toBe("v");
  });

  it("getItem throws → null", () => {
    storage.seed("k", "v");
    storage.failure = "read";
    expect(readStorageItem("k")).toBeNull();
  });

  it("setItem throws QuotaExceededError → false, stored value unchanged", () => {
    storage.seed("k", "old");
    storage.failure = "write";
    expect(writeStorageItem("k", "new")).toBe(false);
    expect(storage.peek("k")).toBe("old");
  });

  it("removeItem throws → false, stored value unchanged", () => {
    storage.seed("k", "v");
    storage.failure = "remove";
    expect(removeStorageItem("k")).toBe(false);
    expect(storage.peek("k")).toBe("v");
  });
});

describe("tryReadStorageItem — distinguishes an absent key from a failed read", () => {
  it("reports a successful read, including an absent key", () => {
    storage.seed("k", "v");
    expect(tryReadStorageItem("k")).toEqual({ ok: true, value: "v" });
    expect(tryReadStorageItem("missing")).toEqual({ ok: true, value: null });
  });

  it("reports a failed read when getItem throws or storage access throws", () => {
    storage.seed("k", "v");
    storage.failure = "read";
    expect(tryReadStorageItem("k")).toEqual({ ok: false });
    storage.failure = "access";
    expect(tryReadStorageItem("k")).toEqual({ ok: false });
  });
});
