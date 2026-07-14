import { jpy } from "@/lib/admin/orders/money";
import type { PriceBreakdown } from "@/lib/pricing/types";
import { Section } from "./parts";

// Renders the FROZEN itemized price exactly as the engine computed it at
// purchase time (§7). `breakdown.lines` are already { label, amountJpy }; we do
// not recompute anything — unit subtotal, quantity and line total are read
// straight from the snapshot.
export function PriceBreakdownBlock({
  breakdown,
  lineTotalJpy,
}: {
  breakdown: PriceBreakdown;
  lineTotalJpy: number;
}) {
  return (
    <Section title="Price">
      <div className="text-[12px]">
        {breakdown.lines.map((line, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-3 py-0.5"
          >
            <span className="text-foreground">{line.label}</span>
            <span className="text-foreground-input tabular-nums">{jpy(line.amountJpy)}</span>
          </div>
        ))}

        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-1">
          <span className="text-foreground-muted">Unit subtotal</span>
          <span className="text-foreground-input tabular-nums">
            {breakdown.unitSubtotalJpy != null ? jpy(breakdown.unitSubtotalJpy) : "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-foreground-muted">× qty {breakdown.quantity}</span>
          <span className="font-bold text-foreground-input tabular-nums">
            {jpy(lineTotalJpy)}
          </span>
        </div>
      </div>
    </Section>
  );
}
