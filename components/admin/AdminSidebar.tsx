"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";

// The six admin sections: Orders + the five catalog mirrors. Each carries an
// i18n `key` into the Admin.sections namespace (EN/JA) rather than a hardcoded
// label. Exported so the mobile menu flap (AdminMobileMenu), the content-bar
// title and the section heading render the same list.
export const SECTIONS = [
  { href: "/admin/orders", key: "orders" },
  { href: "/admin/news", key: "news" },
  { href: "/admin/karate-gi-custom", key: "giCustom" },
  { href: "/admin/karate-gi-standard", key: "giStandard" },
  { href: "/admin/obi", key: "obi" },
  { href: "/admin/equipment", key: "equipment" },
  { href: "/admin/accessories", key: "accessories" },
] as const;

export function AdminSidebar({ locale }: { locale: string }) {
  // usePathname (from lib/i18n/navigation) returns the path WITHOUT the locale
  // prefix, so it matches the hrefs above directly.
  const pathname = usePathname();
  const t = useTranslations("Admin");

  return (
    <nav className="flex flex-col">
      {SECTIONS.map(({ href, key }, i) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        // Three groups, each introduced by a muted 10px hint that carries the
        // group's top gap: "orders" (index 0), "content" (news, index 1) and the
        // catalog mirrors ("pricing & stocks", index 2).
        return (
          <Fragment key={href}>
            {i === 0 ? (
              <p className="mt-3 mb-1 px-1.5 text-[10px] leading-none text-foreground-muted">
                {t("nav.groupOrders")}
              </p>
            ) : null}
            {i === 1 ? (
              <p className="mt-3 mb-1 px-1.5 text-[10px] leading-none text-foreground-muted">
                {t("nav.groupContent")}
              </p>
            ) : null}
            {i === 2 ? (
              <p className="mt-3 mb-1 px-1.5 text-[10px] leading-none text-foreground-muted">
                {t("nav.groupPricing")}
              </p>
            ) : null}
            <Link
              href={href}
              locale={locale}
              className={
                (active
                  ? "px-1.5 py-1 leading-none lowercase text-foreground bg-foreground-hover"
                  : "px-1.5 py-1 leading-none lowercase text-foreground hover:bg-foreground-hover-subtle") +
                (locale === "ja" ? " font-bold" : "")
              }
            >
              {t(`sections.${key}`)}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
