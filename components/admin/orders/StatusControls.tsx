"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { Select } from "@/components/admin/ui/Select";
import { updateOrderStatus, type StatusAxis } from "@/lib/admin/orders/actions";
import {
  PAYMENT_STATUSES,
  PRODUCTION_STATUSES,
  SHIPPING_STATUSES,
  type PaymentStatus,
  type ProductionStatus,
  type ShippingStatus,
} from "@/lib/admin/orders/status";

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
        current={payment}
        values={PAYMENT_STATUSES}
      />
      <AxisControl
        locale={locale}
        orderNumber={orderNumber}
        axis="production"
        current={production}
        values={PRODUCTION_STATUSES}
      />
      <AxisControl
        locale={locale}
        orderNumber={orderNumber}
        axis="shipping"
        current={shipping}
        values={SHIPPING_STATUSES}
      />
    </div>
  );
}

function AxisControl<T extends string>({
  locale,
  orderNumber,
  axis,
  current,
  values,
}: {
  locale: string;
  orderNumber: number;
  axis: StatusAxis;
  current: T;
  values: readonly T[];
}) {
  const router = useRouter();
  const t = useTranslations("Admin");
  const label = t(`axis.${axis}`);
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
    <div className="flex flex-col gap-1 text-[12px]">
      <span className="text-foreground-muted leading-none">{label}</span>
      <Select
        value={current}
        options={values.map((v) => ({
          value: v,
          label: t(`status.${axis}.${v as string}`),
        }))}
        onChange={(v) => onChange(v)}
        ariaLabel={label}
        disabled={pending}
        block
        // Transparent boxed control, like the rest of the admin; monospace inherited.
        triggerClassName="h-8 px-2 w-full border border-border bg-transparent text-foreground outline-none focus:border-foreground disabled:opacity-50 cursor-pointer [font-family:inherit] [font-size:inherit]"
      />
      {error ? <span className="text-[11px] text-red-700">{error}</span> : null}
    </div>
  );
}
