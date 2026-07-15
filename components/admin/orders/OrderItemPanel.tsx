import type { Database } from "@/lib/database.types";
import { parseSnapshot } from "@/lib/admin/orders/snapshot";
import { jpy } from "@/lib/admin/orders/money";
import { PriceBreakdownBlock } from "./PriceBreakdownBlock";
import { SimpleView } from "./views/SimpleView";
import { ObiView } from "./views/ObiView";
import { GiStandardView } from "./views/GiStandardView";
import { GiCustomView } from "./views/GiCustomView";

type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

const KIND_LABEL: Record<OrderItemRow["kind"], string> = {
  simple: "Simple",
  obi: "Obi",
  gi_standard: "Ready-made gi",
  gi_custom: "Fully-tailored gi",
};

// One line item rendered as a "fax sheet" card: a header (title · kind · qty ·
// line total), the kind-specific resolved spec, and the frozen itemized price.
// Everything is pure presentation of order_items — no engine, no recompute (§7).
export async function OrderItemPanel({ item }: { item: OrderItemRow }) {
  const snapshot = parseSnapshot(item.config);

  return (
    <article className="border border-border bg-background">
      <header className="flex items-start justify-between gap-3 px-3 py-2 border-b border-border">
        <div className="min-w-0">
          <h3 className="font-bold text-foreground truncate">{item.title}</h3>
          <p className="text-[11px] text-foreground-muted leading-none mt-0.5">
            {KIND_LABEL[item.kind]} · qty {item.quantity}
          </p>
        </div>
        <p className="font-bold text-foreground tabular-nums whitespace-nowrap">
          {jpy(item.line_total_jpy)}
        </p>
      </header>

      {snapshot === null ? (
        <div className="px-3 py-2 text-[12px] text-foreground-muted">
          Snapshot unavailable — this line could not be read.
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
