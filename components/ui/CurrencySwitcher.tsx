"use client";

import { useCurrency } from "@/lib/currency/CurrencyProvider";
import type { Currency } from "@/lib/currency/format";

const CURRENCIES: Currency[] = ["JPY", "USD"];

// JPY/USD switch. JPY is the source of truth; toggling only changes the display
// conversion (no re-fetch, no price recomputation).
export function CurrencySwitcher({
  label,
  mobile = false,
}: {
  label: string;
  /** Mobile-menu tone: solid #404040 text, and the selected option blinks like
   *  the active nav link (.blink-active) instead of the desktop transparency
   *  scheme. */
  mobile?: boolean;
}) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-0.5" aria-label={label}>
      {CURRENCIES.map((c, i) => {
        const isActive = c === currency;
        return (
          <span key={c} className="flex items-center gap-0.5">
            {i > 0 && (
              <span className={mobile ? "text-[#404040]" : "text-foreground-muted"}>
                ·
              </span>
            )}
            <button
              type="button"
              onClick={() => setCurrency(c)}
              aria-pressed={isActive}
              className={
                "cursor-pointer " +
                (mobile
                  ? "text-[#404040]" +
                    (isActive ? " blink-active" : " hover:opacity-60")
                  : isActive
                    ? "text-foreground-strong"
                    : "text-foreground-muted hover:text-foreground-strong")
              }
            >
              {c}
            </button>
          </span>
        );
      })}
    </div>
  );
}
