"use client";

import { useCurrency } from "@/lib/currency/CurrencyProvider";
import type { Currency } from "@/lib/currency/format";

const CURRENCIES: Currency[] = ["JPY", "USD"];

// JPY/USD switch. JPY is the source of truth; toggling only changes the display
// conversion (no re-fetch, no price recomputation).
export function CurrencySwitcher({ label }: { label: string }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-1" aria-label={label}>
      {CURRENCIES.map((c, i) => (
        <span key={c} className="flex items-center gap-1">
          {i > 0 && <span className="text-neutral-300">/</span>}
          <button
            type="button"
            onClick={() => setCurrency(c)}
            aria-pressed={c === currency}
            className={
              c === currency
                ? "text-black/70"
                : "text-black/40 hover:text-black/70"
            }
          >
            {c}
          </button>
        </span>
      ))}
    </div>
  );
}
