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
export function StoreMobileNav() {
  const tCart = useTranslations("Cart");
  const { view, setView } = useMobileChrome();
  const { count, hydrated } = useCart();

  function toggleCart() {
    // setView also drops the menu (see MobileChromeProvider), so the two never
    // stack.
    setView(view === "cart" ? null : "cart");
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleCart}
        aria-pressed={view === "cart"}
        aria-label={tCart("title")}
        className={
          "cursor-pointer flex items-center gap-0.5 " +
          (view === "cart" ? "text-foreground-strong" : "text-foreground")
        }
      >
        <ShoppingBagIcon className="w-[15px] h-[15px]" />
        {hydrated && count > 0 ? `(${count})` : ""}
      </button>

      <MobileMenuButton />
    </>
  );
}
