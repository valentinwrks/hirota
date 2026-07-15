import { listOrders, type OrderFilters } from "@/lib/admin/orders/queries";
import {
  asPayment,
  asProduction,
  asShipping,
  PAYMENT_STATUSES,
  PRODUCTION_STATUSES,
  SHIPPING_STATUSES,
} from "@/lib/admin/orders/status";
import {
  PAYMENT_LABELS,
  PRODUCTION_LABELS,
  SHIPPING_LABELS,
} from "@/lib/admin/orders/status-labels";
import { OrderColumnFilter } from "@/components/admin/orders/OrderFilters";
import { OrderRow } from "@/components/admin/orders/OrderRow";

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
      {orders.length === 0 ? (
        <div className="p-6 text-[13px] text-foreground-muted">
          No orders match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-foreground text-left">
                <th className="px-3 py-1.5 border-b border-border font-bold">#</th>
                {/* Date + Items are secondary — hidden below md; the detail page has them. */}
                <th className="px-3 py-1.5 border-b border-border font-bold max-md:hidden">Date (UTC)</th>
                <th className="px-3 py-1.5 border-b border-border font-bold">Customer</th>
                <th className="px-3 py-1.5 border-b border-border font-bold max-md:hidden">Items</th>
                <th className="px-3 py-1.5 border-b border-border font-bold">Total</th>
                <th className="px-3 py-1.5 border-b border-border font-bold">
                  <OrderColumnFilter
                    label="Payment"
                    param="payment"
                    values={PAYMENT_STATUSES}
                    labels={PAYMENT_LABELS}
                  />
                </th>
                <th className="px-3 py-1.5 border-b border-border font-bold">
                  <OrderColumnFilter
                    label="Production"
                    param="production"
                    values={PRODUCTION_STATUSES}
                    labels={PRODUCTION_LABELS}
                  />
                </th>
                <th className="px-3 py-1.5 border-b border-border font-bold">
                  <OrderColumnFilter
                    label="Shipping"
                    param="shipping"
                    values={SHIPPING_STATUSES}
                    labels={SHIPPING_LABELS}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
