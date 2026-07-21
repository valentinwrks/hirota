"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "@/lib/i18n/navigation";

// Shared open-state for the admin mobile (< md) menu. The trigger (AdminMobileNav,
// inside the TopBar) and the sliding panel (AdminMobileMenu, a TopBar sibling so
// the opaque bar can hide it while parked) live in separate subtrees, so the open
// flag is lifted here. Mirrors the store's MobileChromeProvider but pared down —
// the admin has only this one overlay (no cart, no about landing).
type AdminMobileChromeContext = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
};

const Context = createContext<AdminMobileChromeContext | null>(null);

export function AdminMobileChromeProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation so the destination section is visible.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <Context.Provider value={{ menuOpen, setMenuOpen }}>
      {children}
    </Context.Provider>
  );
}

export function useAdminMobileChrome(): AdminMobileChromeContext {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error(
      "useAdminMobileChrome must be used within AdminMobileChromeProvider",
    );
  }
  return ctx;
}
