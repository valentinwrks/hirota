"use client";

import { useLocale } from "next-intl";
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
  const locale = useLocale();

  // The Japanese labels read better bold (weight 700); Latin ones keep the
  // normal weight.
  const jaBold = locale === "ja" ? "font-bold" : "";

  return (
    // Hidden below md — the mobile dropdown menu carries the categories.
    <nav className={"max-md:hidden flex flex-col items-baseline gap-1 p-1.5 pb-3 text-[18px] 2xl:text-[20px] leading-none " + jaBold}>
      {NAV_CATEGORIES.map((category) => {
        const href = `/${category}`;
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
