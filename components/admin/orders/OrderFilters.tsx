"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { Select, type SelectOption } from "@/components/admin/ui/Select";

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
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useTranslations("Admin");
  const current = params.get(param) ?? "";

  function setParam(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // The column name doubles as the "All" (no-filter, value "") option.
  const options: SelectOption<string>[] = [
    { value: "", label },
    ...values.map((v) => ({ value: v, label: labels[v] })),
  ];

  return (
    <Select
      value={current}
      options={options}
      onChange={setParam}
      ariaLabel={t("orders.filterBy", { label })}
      // Blend into the header labels: same monospace + weight + foreground
      // colour. An active filter gets an underline.
      triggerClassName={
        "bg-transparent outline-none cursor-pointer font-bold [font-family:inherit] [font-size:inherit] text-foreground " +
        (current ? "underline underline-offset-2" : "")
      }
    />
  );
}
