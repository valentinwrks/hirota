"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

// Minimal client context for the checkout sheet's open/close state ONLY.
//
// The CHECKOUT trigger lives in CartColumn, but the sheet mounts at the layout
// level with server components in between — so plain useState can't bridge them.
// A tiny context at the common ancestor (mounted beside CartProvider /
// CurrencyProvider) is the right pattern, same as the cart.
//
// Deliberately narrow: cart data + total come from the existing CartProvider /
// CurrencyProvider; the buyer form state stays local to the sheet. Nothing about
// orders, prices, or forms belongs here.
type CheckoutContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CheckoutContextValue>(
    () => ({ isOpen, open, close }),
    [isOpen, open, close],
  );

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
}
