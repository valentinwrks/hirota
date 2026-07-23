"use client";

import { useCurrency } from "@/lib/currency/CurrencyProvider";
import type { Currency } from "@/lib/currency/format";
import { PillSwitch, type Size } from "./PillSwitch";

const CURRENCIES: Currency[] = ["JPY", "USD"];

// JPY/USD switch. JPY is the source of truth; toggling only changes the display
// conversion (no re-fetch, no price recomputation).
export function CurrencySwitcher({
  label,
  mobile = false,
  size,
}: {
  label: string;
  /** Mobile-menu placement: renders the larger `lg` pill to sit alongside the
   *  menu's big type. */
  mobile?: boolean;
  /** Explicit pill size, overriding `mobile`. */
  size?: Size;
}) {
  const { currency, setCurrency } = useCurrency();

  return (
    <PillSwitch
      label={label}
      value={currency}
      onSelect={setCurrency}
      size={size ?? (mobile ? "lg" : "sm")}
      options={[
        { value: CURRENCIES[0], label: CURRENCIES[0] },
        { value: CURRENCIES[1], label: CURRENCIES[1] },
      ]}
    />
  );
}
