"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "@/lib/i18n/navigation";

// Mobile (< md) chrome state for the store shell. On desktop the three columns
// (about / shop / cart) are always visible side by side; on mobile the shop is
// the only inline column and the other two become full-screen overlays, driven
// by `view`. `menuOpen` is the dropdown menu under the shop section bar.
//
// The two overlays are addressed differently:
// - "about" (the hirota section) IS the store index route `/`: on mobile that
//   root path shows the full-screen about overlay (this is the default landing).
//   You leave it via the nav hamburger in its header (the menu → a category), or
//   the logo (→ `/`) returns to it. Real, linkable URL state, no query param.
// - "cart" is ephemeral UI state; closing it returns to whatever is underneath
//   (the shop, or the about landing at `/`).

export type MobileView = "about" | "cart" | null;

type MobileChromeContext = {
  view: MobileView;
  setView: (view: MobileView) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
};

const Context = createContext<MobileChromeContext | null>(null);

export function MobileChromeProvider({ children }: { children: ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // The about overlay is open iff we are at the store index. usePathname is
  // locale-stripped, so root is "/".
  const atHome = pathname === "/";

  // Any navigation drops the menu and the ephemeral cart so the destination is
  // actually visible. The about overlay follows the route (atHome), not this.
  useEffect(() => {
    setCartOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // Cart wins while open (it can be toggled over the about landing).
  const view: MobileView = cartOpen ? "cart" : atHome ? "about" : null;

  // Only the cart is imperative UI state — about is driven by the route. So
  // `setView` just opens/closes the cart overlay.
  function setView(next: MobileView) {
    setMenuOpen(false);
    setCartOpen(next === "cart");
  }

  return (
    <Context.Provider value={{ view, setView, menuOpen, setMenuOpen }}>
      {children}
    </Context.Provider>
  );
}

export function useMobileChrome(): MobileChromeContext {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useMobileChrome must be used within MobileChromeProvider");
  }
  return ctx;
}
