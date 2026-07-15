"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { SECTIONS } from "./AdminSidebar";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/ui/CurrencySwitcher";

// Mobile (< md) admin navigation: a "menu" trigger in the TopBar opening a
// DROPDOWN under it with the six sections, the language/currency switches the
// desktop TopBar shows inline, and the sign-out control. `signOut` arrives as a
// slot because SignOutButton is a server component (posts to a server action).
// Chrome labels are hardcoded English like the rest of the admin.
export function AdminMobileNav({
  locale,
  signOut,
}: {
  locale: string;
  signOut: ReactNode;
}) {
  const t = useTranslations("TopBar");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation so the destination section is visible.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={
          "cursor-pointer " +
          (open ? "text-foreground-strong" : "text-foreground")
        }
      >
        {open ? "close" : "menu"}
      </button>

      {open && (
        <>
          {/* Scrim — tap anywhere outside the dropdown to close. */}
          <button
            type="button"
            aria-label="close"
            onClick={() => setOpen(false)}
            className="md:hidden fixed inset-x-0 top-[26px] bottom-0 z-40 bg-black/10 cursor-default"
          />

          {/* Dropdown panel under the TopBar. */}
          <div className="md:hidden fixed inset-x-0 top-[26px] z-50 border-b border-border bg-white/80 backdrop-blur-md">
            <div className="h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none font-bold text-foreground-strong">
              HIROTA / ADMIN
            </div>

            <nav className="flex flex-col p-1.5 pb-3 gap-0.5">
              {SECTIONS.map(({ href, label }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    locale={locale}
                    onClick={() => setOpen(false)}
                    className={
                      active
                        ? "px-2 py-1 leading-none font-bold text-foreground"
                        : "px-2 py-1 leading-none text-foreground hover:bg-foreground-hover-subtle"
                    }
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* language / currency — the desktop TopBar group, relocated. */}
            <div className="flex items-center justify-between border-t border-border px-1.5 py-2 text-[13px] leading-none">
              <LocaleSwitcher label={t("language")} />
              <CurrencySwitcher label={t("currency")} />
            </div>

            <div className="border-t border-border p-1.5">{signOut}</div>
          </div>
        </>
      )}
    </>
  );
}
