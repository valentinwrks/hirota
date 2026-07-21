"use client";

import { useTranslations } from "next-intl";
import { useMobileChrome } from "./MobileChromeProvider";
import { HamburgerIcon } from "./HamburgerIcon";

// The mobile menu trigger, sitting in the TopBar to the right of the bag icon
// (see StoreMobileNav): a two-bar hamburger whose bars slide to the centre and
// rotate ±45° into an ✕. It reads as an ✕ whenever there's something to close —
// the category menu OR the cart flap — and clicking it closes whatever is open
// (cart first, since it's the more prominent full-screen surface), otherwise it
// opens the menu. The dropdown itself is rendered by StoreMobileMenu, fixed
// right under the TopBar; the cart flap by MobilePanel.
export function MobileMenuButton() {
  const t = useTranslations("TopBar");
  const { view, setView, menuOpen, setMenuOpen } = useMobileChrome();

  // The bars form an ✕ (and the button acts as a "close") while either overlay
  // is open.
  const showClose = menuOpen || view === "cart";

  const onClick = () => {
    if (view === "cart") setView(null);
    else setMenuOpen(!menuOpen);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={showClose}
      aria-label={showClose ? t("close") : t("menu")}
      className="md:hidden flex items-center cursor-pointer text-[#404040]"
    >
      <HamburgerIcon open={showClose} />
    </button>
  );
}
