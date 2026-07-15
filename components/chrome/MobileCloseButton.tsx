"use client";

import { useTranslations } from "next-intl";
import { useMobileChrome } from "./MobileChromeProvider";

// The ✕ in a column's 26px header — mobile only, closes the active overlay
// (about / cart) and returns to the shop.
export function MobileCloseButton() {
  const t = useTranslations("TopBar");
  const { setView } = useMobileChrome();

  return (
    <button
      type="button"
      onClick={() => setView(null)}
      aria-label={t("close")}
      className="md:hidden ml-auto px-1 leading-none text-foreground-muted hover:text-foreground-strong cursor-pointer"
    >
      ✕
    </button>
  );
}
