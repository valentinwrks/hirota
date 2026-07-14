"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { updateOrderStatus, type StatusAxis } from "@/lib/admin/orders/actions";
import {
  PAYMENT_STATUSES,
  PRODUCTION_STATUSES,
  SHIPPING_STATUSES,
  type PaymentStatus,
  type ProductionStatus,
  type ShippingStatus,
} from "@/lib/admin/orders/status";
import {
  PAYMENT_LABELS,
  PRODUCTION_LABELS,
  SHIPPING_LABELS,
} from "@/lib/admin/orders/status-labels";

// Advance each of the three status axes INDEPENDENTLY. Each control posts to the
// updateOrderStatus server action (SSR auth client → is_admin() UPDATE policy),
// then refreshes so the change is reflected immediately. Nothing else on the
// placed order is editable here — statuses only (§7).
export function StatusControls({
  locale,
  orderNumber,
  payment,
  production,
  shipping,
}: {
  locale: string;
  orderNumber: number;
  payment: PaymentStatus;
  production: ProductionStatus;
  shipping: ShippingStatus;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <AxisControl
        locale={locale}
        orderNumber={orderNumber}
        axis="payment"
        label="Payment"
        current={payment}
        values={PAYMENT_STATUSES}
        labels={PAYMENT_LABELS}
      />
      <AxisControl
        locale={locale}
        orderNumber={orderNumber}
        axis="production"
        label="Production"
        current={production}
        values={PRODUCTION_STATUSES}
        labels={PRODUCTION_LABELS}
      />
      <AxisControl
        locale={locale}
        orderNumber={orderNumber}
        axis="shipping"
        label="Shipping"
        current={shipping}
        values={SHIPPING_STATUSES}
        labels={SHIPPING_LABELS}
      />
    </div>
  );
}

function AxisControl<T extends string>({
  locale,
  orderNumber,
  axis,
  label,
  current,
  values,
  labels,
}: {
  locale: string;
  orderNumber: number;
  axis: StatusAxis;
  label: string;
  current: T;
  values: readonly T[];
  labels: Record<T, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(value: string) {
    if (value === current) return;
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatus(locale, orderNumber, axis, value);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <label className="flex flex-col gap-1 text-[12px]">
      <span className="text-ink-40 leading-none">{label}</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 px-2 border border-border bg-paper text-ink-70 outline-none focus:border-ink-50 disabled:opacity-50"
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {labels[v]}
          </option>
        ))}
      </select>
      {error ? <span className="text-[11px] text-red-700">{error}</span> : null}
    </label>
  );
}
