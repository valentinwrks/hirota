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

// Module-scoped (client singleton, per tab) so the chosen currency survives the
// remount that a locale switch triggers — Next re-mounts everything under the
// [locale] segment, which would otherwise reset this provider to JPY and then
// re-restore USD from localStorage in an effect. That JPY→USD re-settle made the
// currency pill visibly animate on every language change. Seeding useState from
// here means a remount initialises straight to the last value (no settle, no
// animation). Starts at the JPY default so the FIRST server/client render still
// matches (localStorage is read post-mount, below).
let lastCurrency: Currency = "JPY";

export function CurrencyProvider({
  rate,
  children,
}: {
  rate: number;
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState<Currency>(lastCurrency);

  // Restore the last chosen currency on mount (client-only; avoids hydration
  // mismatch by starting from the JPY default and syncing in an effect). On a
  // locale-switch remount `lastCurrency` is already the restored value, so this
  // is a no-op and nothing re-settles.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "USD" || saved === "JPY") {
      lastCurrency = saved;
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    lastCurrency = c;
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
