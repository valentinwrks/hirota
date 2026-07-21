import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getOrderByNumber } from "@/lib/admin/orders/queries";
import { orderMoney } from "@/lib/admin/orders/money";
import { StatusControls } from "@/components/admin/orders/StatusControls";
import { OrderItemPanel } from "@/components/admin/orders/OrderItemPanel";
import { KvTable } from "@/components/admin/orders/parts";

function fmtDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

// Narrow the shipping_address JSONB (written by the checkout action).
type ShippingAddress = {
  recipient?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string | null;
  postal_code?: string;
  country?: string;
};

// Order detail — same design language as the pricing editors: transparent
// surfaces, framed content-width tables, text-lg bold section titles. Pure
// presentation of the frozen order (§7); statuses are the only editable thing.
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
}) {
  const { locale, orderNumber } = await params;
  const n = Number(orderNumber);
  if (!Number.isInteger(n)) notFound();

  const detail = await getOrderByNumber(n);
  if (!detail) notFound();

  const { order, items } = detail;
  const addr = (order.shipping_address ?? {}) as ShippingAddress;
  const money = orderMoney(order, order.total_jpy);
  const t = await getTranslations("Admin");

  return (
    <div className="p-3 max-md:px-2 pb-10 max-w-[900px] flex flex-col gap-5 text-[12px]">
      <div>
        {/* Same treatment as the PDP's "← back" link. */}
        <Link
          href="/admin/orders"
          className="text-xs text-foreground-muted hover:text-foreground"
        >
          {t("detail.back")}
        </Link>
      </div>

      <section>
        <h3 className="text-lg font-bold leading-tight mb-1.5">
          {t("detail.orderTitle", { number: order.order_number })}
        </h3>
        <KvTable
          rows={[
            { label: t("detail.placed"), value: fmtDate(order.created_at) },
            {
              // JPY is the internal source of truth and the only live figure.
              // When the buyer paid in USD, the amount they actually saw (their
              // currency at the RECORDED rate) stays as a muted historical note.
              label: t("detail.total"),
              value: (
                <>
                  {money.jpy}
                  {money.display ? (
                    <span className="text-foreground-muted">
                      {" "}
                      · {t("detail.buyerSaw", { amount: money.display })}
                    </span>
                  ) : null}
                </>
              ),
            },
            {
              label: t("detail.fxRate"),
              value:
                order.display_currency === "USD" &&
                order.fx_rate_usd_jpy != null
                  ? t("detail.fxValue", { rate: order.fx_rate_usd_jpy })
                  : null,
            },
          ]}
        />
      </section>

      <section>
        <h3 className="text-lg font-bold leading-tight mb-1.5">{t("detail.status")}</h3>
        <StatusControls
          locale={locale}
          orderNumber={order.order_number}
          payment={order.payment_status}
          production={order.production_status}
          shipping={order.shipping_status}
        />
      </section>

      <section>
        <h3 className="text-lg font-bold leading-tight mb-1.5">{t("detail.customer")}</h3>
        <KvTable
          rows={[
            { label: t("detail.name"), value: order.customer_name },
            { label: t("detail.email"), value: order.customer_email },
            { label: t("detail.phone"), value: order.customer_phone },
          ]}
        />
      </section>

      <section>
        <h3 className="text-lg font-bold leading-tight mb-1.5">
          {t("detail.shippingAddress")}
        </h3>
        <KvTable
          rows={[
            { label: t("detail.recipient"), value: addr.recipient },
            { label: t("detail.line1"), value: addr.line1 },
            { label: t("detail.line2"), value: addr.line2 },
            { label: t("detail.city"), value: addr.city },
            { label: t("detail.state"), value: addr.state },
            { label: t("detail.postalCode"), value: addr.postal_code },
            { label: t("detail.country"), value: addr.country },
          ]}
        />
      </section>

      {order.customer_note ? (
        <section>
          <h3 className="text-lg font-bold leading-tight mb-1.5">
            {t("detail.customerNote")}
          </h3>
          <p className="text-foreground whitespace-pre-wrap">
            {order.customer_note}
          </p>
        </section>
      ) : null}

      <section>
        <h3 className="text-lg font-bold leading-tight mb-1.5">
          {t("detail.lineItems", { count: items.length })}
        </h3>
        <div className="flex flex-col gap-5">
          {items.map((item) => (
            <OrderItemPanel key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
