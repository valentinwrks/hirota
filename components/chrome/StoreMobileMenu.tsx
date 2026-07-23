"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { type NavCategory } from "@/lib/catalog/types";
import { useMobileChrome } from "./MobileChromeProvider";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/ui/CurrencySwitcher";

const CATEGORIES: NavCategory[] = [
  "karate-gi",
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
  const locale = useLocale();
  const { view, menuOpen, setMenuOpen } = useMobileChrome();
  const pathname = usePathname();

  // The Japanese category labels read better bold (weight 700); Latin ones keep
  // the normal weight.
  const linkWeight = locale === "ja" ? "font-bold" : "";

  // EN category labels are stored lowercase; render them starting with a capital.
  // `first-letter:uppercase` (not `capitalize`) so "karate-gi" -> "Karate-gi".
  const linkCase = locale === "en" ? " first-letter:uppercase" : "";

  const closeMenu = () => setMenuOpen(false);

  // Per-item entrance: fade + rise, staggered on open; delays collapse to 0 on
  // close so the panel just slides back up without a reverse ripple.
  // NB: Tailwind v4 translate-* utilities set the CSS `translate` property, not
  // `transform`, so the transition must cover it — `transition-all` does (an
  // explicit `transition-[opacity,transform]` would animate only the fade).
  const itemClass =
    "transition-all duration-150 ease-out " +
    (menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[40px]");
  // Hold every item hidden until the panel is most of the way down (PANEL_MS,
  // just under its 300ms slide), THEN run the stagger — otherwise the first links
  // would "arrive" while still parked behind the TopBar and you'd never see them
  // enter. Delays drop to 0 on close so the panel just slides back up.
  const PANEL_MS = 200;
  const itemDelay = (i: number) => ({
    transitionDelay: menuOpen ? `${PANEL_MS + i * 40}ms` : "0ms",
  });

  return (
    <>
      {/* Tap-outside-to-close scrim. Transparent, covering the screen below the
          TopBar; sits under the flap (z-[45]) and TopBar (z-50) so both stay
          interactive, and only exists while the menu is open. */}
      {menuOpen && (
        <div
          aria-hidden
          onClick={closeMenu}
          className="md:hidden fixed inset-x-0 top-[32px] bottom-0 z-[44]"
        />
      )}
      <div
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={
          "md:hidden fixed inset-x-0 top-[32px] z-[45] rounded-b-4xl bg-white " +
        "shadow-[0_5px_6px_-2px_rgba(0,0,0,0.24)] transition-all duration-300 " +
        "[transition-timing-function:cubic-bezier(0.4,0,0.2,1)] " +
        (menuOpen ? "translate-y-0" : "-translate-y-full pointer-events-none")
      }
    >
      <nav className="flex flex-col items-baseline gap-1 p-[9px] pt-[14px] pb-[14px] text-3xl leading-none">
        {CATEGORIES.map((category, i) => {
          const href = `/${category}`;
          const active = pathname === href && view === null;
          return (
            <Link
              key={category}
              href={href}
              onClick={closeMenu}
              style={itemDelay(i)}
              className={
                itemClass +
                " text-[#404040] " +
                linkWeight +
                linkCase +
                (active ? "" : " hover:opacity-60")
              }
            >
              {/* Active category blinks (hard on/off — see .blink-active). The
                  blink lives on this inner span so its opacity animation doesn't
                  collide with the Link's entrance opacity transition (transitions
                  outrank animations in the cascade). */}
              <span className={active ? "blink-active" : undefined}>
                {tNav(category === "karate-gi" ? "karateGi" : category)}
              </span>
            </Link>
          );
        })}

        {/* language / currency — one row, language at the left and currency at
            the right. Appears last in the stagger. */}
        <div
          style={itemDelay(CATEGORIES.length)}
          className={"mt-[21px] flex w-full items-center justify-center gap-6 " + itemClass}
        >
          <LocaleSwitcher label={t("language")} size="xl" />
          <CurrencySwitcher label={t("currency")} size="xl" />
        </div>
      </nav>
      </div>
    </>
  );
}
