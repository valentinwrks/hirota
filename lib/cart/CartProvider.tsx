"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type CartItem,
  type SimpleVariantGroup,
  cartSubtotalJpy,
} from "./types";
import { GI_THREAD_COLORS } from "@/lib/gi-standard/model";
import { OBI_THREAD_COLORS } from "@/lib/obi/model";

// Guest-only cart with localStorage persistence (no accounts, no cross-device
// sync — AGENTS §2). Survives reloads. Happy path only.

// A simple-item add payload may carry `offeredGroups`: the variant groups the
// product offers (size/color). It's used only to validate that a required value
// was chosen, then stripped before the line is stored on the cart.
type AddSimpleInput = Omit<
  Extract<CartItem, { kind: "simple" }>,
  "lineId" | "quantity"
> & {
  quantity?: number;
  offeredGroups?: SimpleVariantGroup[];
};

type AddInput =
  | AddSimpleInput
  | (Omit<Extract<CartItem, { kind: "configured" }>, "lineId" | "quantity"> & {
      quantity?: number;
    });

type CartContextValue = {
  items: CartItem[];
  addItem: (input: AddInput) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
  count: number;
  subtotalJpy: number;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "hirota:cart";

function makeLineId(): string {
  // Stable-enough unique id; crypto when available, else timestamp+random.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** For simple items, merge identical product+size+color lines by bumping qty. */
function sameSimpleLine(a: CartItem, b: Extract<CartItem, { kind: "simple" }>) {
  return (
    a.kind === "simple" &&
    a.productId === b.productId &&
    a.size === b.size &&
    a.color === b.color
  );
}

// A stored cart outlives the catalog it was built from: localStorage persists
// across deploys, so a line can name an option value that a later build retired
// (e.g. the gi embroidery palette dropped white/golden brown/silver grey when it
// was corrected to black/red/gold/silver). A retired `threadColorKey` has no
// i18n message, and the lookup throws inside the cart column — which is rendered
// by the store layout, so one stale line takes down every page.
//
// Thread colour is a pure fulfilment detail: the engine prices by thread
// CATEGORY (`config.embroidery[].thread`), which is untouched here, so dropping
// the colour never changes a stored price. Losing it degrades the line to "no
// colour recorded" instead of crashing the store.
function sanitizeStoredItem(item: CartItem): CartItem {
  if (item.kind !== "configured") return item;

  const known: readonly string[] =
    item.config.kind === "obi" ? OBI_THREAD_COLORS : GI_THREAD_COLORS;
  const { threadColorKey } = item.config.summary;
  if (threadColorKey == null || known.includes(threadColorKey)) return item;

  const { threadColorKey: _retired, ...summary } = item.config.summary;
  return {
    ...item,
    config: { ...item.config, summary } as typeof item.config,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time hydration-safe restore from localStorage
          setItems((parsed as CartItem[]).map(sanitizeStoredItem));
        }
      }
    } catch {
      // Corrupt storage → start empty.
    }
    setHydrated(true);
  }, []);

  // Persist on change — but ONLY after the load effect has run. This gates on
  // the `hydrated` STATE, not a ref, and that distinction is the whole fix for
  // the "cart empties on language switch" bug: switching locale re-mounts the
  // entire [locale] subtree, so this provider remounts with `items` back at [].
  // On that mount both effects fire in the same commit; a ref flipped inside the
  // load effect is already true by the time this one runs, so it would write the
  // empty [] over the stored cart before the loaded items commit. `hydrated`
  // stays false for the whole mount commit and only turns true once the loaded
  // state is applied, so this write can never clobber storage with an empty cart.
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((input: AddInput) => {
    const quantity = input.quantity ?? 1;

    if (input.kind === "simple") {
      // Strip the validation-only hint; it is never stored on the line.
      const { offeredGroups, ...simple } = input;

      // Defensive guard: a product that offers size/color cannot be added
      // without a chosen value for each offered group (AGENTS §8.1). The PDP UI
      // already enforces this; this catches programmer error.
      for (const group of offeredGroups ?? []) {
        if (!simple[group]) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[cart] refused to add "${simple.slug}": missing required ${group}`,
            );
          }
          return;
        }
      }

      const candidate = { ...simple, quantity } as Extract<
        CartItem,
        { kind: "simple" }
      >;
      setItems((prev) => {
        const existing = prev.find((i) => sameSimpleLine(i, candidate));
        if (existing) {
          return prev.map((i) =>
            i.lineId === existing.lineId
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          );
        }
        return [...prev, { ...candidate, lineId: makeLineId() }];
      });
      return;
    }

    // Configured items (obi now; gi later). Defensive guard (AGENTS §6/§8): a
    // configured line MUST carry a resolved config snapshot with a computed,
    // itemized total. Never trust a line with a missing/quote breakdown into the
    // cart — the UI already enforces this, this catches programmer error.
    const { config } = input;
    const total = config?.breakdown?.totalJpy;
    if (
      !config ||
      config.breakdown == null ||
      total == null ||
      config.breakdown.quote ||
      input.unitPriceJpy <= 0
    ) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[cart] refused to add configured item: missing resolved config or computed total",
        );
      }
      return;
    }

    setItems((prev) => [
      ...prev,
      { ...input, quantity, lineId: makeLineId() } as CartItem,
    ]);
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.lineId !== lineId)
        : prev.map((i) => (i.lineId === lineId ? { ...i, quantity } : i)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      setQuantity,
      clear,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotalJpy: cartSubtotalJpy(items),
      hydrated,
    }),
    [items, addItem, removeItem, setQuantity, clear, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
