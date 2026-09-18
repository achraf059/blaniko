import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

// Shared helpers for DOM tests that exercise browser-storage failure paths.
// Test files opt into the DOM with `// @vitest-environment jsdom`.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// "access"  — reading `window.localStorage` itself throws (site data blocked).
// "read"    — getItem throws.
// "write"   — setItem throws QuotaExceededError.
// "remove"  — removeItem throws.
export type StorageFailure = "none" | "access" | "read" | "write" | "remove";

export class ControllableStorage implements Storage {
  failure: StorageFailure = "none";
  private items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    if (this.failure === "read") {
      throw new DOMException("The operation is insecure.", "SecurityError");
    }
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failure === "write") {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    }
    this.items.set(key, String(value));
  }

  removeItem(key: string): void {
    if (this.failure === "remove") {
      throw new DOMException("The operation is insecure.", "SecurityError");
    }
    this.items.delete(key);
  }

  clear(): void {
    this.items.clear();
  }

  // Test-only accessors that bypass the simulated failure.
  seed(key: string, value: string): void {
    this.items.set(key, value);
  }

  peek(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  reset(): void {
    this.items.clear();
    this.failure = "none";
  }
}

// Replaces window.localStorage with a controllable double. In "access" mode the
// property getter itself throws, as browsers do when site data is blocked.
export function installControllableStorage(): ControllableStorage {
  const storage = new ControllableStorage();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      if (storage.failure === "access") {
        throw new DOMException("The operation is insecure.", "SecurityError");
      }
      return storage;
    },
  });
  return storage;
}

const mountedRoots: Array<{ root: Root; container: HTMLElement }> = [];

export function renderIntoDocument(ui: ReactElement): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  mountedRoots.push({ root, container });
  return container;
}

export function cleanupRendered(): void {
  for (const { root, container } of mountedRoots.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
}

export function click(element: Element | null | undefined): void {
  if (!element) {
    throw new Error("click(): element not found");
  }
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

export function findButtonByText(root: ParentNode, text: string): HTMLButtonElement | undefined {
  return [...root.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === text,
  );
}

// Lets pending promises (e.g. a mocked fetch) settle inside act().
export async function flushAsync(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
