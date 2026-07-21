"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { PillSwitch } from "./PillSwitch";

// Display order + labels. The routing locale codes stay "en"/"ja" (URLs, next-intl);
// only the surfaced label differs (ja → "JA"). JA is shown first per design.
const LOCALE_ORDER: { locale: Locale; label: string }[] = [
  { locale: "ja", label: "JPN" },
  { locale: "en", label: "ENG" },
];

// EN/JA switch. Navigates to the same path under the chosen locale (next-intl
// locale-aware router preserves the current route + params).
export function LocaleSwitcher({
  label,
  mobile = false,
}: {
  label: string;
  /** Mobile-menu placement: renders the larger pill size to sit alongside the
   *  menu's big type. */
  mobile?: boolean;
}) {
  const active = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [, startTransition] = useTransition();
  // Optimistic locale: moves the pill the instant the user clicks, so the slide
  // animation plays on THIS (still-mounted) instance while the locale route
  // re-renders in the background. Without it the whole tree re-mounts with the
  // new `active` and the pill would just snap to the far side (no transition).
  const [optimistic, setOptimistic] = useOptimistic(active);

  function select(locale: Locale) {
    if (locale === active) return;
    startTransition(() => {
      setOptimistic(locale);
      // Re-navigate to the current pathname under the new locale.
      router.replace(
        // @ts-expect-error -- pathname/params typing is route-specific; safe here.
        { pathname, params },
        { locale },
      );
    });
  }

  return (
    <PillSwitch
      label={label}
      value={optimistic}
      onSelect={select}
      size={mobile ? "lg" : "sm"}
      options={[
        { value: LOCALE_ORDER[0].locale, label: LOCALE_ORDER[0].label },
        { value: LOCALE_ORDER[1].locale, label: LOCALE_ORDER[1].label },
      ]}
    />
  );
}
