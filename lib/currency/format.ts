// Money formatting. JPY is the source of truth (all prices are stored and
// computed as integer JPY, tax incl.). USD is a *display-only* conversion using
// a runtime rate; we never store or compute in USD.

export type Currency = "JPY" | "USD";

/**
 * Format an integer JPY amount for display.
 *
 * @param amountJpy  integer yen (source of truth)
 * @param currency   the currency the buyer is viewing in
 * @param rate       USD per 1 JPY (only used when currency === "USD")
 *
 * JPY renders with no decimals (¥12,340); USD converts and renders 2 decimals
 * ($81.20). Uses Intl.NumberFormat for locale-correct grouping/symbols.
 */
export function formatMoney(
  amountJpy: number,
  currency: Currency,
  rate: number,
): string {
  if (currency === "USD") {
    const usd = amountJpy * rate;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(usd);
  }

  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amountJpy);
}
