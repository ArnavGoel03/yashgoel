"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Read a value that only exists in the browser: localStorage, the clock,
 * `window`, a capability check.
 *
 * The pattern these replace was `useState(fallback)` plus a `useEffect`
 * that set the real value on mount. That renders every one of these
 * components twice on load, and it is what
 * `react-hooks/set-state-in-effect` was reporting nineteen times across
 * this codebase. `useSyncExternalStore` gets the same value in a single
 * pass and makes the server-render value explicit instead of leaving it
 * as whatever `useState` happened to be seeded with.
 *
 * `read` must return a primitive or a cached reference. A fresh object
 * on every call makes React re-render without end.
 */

const NEVER_CHANGES = () => () => {};

export function useClientValue<T>(read: () => T, serverValue: T): T {
  const server = useCallback(() => serverValue, [serverValue]);
  return useSyncExternalStore(NEVER_CHANGES, read, server);
}
