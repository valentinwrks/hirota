"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { NAV_CATEGORIES, type NavCategory } from "@/lib/catalog/types";

// Category navigation (karate-gi / obi / equipment / accessories). Highlights
// the active category by matching the current pathname. Locale-aware links.
export function CategoryNav({
  labels,
}: {
  labels: Record<NavCategory, string>;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col items-baseline gap-1 p-1.5 pb-3 text-2xl leading-none">
      {NAV_CATEGORIES.map((category) => {
        const href = `/catalog/${category}`;
        const active = pathname === href;
        return (
          <Link
            key={category}
            href={href}
            className={
              active
                ? "underline underline-offset-2 decoration-2"
                : "hover:opacity-60"
            }
          >
            {labels[category]}
          </Link>
        );
      })}
    </nav>
  );
}
