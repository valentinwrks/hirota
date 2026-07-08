import { Link } from "@/lib/i18n/navigation";
import { listOrders, type OrderFilters } from "@/lib/admin/orders/queries";
import { asPayment, asProduction, asShipping } from "@/lib/admin/orders/status";
import { orderMoney } from "@/lib/admin/orders/money";
import {
  PAYMENT_LABELS,
  PRODUCTION_LABELS,
  SHIPPING_LABELS,
  PAYMENT_TONE,
  PRODUCTION_TONE,
  SHIPPING_TONE,
} from "@/lib/admin/orders/status-labels";
import { OrderFilters as OrderFiltersUI } from "@/components/admin/orders/OrderFilters";
import { StatusBadge } from "@/components/admin/orders/StatusBadge";

// Compact UTC timestamp (admin-facing, deterministic across server render).
function fmtDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next 16: searchParams is async.
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const filters: OrderFilters = {
    payment: asPayment(first(sp.payment)),
    production: asProduction(first(sp.production)),
    shipping: asShipping(first(sp.shipping)),
  };

  const orders = await listOrders(filters);

  return (
    <div>
      <div className="h-[26px] flex items-center px-3 border-b border-line text-sm leading-none text-ink-60 sticky top-0 bg-paper-30 backdrop-blur-xs z-10">
        Orders
      </div>

      <div className="p-3 border-b border-line">
        <OrderFiltersUI />
      </div>

      {orders.length === 0 ? (
        <div className="p-6 text-[13px] text-ink-40">
          No orders match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-ink-40 text-left">
                <th className="px-3 py-1.5 border-b border-line font-normal">#</th>
                <th className="px-3 py-1.5 border-b border-line font-normal">Date (UTC)</th>
                <th className="px-3 py-1.5 border-b border-line font-normal">Customer</th>
                <th className="px-3 py-1.5 border-b border-line font-normal text-right">Items</th>
                <th className="px-3 py-1.5 border-b border-line font-normal text-right">Total</th>
                <th className="px-3 py-1.5 border-b border-line font-normal">Payment</th>
                <th className="px-3 py-1.5 border-b border-line font-normal">Production</th>
                <th className="px-3 py-1.5 border-b border-line font-normal">Shipping</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const money = orderMoney(o, o.total_jpy);
                return (
                  <tr key={o.id} className="hover:bg-ink-04">
                    <td className="px-3 py-1.5 border-b border-line-soft tabular-nums">
                      <Link
                        href={`/admin/orders/${o.order_number}`}
                        className="text-ink-70 underline underline-offset-2"
                      >
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 border-b border-line-soft tabular-nums text-ink-50">
                      {fmtDate(o.created_at)}
                    </td>
                    <td className="px-3 py-1.5 border-b border-line-soft text-ink-70">
                      {o.customer_name}
                    </td>
                    <td className="px-3 py-1.5 border-b border-line-soft text-right tabular-nums text-ink-50">
                      {o.item_count}
                    </td>
                    <td className="px-3 py-1.5 border-b border-line-soft text-right tabular-nums text-ink-70 whitespace-nowrap">
                      {money.display ? `${money.display} · ` : ""}
                      {money.jpy}
                    </td>
                    <td className="px-3 py-1.5 border-b border-line-soft">
                      <StatusBadge
                        label={PAYMENT_LABELS[o.payment_status]}
                        tone={PAYMENT_TONE[o.payment_status]}
                      />
                    </td>
                    <td className="px-3 py-1.5 border-b border-line-soft">
                      <StatusBadge
                        label={PRODUCTION_LABELS[o.production_status]}
                        tone={PRODUCTION_TONE[o.production_status]}
                      />
                    </td>
                    <td className="px-3 py-1.5 border-b border-line-soft">
                      <StatusBadge
                        label={SHIPPING_LABELS[o.shipping_status]}
                        tone={SHIPPING_TONE[o.shipping_status]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
