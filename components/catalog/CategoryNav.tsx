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

  const isJa = locale === "ja";
  // The Japanese labels read better bold (weight 700); the Latin ones keep the
  // normal weight.
  const localeType = isJa ? "font-bold" : "";

  // Sentence-case for Latin labels ("karate-gi" → "Karate-gi"): uppercase only
  // the first letter. Done in JS, not CSS `capitalize`, which would also cap the
  // post-hyphen letter ("Karate-Gi"). JA labels pass through untouched.
  const display = (s: string) =>
    isJa ? s : s.charAt(0).toUpperCase() + s.slice(1);

  return (
    // Hidden below md — the mobile dropdown menu carries the categories.
    <nav className={"max-md:hidden flex flex-row items-baseline justify-between gap-2 p-[7px] pb-6 text-[20px] 2xl:text-[24px] leading-none " + localeType}>
      {NAV_CATEGORIES.map((category) => {
        const href = `/${category}`;
        const active = pathname === href;
        return (
          <Link
            key={category}
            href={href}
            className={
              active ? "text-black/30" : "hover:opacity-60"
            }
          >
            {display(labels[category])}
          </Link>
        );
      })}
    </nav>
  );
}
