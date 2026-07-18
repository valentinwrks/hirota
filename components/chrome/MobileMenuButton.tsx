"use client";

import { useTranslations } from "next-intl";
import { useMobileChrome } from "./MobileChromeProvider";

// The mobile menu trigger, sitting in the TopBar to the right of the bag icon
// (see StoreMobileNav): a two-bar hamburger whose bars slide to the centre and
// rotate ±45° into an ✕ while the menu is open. The dropdown itself is rendered
// by StoreMobileNav, fixed right under the TopBar.
export function MobileMenuButton() {
  const t = useTranslations("TopBar");
  const { menuOpen, setMenuOpen } = useMobileChrome();

  // Shared per-bar styling; each bar is absolutely positioned so it can animate
  // both its vertical offset and its rotation about the box centre.
  const bar =
    "absolute left-0 right-0 h-[2px] rounded-full bg-current transition-all duration-300 ease-in-out";

  return (
    <button
      type="button"
      onClick={() => setMenuOpen(!menuOpen)}
      aria-expanded={menuOpen}
      aria-label={menuOpen ? t("close") : t("menu")}
      className={
        "md:hidden flex items-center cursor-pointer " +
        (menuOpen ? "text-foreground-strong" : "text-foreground")
      }
    >
      <span className="relative block w-[19px] h-[19px]" aria-hidden="true">
        <span
          className={
            bar + (menuOpen ? " top-1/2 -translate-y-1/2 rotate-45" : " top-[6px]")
          }
        />
        <span
          className={
            bar + (menuOpen ? " top-1/2 -translate-y-1/2 -rotate-45" : " top-[11px]")
          }
        />
      </span>
    </button>
  );
}
