"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { type NavCategory } from "@/lib/catalog/types";
import { useCart } from "@/lib/cart/CartProvider";
import { useMobileChrome } from "./MobileChromeProvider";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/ui/CurrencySwitcher";
import { CartIcon } from "@/components/ui/icons";

const CATEGORIES: NavCategory[] = [
  "karate-gi-custom",
  "karate-gi-standard",
  "obi",
  "equipment",
  "accessories",
];

// Mobile (< md) store navigation. The TopBar slot holds only the direct cart
// toggle (with the line count); the menu TRIGGER lives in the shop section bar
// (MobileMenuButton), and the dropdown rendered here hangs right under that bar
// (26px TopBar + 26px section bar = 52px): the categories and the
// language/currency switches that the desktop TopBar shows inline, as one
// block. The hirota section is reached via the TopBar logo (which links to the
// store index `/`), not from the menu. A light scrim below the dropdown closes it.
export function StoreMobileNav() {
  const t = useTranslations("TopBar");
  const tNav = useTranslations("Nav");
  const tCart = useTranslations("Cart");
  const { view, setView, menuOpen, setMenuOpen } = useMobileChrome();
  const { count, hydrated } = useCart();
  const pathname = usePathname();

  function toggleCart() {
    setMenuOpen(false);
    setView(view === "cart" ? null : "cart");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const linkClass = (active: boolean) =>
    active ? "underline underline-offset-2 decoration-2" : "hover:opacity-60";

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
        <CartIcon className="w-[15px] h-[15px]" />
        {hydrated && count > 0 ? `(${count})` : ""}
      </button>

      {menuOpen && (
        <>
          {/* Scrim — starts below the section bar so the menu trigger and the
              TopBar cart toggle stay usable; tap anywhere on it to close. */}
          <button
            type="button"
            aria-label={t("close")}
            onClick={closeMenu}
            className="md:hidden fixed inset-x-0 top-[52px] bottom-0 z-40 bg-black/10 cursor-default"
          />

          {/* Dropdown panel hanging from the shop section bar — one single
              block: the categories, then the language/currency switches at the
              same size, no internal separators. (The hirota section is reached
              via the TopBar logo → `/`, not from here.) */}
          <div className="md:hidden fixed inset-x-0 top-[52px] z-50 border-b border-border bg-white/80 backdrop-blur-md">
            <nav className="flex flex-col items-baseline gap-1 p-1.5 pb-3 text-[18px] leading-none">
              {CATEGORIES.map((category) => {
                const href = `/${category}`;
                return (
                  <Link
                    key={category}
                    href={href}
                    onClick={closeMenu}
                    className={linkClass(pathname === href && view === null)}
                  >
                    {tNav(
                      category === "karate-gi-custom"
                        ? "karateGiCustom"
                        : category === "karate-gi-standard"
                          ? "karateGiStandard"
                          : category,
                    )}
                  </Link>
                );
              })}

              {/* language / currency — the desktop TopBar group, relocated:
                  stacked, set off from the links by vertical space alone. */}
              <div className="mt-4 flex flex-col items-baseline gap-1">
                <LocaleSwitcher label={t("language")} />
                <CurrencySwitcher label={t("currency")} />
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
