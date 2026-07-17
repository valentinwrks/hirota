"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/lib/i18n/navigation";
import { SECTIONS } from "./AdminSidebar";

// Title for the admin content column's 26px bar (mirrors the public shop bar):
// the label of the OPEN section, derived from the pathname by prefix so nested
// routes (e.g. /admin/orders/4) keep their section's title. Lowercased to match
// the public bars' look ("shop", "hirota").
export function AdminPanelTitle() {
  const pathname = usePathname();
  const t = useTranslations("Admin");
  const section = SECTIONS.find(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );

  return (
    <span className="flex-1 min-w-0 truncate lowercase">
      {section ? t(`sections.${section.key}`) : ""}
    </span>
  );
}
