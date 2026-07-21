"use client";

import { type ReactNode } from "react";
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
      <nav className="flex flex-col items-baseline gap-1 p-[9px] pb-[14px] text-2xl leading-none lowercase">
        {SECTIONS.map(({ href, key }, i) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              locale={locale}
              style={itemDelay(i)}
              className={
                itemClass + (active ? " font-bold" : " hover:opacity-60")
              }
            >
              {tAdmin(`sections.${key}`)}
            </Link>
          );
        })}

        {/* language switch (left) + sign-out (right). Appears last in the
            stagger. The admin is JPY-only, so no currency switch (see shell). */}
        <div
          style={itemDelay(SECTIONS.length)}
          className={"mt-4 flex w-full items-center justify-between " + itemClass}
        >
          <LocaleSwitcher label={t("language")} />
          {signOut}
        </div>
      </nav>
    </div>
  );
}
