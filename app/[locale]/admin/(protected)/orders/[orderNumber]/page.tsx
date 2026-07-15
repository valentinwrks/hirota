import { notFound } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { getOrderByNumber } from "@/lib/admin/orders/queries";
import { orderMoney } from "@/lib/admin/orders/money";
import { StatusControls } from "@/components/admin/orders/StatusControls";
import { OrderItemPanel } from "@/components/admin/orders/OrderItemPanel";
import { Section, Grid, Field } from "@/components/admin/orders/parts";

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

  return (
    <div className="pb-10">
      <div className="h-[26px] flex items-center gap-3 px-3 border-b border-border text-sm leading-none text-foreground-strong sticky top-0 bg-background-header backdrop-blur-xs z-10">
        <Link
          href="/admin/orders"
          className="text-foreground-muted underline underline-offset-2"
        >
          ← Orders
        </Link>
        <span>Order #{order.order_number}</span>
      </div>

      <div className="p-3 flex flex-col gap-3 max-w-[900px]">
        {/* Status advancement — the only editable thing on a placed order. */}
        <div className="border border-border bg-background p-3">
          <h3 className="text-[11px] uppercase tracking-wide text-foreground-muted mb-2">
            Status
          </h3>
          <StatusControls
            locale={locale}
            orderNumber={order.order_number}
            payment={order.payment_status}
            production={order.production_status}
            shipping={order.shipping_status}
          />
        </div>

        {/* Meta + contact + shipping */}
        <div className="border border-border bg-background">
          <Section title="Order">
            <Grid>
              <Field label="Number" value={`#${order.order_number}`} />
              <Field label="Placed (UTC)" value={fmtDate(order.created_at)} />
              <Field
                label="Total"
                value={money.display ? `${money.display} · ${money.jpy}` : money.jpy}
              />
              <Field
                label="FX rate"
                value={
                  order.display_currency === "USD" && order.fx_rate_usd_jpy != null
                    ? `${order.fx_rate_usd_jpy} USD/JPY`
                    : null
                }
              />
            </Grid>
          </Section>

          <Section title="Customer">
            <Grid>
              <Field label="Name" value={order.customer_name} />
              <Field label="Email" value={order.customer_email} />
              <Field label="Phone" value={order.customer_phone} />
            </Grid>
          </Section>

          <Section title="Shipping address">
            <Grid>
              <Field label="Recipient" value={addr.recipient} />
              <Field label="Line 1" value={addr.line1} />
              <Field label="Line 2" value={addr.line2} />
              <Field label="City" value={addr.city} />
              <Field label="State" value={addr.state} />
              <Field label="Postal code" value={addr.postal_code} />
              <Field label="Country" value={addr.country} />
            </Grid>
          </Section>

          {order.customer_note ? (
            <Section title="Customer note">
              <p className="text-[12px] text-foreground whitespace-pre-wrap">
                {order.customer_note}
              </p>
            </Section>
          ) : null}
        </div>

        {/* Line items — the fax replacement. */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Line items ({items.length})
          </h3>
          {items.map((item) => (
            <OrderItemPanel key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
