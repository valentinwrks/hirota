"use client";

import { useTranslations } from "next-intl";
import { useMobileChrome } from "./MobileChromeProvider";
import { MenuIcon, CloseIcon } from "@/components/ui/icons";

// The mobile menu trigger, sitting at the right edge of the shop section bar
// (the 26px "shop" header): a hamburger that swaps to ✕ while open. The
// dropdown itself is rendered by StoreMobileNav, fixed right under this bar.
export function MobileMenuButton() {
  const t = useTranslations("TopBar");
  const { menuOpen, setMenuOpen } = useMobileChrome();

  return (
    <button
      type="button"
      onClick={() => setMenuOpen(!menuOpen)}
      aria-expanded={menuOpen}
      aria-label={menuOpen ? t("close") : t("menu")}
      className={
        "md:hidden ml-auto flex items-center cursor-pointer " +
        (menuOpen ? "text-foreground-strong" : "text-foreground")
      }
    >
      {menuOpen ? (
        <CloseIcon className="w-[19px] h-[19px]" />
      ) : (
        <MenuIcon className="w-[19px] h-[19px]" />
      )}
    </button>
  );
}
