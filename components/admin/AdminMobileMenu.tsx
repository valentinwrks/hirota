"use client";

import { Fragment, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { SECTIONS } from "./AdminSidebar";
import { useAdminMobileChrome } from "./AdminMobileChromeProvider";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

// Admin mobile (< md) menu — the same white flap the public store uses
// (StoreMobileMenu): parked behind the TopBar and sliding down on open (300ms
// material easing), its rows fading + rising in on a stagger. Content is the
// admin's: the six sections, the language switch, and sign-out. Rendered as a
// TopBar sibling with a z BELOW it so the opaque bar hides it while parked; open
// state is shared with the trigger via AdminMobileChromeProvider. `signOut`
// arrives as a slot because SignOutButton is a server component (server action).
export function AdminMobileMenu({
  locale,
  signOut,
}: {
  locale: string;
  signOut: ReactNode;
}) {
  const t = useTranslations("TopBar");
  const tAdmin = useTranslations("Admin");
  const { menuOpen } = useAdminMobileChrome();
  const pathname = usePathname();

  // Per-item entrance: fade + rise, staggered on open; delays collapse to 0 on
  // close so the panel just slides back up without a reverse ripple. transition-all
  // is required — Tailwind v4 translate-* sets the CSS `translate` property.
  const itemClass =
    "transition-all duration-150 ease-out " +
    (menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[40px]");
  // Hold items hidden until the panel is most of the way down, THEN stagger.
  const PANEL_MS = 200;
  const itemDelay = (i: number) => ({
    transitionDelay: menuOpen ? `${PANEL_MS + i * 40}ms` : "0ms",
  });

  // Per-locale link styling. JA: every link is bold (matching the desktop
  // sidebar's JA weight), and the active one is set apart by a fainter text
  // color instead of a weight change — a lower alpha than the base foreground
  // (rgba 0,0,0,.5). We use a text color, NOT the `opacity` utility, because the
  // entrance animation above already owns `opacity`. EN: active is bold, the rest
  // plain, dimming on hover.
  const linkClass = (active: boolean) =>
    locale === "ja"
      ? "font-bold " + (active ? "text-black/30" : "hover:opacity-60")
      : active
        ? "font-bold"
        : "hover:opacity-60";

  return (
    <div
      aria-hidden={!menuOpen}
      inert={!menuOpen}
      className={
        "md:hidden fixed inset-x-0 top-[32px] z-[45] rounded-b-3xl bg-white " +
        "shadow-[0_4px_6px_-2px_rgba(0,0,0,0.12)] transition-all duration-300 " +
        "[transition-timing-function:cubic-bezier(0.4,0,0.2,1)] " +
        (menuOpen ? "translate-y-0" : "-translate-y-full pointer-events-none")
      }
    >
      <nav
        className={
          "flex flex-col items-baseline gap-1 p-[9px] pt-[14px] pb-[14px] text-[28px] leading-none " +
          // EN labels are authored capitalized; render as-is. JA stays lowercased.
          (locale === "en" ? "normal-case" : "lowercase")
        }
      >
        {SECTIONS.map(({ href, key }, i) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          // Two group hints, mirroring the desktop sidebar: "content" (i 1) and
          // the catalog mirrors (i 2). Orders (i 0) gets no hint — its own label
          // already reads "orders", so a subtitle would just repeat it.
          const group =
            i === 1
              ? "nav.groupContent"
              : i === 2
                ? "nav.groupPricing"
                : null;
          return (
            <Fragment key={href}>
              {group ? (
                <p
                  style={itemDelay(i)}
                  className={
                    "mt-3 px-0.5 text-xs normal-case text-foreground-muted " +
                    itemClass
                  }
                >
                  {tAdmin(group)}
                </p>
              ) : null}
              {i === 0 ? (
                // The orders link shares its row with the language switch, pinned
                // to the opposite end. The admin is JPY-only, so no currency
                // switch (see shell).
                <div
                  style={itemDelay(0)}
                  className={
                    "flex w-full items-center justify-between " + itemClass
                  }
                >
                  <Link
                    href={href}
                    locale={locale}
                    className={linkClass(active)}
                  >
                    {tAdmin(`sections.${key}`)}
                  </Link>
                  <LocaleSwitcher label={t("language")} size="xl" />
                </div>
              ) : (
                <Link
                  href={href}
                  locale={locale}
                  style={itemDelay(i)}
                  className={itemClass + " " + linkClass(active)}
                >
                  {tAdmin(`sections.${key}`)}
                </Link>
              )}
            </Fragment>
          );
        })}

        {/* sign-out on its own last line — the bordered, full-width "button"
            variant, closing the stagger. Extra px-[11px] on top of the nav's 9px
            padding lands the button 20px in from each flap edge. */}
        <div
          style={itemDelay(SECTIONS.length)}
          className={"mt-4 flex flex-col w-full px-[11px] " + itemClass}
        >
          {signOut}
        </div>
      </nav>
    </div>
  );
}
