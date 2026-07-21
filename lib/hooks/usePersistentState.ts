"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

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
    setHydrated(true);
  }, [storageKey]);

  // Persist on every change, but ONLY after the load effect has run. Gating on
  // the `hydrated` STATE (not a ref) is deliberate: a remount — e.g. a locale
  // switch re-mounts the whole [locale] subtree — brings `state` back to the
  // initial value, and this effect fires in the same commit as the load effect.
  // A ref flipped inside the load effect is already true by then, so this write
  // would clobber the stored value with the initial one before the restored
  // state commits. `hydrated` stays false for the entire mount commit, so the
  // first write can never overwrite saved data.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Quota/availability errors are non-fatal — the form still works.
    }
  }, [storageKey, state, hydrated]);

  return [state, setState, hydrated];
}
