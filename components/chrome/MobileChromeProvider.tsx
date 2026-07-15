"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "@/lib/i18n/navigation";

// Mobile (< md) chrome state for the store shell. On desktop the three columns
// (about / shop / cart) are always visible side by side; on mobile the shop is
// the only inline column and the other two become full-screen overlays, driven
// by `view`. `menuOpen` is the TopBar dropdown menu. Purely UI state — no URL
// changes, so closing an overlay returns to the shop exactly as it was.

export type MobileView = "about" | "cart" | null;

type MobileChromeContext = {
  view: MobileView;
  setView: (view: MobileView) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
};

const Context = createContext<MobileChromeContext | null>(null);

export function MobileChromeProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<MobileView>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Any navigation lands on shop content — drop the menu and any open overlay
  // so the destination is actually visible.
  useEffect(() => {
    setView(null);
    setMenuOpen(false);
  }, [pathname]);

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
