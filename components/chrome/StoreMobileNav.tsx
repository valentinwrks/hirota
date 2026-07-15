"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { type NavCategory } from "@/lib/catalog/types";
import { useCart } from "@/lib/cart/CartProvider";
import { useMobileChrome } from "./MobileChromeProvider";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/ui/CurrencySwitcher";

const CATEGORIES: NavCategory[] = [
  "karate-gi-custom",
  "karate-gi-standard",
  "obi",
  "equipment",
  "accessories",
];

// Mobile (< md) TopBar controls for the store: a direct cart toggle (always
// visible, with the line count) and the menu trigger. The menu is a DROPDOWN
// under the TopBar — categories, about, and the language/currency switches that
// the desktop TopBar shows inline — over a light scrim that closes it.
export function StoreMobileNav() {
  const t = useTranslations("TopBar");
  const tNav = useTranslations("Nav");
  const tCart = useTranslations("Cart");
  const tAbout = useTranslations("About");
  const { view, setView, menuOpen, setMenuOpen } = useMobileChrome();
  const { count, hydrated } = useCart();
  const pathname = usePathname();

  function toggleCart() {
    setMenuOpen(false);
    setView(view === "cart" ? null : "cart");
  }

  function openAbout() {
    setMenuOpen(false);
    setView("about");
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
        className={
          "cursor-pointer " +
          (view === "cart" ? "text-foreground-strong" : "text-foreground")
        }
      >
        {tCart("title")}
        {hydrated && count > 0 ? `(${count})` : ""}
      </button>

      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        className={
          "cursor-pointer " +
          (menuOpen ? "text-foreground-strong" : "text-foreground")
        }
      >
        {menuOpen ? t("close") : t("menu")}
      </button>

      {menuOpen && (
        <>
          {/* Scrim — tap anywhere outside the dropdown to close. */}
          <button
            type="button"
            aria-label={t("close")}
            onClick={closeMenu}
            className="md:hidden fixed inset-x-0 top-[26px] bottom-0 z-40 bg-black/10 cursor-default"
          />

          {/* Dropdown panel under the TopBar. */}
          <div className="md:hidden fixed inset-x-0 top-[26px] z-50 border-b border-border bg-white/80 backdrop-blur-md">
            {/* shop — section header + the same category list as CategoryNav. */}
            <div className="h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none">
              {tNav("shop")}
            </div>
            <nav className="flex flex-col items-baseline gap-1 p-1.5 pb-3 text-[18px] leading-none">
              {CATEGORIES.map((category) => {
                const href = `/catalog/${category}`;
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
            </nav>

            {/* about — opens the full-screen overlay. */}
            <div className="border-t border-border p-1.5 pb-3">
              <button
                type="button"
                onClick={openAbout}
                className={
                  "text-[18px] leading-none cursor-pointer " +
                  linkClass(view === "about")
                }
              >
                {tAbout("title")}
              </button>
            </div>

            {/* language / currency — the desktop TopBar group, relocated. */}
            <div className="flex items-center justify-between border-t border-border px-1.5 py-2 text-[13px] leading-none">
              <LocaleSwitcher label={t("language")} />
              <CurrencySwitcher label={t("currency")} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
