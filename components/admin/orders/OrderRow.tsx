"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import type { OrderListRow } from "@/lib/admin/orders/queries";
import { formatJpy } from "@/lib/admin/orders/money";
import {
  PAYMENT_TONE,
  PRODUCTION_TONE,
  SHIPPING_TONE,
} from "@/lib/admin/orders/status-labels";
import { StatusBadge } from "./StatusBadge";

// Compact UTC timestamp (deterministic — same string on server and client).
function fmtDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

// One order row. The WHOLE row is clickable (navigates to the order detail); the
// # cell stays a real link too, so keyboard focus and open-in-new-tab keep
// working — its click stops propagation so the row handler doesn't double-fire.
export function OrderRow({ order }: { order: OrderListRow }) {
  const router = useRouter();
  const t = useTranslations("Admin");
  const href = `/admin/orders/${order.order_number}`;

  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer hover:bg-foreground-hover-subtle"
    >
      <td className="px-3 py-1.5 border-b border-border-blocked tabular-nums">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="text-foreground"
        >
          #{order.order_number}
        </Link>
      </td>
      {/* Date + Items mirror the header's max-md:hidden columns. */}
      <td className="px-3 py-1.5 border-b border-border-blocked tabular-nums text-foreground max-md:hidden">
        {fmtDate(order.created_at)}
      </td>
      <td className="px-3 py-1.5 border-b border-border-blocked text-foreground">
        {order.customer_name}
      </td>
      <td className="px-3 py-1.5 border-b border-border-blocked tabular-nums text-foreground max-md:hidden">
        {order.item_count}
      </td>
      <td className="px-3 py-1.5 border-b border-border-blocked tabular-nums text-foreground whitespace-nowrap">
        {formatJpy(order.total_jpy)}
      </td>
      <td className="px-3 py-1.5 border-b border-border-blocked">
        <StatusBadge
          label={t(`status.payment.${order.payment_status}`)}
          tone={PAYMENT_TONE[order.payment_status]}
        />
      </td>
      <td className="px-3 py-1.5 border-b border-border-blocked">
        <StatusBadge
          label={t(`status.production.${order.production_status}`)}
          tone={PRODUCTION_TONE[order.production_status]}
        />
      </td>
      <td className="px-3 py-1.5 border-b border-border-blocked">
        <StatusBadge
          label={t(`status.shipping.${order.shipping_status}`)}
          tone={SHIPPING_TONE[order.shipping_status]}
        />
      </td>
    </tr>
  );
}
