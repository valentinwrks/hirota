"use client";

import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart/CartProvider";
import { useMobileChrome } from "./MobileChromeProvider";
import { MobileMenuButton } from "./MobileMenuButton";
import { ShoppingBagIcon } from "@/components/ui/icons";

// Mobile (< md) store nav TRIGGERS, living in the TopBar's right group: the cart
// toggle (with the line count) and, to its right, the menu trigger
// (MobileMenuButton). The sliding menu panel itself is StoreMobileMenu, rendered
// as a TopBar sibling in the store layout so the opaque TopBar can hide it while
// it slides in/out from behind. The hirota section is reached via the TopBar
// logo (→ `/`), not from the menu.
// Matches the menu flap's slide duration (StoreMobileMenu, 300ms) — long enough
// for it to fully retract before the cart drops in.
const MENU_CLOSE_MS = 300;

export function StoreMobileNav() {
  const tCart = useTranslations("Cart");
  const { view, setView, menuOpen, setMenuOpen } = useMobileChrome();
  const { count, hydrated } = useCart();

  function toggleCart() {
    if (view === "cart") {
      setView(null);
      return;
    }
    // If the category menu is open, close it FIRST and let it slide back up,
    // THEN drop the cart flap in — so the two never overlap on screen. (setView
    // also clears menuOpen, but calling it immediately would open the cart over
    // a still-retracting menu; the delay sequences them instead.)
    if (menuOpen) {
      setMenuOpen(false);
      window.setTimeout(() => setView("cart"), MENU_CLOSE_MS);
      return;
    }
    setView("cart");
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleCart}
        aria-pressed={view === "cart"}
        aria-label={tCart("title")}
        className="cursor-pointer flex items-center gap-0.5 text-[#404040]"
      >
        <ShoppingBagIcon className="w-[18px] h-[18px]" />
        {hydrated && count > 0 ? `(${count})` : ""}
      </button>

      <MobileMenuButton />
    </>
  );
}
