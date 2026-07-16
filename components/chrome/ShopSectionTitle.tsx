"use client";

import { usePathname } from "@/lib/i18n/navigation";
import { isNavCategory, type NavCategory } from "@/lib/catalog/types";

// Title for the shop section bar (the 26px bar under the TopBar). Always shows
// "shop"; on mobile only it appends " / <category>" for the current route, so
// the bar reads e.g. "shop / obi" (on desktop that context lives in the
// "products / <category>" bar below the nav, so the suffix is hidden there). At
// the `/` index or a non-category route there is no suffix.
export function ShopSectionTitle({
  shopLabel,
  categoryLabels,
}: {
  shopLabel: string;
  categoryLabels: Record<NavCategory, string>;
}) {
  const pathname = usePathname();
  const segment = pathname.slice(1); // locale-stripped, e.g. "/obi" -> "obi"
  const label = isNavCategory(segment) ? categoryLabels[segment] : null;

  return (
    <span className="flex-1 min-w-0 truncate">
      {shopLabel}
      {label ? <span className="md:hidden"> / {label}</span> : null}
    </span>
  );
}
