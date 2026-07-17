"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/lib/i18n/navigation";
import { SECTIONS } from "./AdminSidebar";

// Big page title at the top of each of the six admin sections. Derived from the
// pathname by EXACT match against SECTIONS, so it shows on the section index
// pages only — nested routes like /admin/orders/123 (which carry their own
// heading) don't get it. Kept in the layout's scroll region so every section
// starts the same way without repeating the markup in six pages.
export function AdminSectionHeading() {
  const pathname = usePathname();
  const t = useTranslations("Admin");
  const section = SECTIONS.find(({ href }) => pathname === href);
  if (!section) return null;

  return (
    <h1 className="px-3 pt-3 text-[22px] font-bold leading-tight text-foreground">
      {t(`sections.${section.key}`)}
    </h1>
  );
}
