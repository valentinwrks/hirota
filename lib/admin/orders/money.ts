import { formatMoney } from "@/lib/currency/format";
import type { Database } from "@/lib/database.types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

// What the admin shows for an order total: JPY is the source of truth and always
// shown; when the buyer paid in USD we ALSO show the display-currency amount at
// the fx rate RECORDED on the order (never a live rate — that's what they saw).
export type OrderMoney = {
  /** Always-present JPY string, e.g. "¥38,940". */
  jpy: string;
  /** Display-currency string when it differs from JPY (USD), else null. */
  display: string | null;
};

export function orderMoney(
  order: Pick<OrderRow, "display_currency" | "fx_rate_usd_jpy">,
  amountJpy: number,
): OrderMoney {
  const jpy = formatMoney(amountJpy, "JPY", 1);
  if (order.display_currency === "USD" && order.fx_rate_usd_jpy != null) {
    return { jpy, display: formatMoney(amountJpy, "USD", order.fx_rate_usd_jpy) };
  }
  return { jpy, display: null };
}

/** JPY-only formatter for line-item / breakdown amounts (the fax sheet is ¥). */
export function jpy(amountJpy: number): string {
  return formatMoney(amountJpy, "JPY", 1);
}
