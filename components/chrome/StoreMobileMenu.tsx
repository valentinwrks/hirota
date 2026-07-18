"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { type NavCategory } from "@/lib/catalog/types";
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

// The mobile (< md) store menu: a white "flap" that slides down from behind the
// TopBar (translateY, 300ms, material easing) with its links fading + rising in
// on a 30ms stagger — mirrors the reference site's framer-motion menu, done here
// with plain CSS transitions (no extra deps). Rendered as a TopBar SIBLING with
// a z-index BELOW it (in the store layout) so the opaque TopBar hides the panel
// while it's parked out of view above. It stays mounted; `menuOpen` just toggles
// the transforms, and the panel's own bottom shadow doubles as the TopBar's
// separation shadow when parked (it rides down to the flap edge as it opens).
export function StoreMobileMenu() {
  const t = useTranslations("TopBar");
  const tNav = useTranslations("Nav");
  const { view, menuOpen, setMenuOpen } = useMobileChrome();
  const pathname = usePathname();

  const closeMenu = () => setMenuOpen(false);
  const linkClass = (active: boolean) =>
    active ? "underline underline-offset-2 decoration-2" : "hover:opacity-60";

  // Per-item entrance: fade + rise, staggered on open; delays collapse to 0 on
  // close so the panel just slides back up without a reverse ripple.
  const itemClass =
    "transition-[opacity,transform] duration-150 ease-out " +
    (menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[30px]");
  const itemDelay = (i: number) => ({
    transitionDelay: menuOpen ? `${i * 30}ms` : "0ms",
  });

  return (
    <div
      aria-hidden={!menuOpen}
      inert={!menuOpen}
      className={
        "md:hidden fixed inset-x-0 top-[26px] z-[45] rounded-b-3xl bg-white " +
        "shadow-[0_4px_6px_-2px_rgba(0,0,0,0.12)] transition-transform duration-300 " +
        "[transition-timing-function:cubic-bezier(0.4,0,0.2,1)] " +
        (menuOpen ? "translate-y-0" : "-translate-y-full pointer-events-none")
      }
    >
      <nav className="flex flex-col items-baseline gap-1 p-1.5 pb-3 text-2xl leading-none">
        {CATEGORIES.map((category, i) => {
          const href = `/${category}`;
          return (
            <Link
              key={category}
              href={href}
              onClick={closeMenu}
              style={itemDelay(i)}
              className={itemClass + " " + linkClass(pathname === href && view === null)}
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

        {/* language / currency — each nudged inward by ~the flap's corner radius
            so they clear the rounded corners and read more centred. Appears last
            in the stagger. */}
        <div
          style={itemDelay(CATEGORIES.length)}
          className={"mt-4 flex w-full items-baseline justify-between " + itemClass}
        >
          <div className="ml-3">
            <LocaleSwitcher label={t("language")} />
          </div>
          <div className="mr-3">
            <CurrencySwitcher label={t("currency")} />
          </div>
        </div>
      </nav>
    </div>
  );
}
