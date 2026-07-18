"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { type NavCategory } from "@/lib/catalog/types";

// Category navigation (karate-gi / obi / equipment / accessories). Highlights
// the active category by matching the current pathname. Locale-aware links.
export function CategoryNav({
  labels,
  giGroupLabel,
  giShortLabels,
}: {
  labels: Record<NavCategory, string>;
  giGroupLabel: string;
  giShortLabels: Record<"karate-gi-custom" | "karate-gi-standard", string>;
}) {
  const pathname = usePathname();

  // The "karate-gi" prefix is underlined whenever either gi route is active.
  const giGroupActive =
    pathname === "/karate-gi-custom" || pathname === "/karate-gi-standard";

  const renderLink = (category: NavCategory, label = labels[category]) => {
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
        {label}
      </Link>
    );
  };

  return (
    // Hidden below md — the mobile dropdown menu carries the categories.
    <nav className="max-md:hidden flex flex-col items-baseline gap-1 p-1.5 pb-3 text-[18px] 2xl:text-[20px] leading-none">
      {/* The two karate-gi links share one line under a static "karate-gi:"
          prefix, semicolon-separated; the rest each get their own line. */}
      <div className="flex items-baseline">
        <span>
          <span
            className={
              giGroupActive ? "underline underline-offset-2 decoration-2" : ""
            }
          >
            {giGroupLabel}
          </span>
          :&nbsp;
        </span>
        {renderLink("karate-gi-custom", giShortLabels["karate-gi-custom"])}
        <span>,&nbsp;</span>
        {renderLink("karate-gi-standard", giShortLabels["karate-gi-standard"])}
      </div>
      {renderLink("obi")}
      {renderLink("equipment")}
      {renderLink("accessories")}
    </nav>
  );
}
