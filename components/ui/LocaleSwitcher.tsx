"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";

// Display order + labels. The routing locale codes stay "en"/"ja" (URLs, next-intl);
// only the surfaced label differs (ja → "JA"). JA is shown first per design.
const LOCALE_ORDER: { locale: Locale; label: string }[] = [
  { locale: "ja", label: "JA" },
  { locale: "en", label: "EN" },
];

// EN/JA switch. Navigates to the same path under the chosen locale (next-intl
// locale-aware router preserves the current route + params).
export function LocaleSwitcher({
  label,
  mobile = false,
}: {
  label: string;
  /** Mobile-menu tone: solid #404040 text, and the selected option blinks like
   *  the active nav link (.blink-active) instead of the desktop transparency
   *  scheme. */
  mobile?: boolean;
}) {
  const active = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function select(locale: Locale) {
    if (locale === active) return;
    startTransition(() => {
      // Re-navigate to the current pathname under the new locale.
      router.replace(
        // @ts-expect-error -- pathname/params typing is route-specific; safe here.
        { pathname, params },
        { locale },
      );
    });
  }

  return (
    <div className="flex items-center gap-0.5" aria-label={label}>
      {LOCALE_ORDER.map(({ locale, label: code }, i) => {
        const isActive = locale === active;
        return (
          <span key={locale} className="flex items-center gap-0.5">
            {i > 0 && (
              <span className={mobile ? "text-[#404040]" : "text-foreground-muted"}>
                ·
              </span>
            )}
            <button
              type="button"
              onClick={() => select(locale)}
              disabled={isPending}
              aria-pressed={isActive}
              className={
                "cursor-pointer uppercase " +
                (mobile
                  ? "text-[#404040]" +
                    (isActive ? " blink-active" : " hover:opacity-60")
                  : isActive
                    ? "text-foreground-strong"
                    : "text-foreground-muted hover:text-foreground-strong")
              }
            >
              {code}
            </button>
          </span>
        );
      })}
    </div>
  );
}
