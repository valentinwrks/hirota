"use client";

import { useTranslations } from "next-intl";
import { useAdminMobileChrome } from "./AdminMobileChromeProvider";
import { HamburgerIcon } from "@/components/chrome/HamburgerIcon";

// Mobile (< md) admin menu TRIGGER, living in the TopBar's right group: the same
// animated hamburger the store uses (MobileMenuButton) — two bars that morph into
// an ✕ while the menu is open. The sliding panel it toggles is AdminMobileMenu, a
// TopBar sibling; open state is shared via AdminMobileChromeProvider.
export function AdminMobileNav() {
  const t = useTranslations("TopBar");
  const { menuOpen, setMenuOpen } = useAdminMobileChrome();

  return (
    <button
      type="button"
      onClick={() => setMenuOpen(!menuOpen)}
      aria-expanded={menuOpen}
      aria-label={menuOpen ? t("close") : t("menu")}
      className="md:hidden flex items-center cursor-pointer text-[#404040]"
    >
      <HamburgerIcon open={menuOpen} />
    </button>
  );
}
