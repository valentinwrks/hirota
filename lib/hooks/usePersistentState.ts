"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

// A drop-in replacement for `useState` that persists the value to localStorage
// and restores it on mount. Used by the configurators (custom/standard gi, obi)
// so a half-filled form survives a reload, a locale switch, or navigating away
// and back — all three are just component remounts, so reloading the saved state
// on mount covers every case. Mirrors the CartProvider persistence pattern
// (load-once effect + a loaded guard so the initial render never clobbers the
// stored value; no lazy initializer, to avoid a server/client hydration mismatch).
//
// The stored object is shallow-merged over the initial value, so adding a new
// field to the state shape later still gets its default (old saved payloads just
// lack that key). The initial value is only read on the very first render.
export function usePersistentState<T extends object>(
  storageKey: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [state, setState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  // Guard so the persist effect doesn't write the initial value back over
  // storage before the load effect has had a chance to read it.
  const loadedRef = useRef(false);

  // Restore once on mount. Deliberately a mount effect, not a lazy useState
  // initializer: these run in server-rendered client components, and reading
  // localStorage during the first render would diverge from the server HTML and
  // trip a hydration mismatch. Restoring in an effect (post-hydration) is the
  // same approach CartProvider uses.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time hydration-safe restore from localStorage
          setState((prev) => ({ ...prev, ...(parsed as Partial<T>) }));
        }
      }
    } catch {
      // Corrupt/unavailable storage → keep the initial value.
    }
    loadedRef.current = true;
    setHydrated(true);
  }, [storageKey]);

  // Persist on every change, after the initial load.
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Quota/availability errors are non-fatal — the form still works.
    }
  }, [storageKey, state]);

  return [state, setState, hydrated];
}
