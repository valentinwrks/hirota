"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import {
  PAYMENT_STATUSES,
  PRODUCTION_STATUSES,
  SHIPPING_STATUSES,
} from "@/lib/admin/orders/status";
import {
  PAYMENT_LABELS,
  PRODUCTION_LABELS,
  SHIPPING_LABELS,
} from "@/lib/admin/orders/status-labels";

// Three INDEPENDENT status filters (payment / production / shipping). Each maps
// to a URL search param; the list page (RSC) re-queries with an AND of whatever
// params are set — so "payment = paid, shipping = not shipped" is just both
// dropdowns chosen. "All" clears that axis.
export function OrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const selectCls =
    "h-7 px-1 border border-border bg-background text-foreground-input text-[12px] outline-none focus:border-foreground";

  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px]">
      <Axis
        label="Payment"
        param="payment"
        current={params.get("payment") ?? ""}
        values={PAYMENT_STATUSES}
        labels={PAYMENT_LABELS}
        onChange={setParam}
        cls={selectCls}
      />
      <Axis
        label="Production"
        param="production"
        current={params.get("production") ?? ""}
        values={PRODUCTION_STATUSES}
        labels={PRODUCTION_LABELS}
        onChange={setParam}
        cls={selectCls}
      />
      <Axis
        label="Shipping"
        param="shipping"
        current={params.get("shipping") ?? ""}
        values={SHIPPING_STATUSES}
        labels={SHIPPING_LABELS}
        onChange={setParam}
        cls={selectCls}
      />
    </div>
  );
}

function Axis<T extends string>({
  label,
  param,
  current,
  values,
  labels,
  onChange,
  cls,
}: {
  label: string;
  param: string;
  current: string;
  values: readonly T[];
  labels: Record<T, string>;
  onChange: (key: string, value: string) => void;
  cls: string;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-foreground-muted">{label}</span>
      <select
        value={current}
        onChange={(e) => onChange(param, e.target.value)}
        className={cls}
      >
        <option value="">All</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {labels[v]}
          </option>
        ))}
      </select>
    </label>
  );
}
