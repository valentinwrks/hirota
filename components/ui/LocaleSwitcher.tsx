"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing, type Locale } from "@/lib/i18n/routing";

// EN/JA switch. Navigates to the same path under the chosen locale (next-intl
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
    <div className="flex items-center gap-1" aria-label={label}>
      {routing.locales.map((locale, i) => (
        <span key={locale} className="flex items-center gap-1">
          {i > 0 && <span className="text-neutral-300">/</span>}
          <button
            type="button"
            onClick={() => select(locale)}
            disabled={isPending}
            aria-pressed={locale === active}
            className={
              locale === active
                ? "uppercase text-black/70"
                : "uppercase text-black/40 hover:text-black/70"
            }
          >
            {locale}
          </button>
        </span>
      ))}
    </div>
  );
}
