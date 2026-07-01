"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type CartItem,
  type SimpleVariantGroup,
  cartSubtotalJpy,
} from "./types";

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Guard so the first (empty) render doesn't overwrite stored cart before load.
  const loadedRef = useRef(false);

  // Load once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed as CartItem[]);
      }
    } catch {
      // Corrupt storage → start empty.
    }
    loadedRef.current = true;
    setHydrated(true);
  }, []);

  // Persist on change (after initial load).
  useEffect(() => {
    if (!loadedRef.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

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

    // Configured items (later sprint) — no group requirement.
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
