"use client";

import { useCurrency } from "@/lib/currency/CurrencyProvider";

// Renders a JPY amount in the currently-selected display currency. Kept as a
// tiny client component so server components (grid, PDP) can stay server while
// the price reacts to the JPY/USD toggle.
export function Price({
  amountJpy,
  className,
}: {
  amountJpy: number;
  className?: string;
}) {
  const { format } = useCurrency();
  return <span className={className}>{format(amountJpy)}</span>;
}
