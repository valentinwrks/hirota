import { getTranslations } from "next-intl/server";
import { listOrders, type OrderFilters } from "@/lib/admin/orders/queries";
import {
  asPayment,
  asProduction,
  asShipping,
  PAYMENT_STATUSES,
  PRODUCTION_STATUSES,
  SHIPPING_STATUSES,
} from "@/lib/admin/orders/status";
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

  const t = await getTranslations("Admin");
  // Translated status labels, keyed by value, passed to the column filters.
  const labelsFor = (axis: "payment" | "production" | "shipping", values: readonly string[]) =>
    Object.fromEntries(values.map((v) => [v, t(`status.${axis}.${v}`)]));

  return (
    <div>
      {orders.length === 0 ? (
        <div className="p-6 text-[13px] text-foreground-muted">
          {t("orders.empty")}
        </div>
      ) : (
        <div className="p-3 max-md:px-2 overflow-x-auto scrollbar-thin">
          {/* Same framed, content-width table as the pricing editors: 4-sided
              border, last row drops its faint border-b so the frame's bottom
              edge stays strong (cell borders outrank the table's in collapse). */}
          <table className="w-full max-w-7xl text-[12px] border-collapse border border-border [&_tbody_tr:last-child>td]:border-b-0">
            <thead>
              {/* Plain header, matching the pricing tables: no dark fill, just bold foreground text. */}
              <tr className="text-foreground text-left">
                <th className="px-3 py-1.5 border-b border-border font-bold">{t("orders.colNumber")}</th>
                {/* Date + Items are secondary — hidden below md; the detail page has them. */}
                <th className="px-3 py-1.5 border-b border-border font-bold max-md:hidden">{t("orders.colDate")}</th>
                <th className="px-3 py-1.5 border-b border-border font-bold">{t("orders.colCustomer")}</th>
                <th className="px-3 py-1.5 border-b border-border font-bold max-md:hidden">{t("orders.colItems")}</th>
                <th className="px-3 py-1.5 border-b border-border font-bold">{t("orders.colTotal")}</th>
                <th className="px-3 py-1.5 border-b border-border font-bold">
                  <OrderColumnFilter
                    label={t("axis.payment")}
                    param="payment"
                    values={PAYMENT_STATUSES}
                    labels={labelsFor("payment", PAYMENT_STATUSES)}
                  />
                </th>
                <th className="px-3 py-1.5 border-b border-border font-bold">
                  <OrderColumnFilter
                    label={t("axis.production")}
                    param="production"
                    values={PRODUCTION_STATUSES}
                    labels={labelsFor("production", PRODUCTION_STATUSES)}
                  />
                </th>
                <th className="px-3 py-1.5 border-b border-border font-bold">
                  <OrderColumnFilter
                    label={t("axis.shipping")}
                    param="shipping"
                    values={SHIPPING_STATUSES}
                    labels={labelsFor("shipping", SHIPPING_STATUSES)}
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
