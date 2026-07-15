"use client";

import { useCurrency } from "@/lib/currency/CurrencyProvider";
import type { Currency } from "@/lib/currency/format";

const CURRENCIES: Currency[] = ["JPY", "USD"];

// JPY/USD switch. JPY is the source of truth; toggling only changes the display
// conversion (no re-fetch, no price recomputation).
export function CurrencySwitcher({ label }: { label: string }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-0.5" aria-label={label}>
      {CURRENCIES.map((c, i) => (
        <span key={c} className="flex items-center gap-0.5">
          {i > 0 && <span className="text-foreground-muted">·</span>}
          <button
            type="button"
            onClick={() => setCurrency(c)}
            aria-pressed={c === currency}
            className={
              "cursor-pointer " +
              (c === currency
                ? "text-foreground-strong"
                : "text-foreground-muted hover:text-foreground-strong")
            }
          >
            {c}
          </button>
        </span>
      ))}
    </div>
  );
}
