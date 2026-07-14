"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";

// The six admin sections: Orders + the five catalog mirrors. Placeholders this
// sprint (B adds Orders management, C adds the price/stock editors). English
// labels are hardcoded — admin content is not localized.
const SECTIONS = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/gi-custom", label: "Karate-gi Fully-tailored" },
  { href: "/admin/gi-standard", label: "Karate-gi Ready-made" },
  { href: "/admin/obi", label: "Obi" },
  { href: "/admin/equipment", label: "Equipment" },
  { href: "/admin/accessories", label: "Accessories" },
] as const;

export function AdminSidebar({ locale }: { locale: string }) {
  // usePathname (from lib/i18n/navigation) returns the path WITHOUT the locale
  // prefix, so it matches the hrefs above directly.
  const pathname = usePathname();

  return (
    <nav className="flex flex-col p-1.5 gap-0.5">
      {SECTIONS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            locale={locale}
            className={
              active
                ? "px-2 py-1 leading-none bg-foreground-hover text-foreground-input"
                : "px-2 py-1 leading-none text-foreground hover:bg-foreground-hover-subtle"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
