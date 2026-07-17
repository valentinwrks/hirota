import { getTranslations } from "next-intl/server";
import type { Database } from "@/lib/database.types";
import { parseSnapshot } from "@/lib/admin/orders/snapshot";
import { Money } from "./Money";
import { PriceBreakdownBlock } from "./PriceBreakdownBlock";
import { SimpleView } from "./views/SimpleView";
import { ObiView } from "./views/ObiView";
import { GiStandardView } from "./views/GiStandardView";
import { GiCustomView } from "./views/GiCustomView";

type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

const KIND_KEY: Record<OrderItemRow["kind"], string> = {
  simple: "kindSimple",
  obi: "kindObi",
  gi_standard: "kindGiStandard",
  gi_custom: "kindGiCustom",
};

// One line item rendered as a "fax sheet" card: a header (title · kind · qty ·
// line total), the kind-specific resolved spec, and the frozen itemized price.
// Everything is pure presentation of order_items — no engine, no recompute (§7).
export async function OrderItemPanel({ item }: { item: OrderItemRow }) {
  const snapshot = parseSnapshot(item.config);
  const t = await getTranslations("Admin");

  return (
    <article className="border border-border">
      {/* Highlighted like the configurators' selected cells (dark fill, paper
          text). No border-b: the first Section below brings its own border-t —
          both together would read as a doubled (2px) separator. */}
      <header className="flex items-start justify-between gap-3 px-3 py-2 bg-foreground-selected text-background">
        <div className="min-w-0">
          <h3 className="text-sm font-bold truncate">{item.title}</h3>
          <p className="text-[11px] text-background/70 leading-none mt-0.5">
            {t(`item.${KIND_KEY[item.kind]}`)} · {t("item.qty", { count: item.quantity })}
          </p>
        </div>
        <p className="text-sm font-bold tabular-nums whitespace-nowrap">
          <Money amountJpy={item.line_total_jpy} />
        </p>
      </header>

      {snapshot === null ? (
        <div className="px-3 py-2 border-t border-border text-[12px] text-foreground-muted">
          {t("item.snapshotUnavailable")}
        </div>
      ) : (
        <>
          {snapshot.kind === "simple" ? (
            <SimpleView snapshot={snapshot} />
          ) : snapshot.kind === "obi" ? (
            <ObiView snapshot={snapshot} />
          ) : snapshot.kind === "gi_standard" ? (
            <GiStandardView snapshot={snapshot} />
          ) : (
            <GiCustomView snapshot={snapshot} />
          )}
          <PriceBreakdownBlock
            breakdown={snapshot.breakdown}
            lineTotalJpy={item.line_total_jpy}
          />
        </>
      )}
    </article>
  );
}
