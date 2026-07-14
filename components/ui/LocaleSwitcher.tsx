"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";

// Display order + labels. The routing locale codes stay "en"/"ja" (URLs, next-intl);
// only the surfaced label differs (ja → "JP"). JP is shown first per design.
const LOCALE_ORDER: { locale: Locale; label: string }[] = [
  { locale: "ja", label: "JP" },
  { locale: "en", label: "EN" },
];

// EN/JP switch. Navigates to the same path under the chosen locale (next-intl
// locale-aware router preserves the current route + params).
export function LocaleSwitcher({ label }: { label: string }) {
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
      {LOCALE_ORDER.map(({ locale, label: code }, i) => (
        <span key={locale} className="flex items-center gap-0.5">
          {i > 0 && <span className="text-foreground-muted">·</span>}
          <button
            type="button"
            onClick={() => select(locale)}
            disabled={isPending}
            aria-pressed={locale === active}
            className={
              "cursor-pointer " +
              (locale === active
                ? "uppercase text-foreground-selected"
                : "uppercase text-foreground-muted hover:text-foreground-selected")
            }
          >
            {code}
          </button>
        </span>
      ))}
    </div>
  );
}
