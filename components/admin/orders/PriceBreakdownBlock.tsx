import { getTranslations } from "next-intl/server";
import type { PriceBreakdown } from "@/lib/pricing/types";
import { Money } from "./Money";
import { Section } from "./parts";

// Renders the FROZEN itemized price exactly as the engine computed it at
// purchase time (§7). `breakdown.lines` are already { label, amountJpy }; we do
// not recompute anything — unit subtotal, quantity and line total are read
// straight from the snapshot. Display currency follows the TopBar switch
// (Money); the underlying amounts stay the frozen JPY integers.
export async function PriceBreakdownBlock({
  breakdown,
  lineTotalJpy,
}: {
  breakdown: PriceBreakdown;
  lineTotalJpy: number;
}) {
  const t = await getTranslations("Admin");
  return (
    <Section title={t("item.price")} tinted>
      <div className="text-[12px]">
        {breakdown.lines.map((line, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-3 py-0.5"
          >
            <span className="text-foreground">{line.label}</span>
            <span className="text-foreground tabular-nums">
              <Money amountJpy={line.amountJpy} />
            </span>
          </div>
        ))}

        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-1">
          <span className="text-foreground-muted">{t("item.unitSubtotal")}</span>
          <span className="text-foreground tabular-nums">
            {breakdown.unitSubtotalJpy != null ? (
              <Money amountJpy={breakdown.unitSubtotalJpy} />
            ) : (
              "—"
            )}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-foreground-muted">{t("item.qtyMultiplier", { count: breakdown.quantity })}</span>
          <span className="font-bold text-foreground tabular-nums">
            <Money amountJpy={lineTotalJpy} />
          </span>
        </div>
      </div>
    </Section>
  );
}
