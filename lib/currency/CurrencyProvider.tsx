"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type Currency, formatMoney } from "./format";

// Client-side currency toggle. JPY is the default and the source of truth; the
// `rate` (USD per 1 JPY) is fetched server-side and injected once as a prop.
// `format` is a convenience wrapper so components don't thread `currency`/`rate`
// through every call site.

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number;
  format: (amountJpy: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "hirota:currency";

export function CurrencyProvider({
  rate,
  children,
}: {
  rate: number;
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState<Currency>("JPY");

  // Restore the last chosen currency on mount (client-only; avoids hydration
  // mismatch by starting from the JPY default and syncing in an effect).
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "USD" || saved === "JPY") setCurrencyState(saved);
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    window.localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      rate,
      format: (amountJpy: number) => formatMoney(amountJpy, currency, rate),
    }),
    [currency, setCurrency, rate],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
