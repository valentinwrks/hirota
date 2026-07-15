"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/lib/i18n/navigation";

// A single status filter that lives INSIDE a table column header: the column
// name is the placeholder ("All" — no filter) and the status values are the
// other options. Picking one narrows that axis; the list page (RSC) re-queries
// with an AND of whatever params are set. Independent per column.
export function OrderColumnFilter<T extends string>({
  label,
  param,
  values,
  labels,
}: {
  label: string;
  param: string;
  values: readonly T[];
  labels: Record<T, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? "";

  function setParam(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <select
      value={current}
      onChange={(e) => setParam(e.target.value)}
      aria-label={`Filter by ${label}`}
      // Match the static header labels exactly: same monospace family + size
      // (native selects otherwise fall back to the OS UI font), same weight and
      // colour. Turns strong when a filter is active, so a narrowed column reads
      // as intentionally set.
      className={
        "bg-transparent outline-none cursor-pointer font-bold [font-family:inherit] [font-size:inherit] " +
        (current ? "text-foreground-strong" : "text-foreground")
      }
    >
      {/* The column name doubles as the "All" (no-filter) option. */}
      <option value="">{label}</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {labels[v]}
        </option>
      ))}
    </select>
  );
}
