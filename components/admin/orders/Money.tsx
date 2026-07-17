import { formatJpy } from "@/lib/admin/orders/money";

// A displayed amount, always in JPY. The admin handles money only in JPY
// (HIROTA's internal source of truth); these are the frozen JPY integers from
// the order snapshot — no live conversion, no currency switch.
export function Money({ amountJpy }: { amountJpy: number }) {
  return <>{formatJpy(amountJpy)}</>;
}
