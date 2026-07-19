"use client";

import { useTranslations } from "next-intl";
import { useMobileChrome } from "./MobileChromeProvider";

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

  // Shared per-bar styling; each bar is absolutely positioned so it can animate
  // both its vertical offset and its rotation about the box centre.
  const bar =
    "absolute left-0 right-0 h-[2px] rounded-full bg-current transition-all duration-300 ease-in-out";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={showClose}
      aria-label={showClose ? t("close") : t("menu")}
      className={
        "md:hidden flex items-center cursor-pointer " +
        (showClose ? "text-foreground-strong" : "text-foreground")
      }
    >
      <span className="relative block w-[19px] h-[19px]" aria-hidden="true">
        <span
          className={
            bar + (showClose ? " top-1/2 -translate-y-1/2 rotate-45" : " top-[6px]")
          }
        />
        <span
          className={
            bar + (showClose ? " top-1/2 -translate-y-1/2 -rotate-45" : " top-[11px]")
          }
        />
      </span>
    </button>
  );
}
