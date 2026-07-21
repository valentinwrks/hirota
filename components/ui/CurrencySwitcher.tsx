"use client";

import { useCurrency } from "@/lib/currency/CurrencyProvider";
import type { Currency } from "@/lib/currency/format";
import { PillSwitch } from "./PillSwitch";

const CURRENCIES: Currency[] = ["JPY", "USD"];

// JPY/USD switch. JPY is the source of truth; toggling only changes the display
// conversion (no re-fetch, no price recomputation).
export function CurrencySwitcher({
  label,
  mobile = false,
}: {
  label: string;
  /** Mobile-menu placement: renders the larger pill size to sit alongside the
   *  menu's big type. */
  mobile?: boolean;
}) {
  const { currency, setCurrency } = useCurrency();

  return (
    <PillSwitch
      label={label}
      value={currency}
      onSelect={setCurrency}
      size={mobile ? "lg" : "sm"}
      options={[
        { value: CURRENCIES[0], label: CURRENCIES[0] },
        { value: CURRENCIES[1], label: CURRENCIES[1] },
      ]}
    />
  );
}
