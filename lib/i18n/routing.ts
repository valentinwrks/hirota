import { defineRouting } from "next-intl/routing";

// Single source of truth for the app's locales and routing behaviour.
// `localePrefix: "always"` means every URL is prefixed (/en, /ja) — there is no
// unprefixed default. JPY/JA are HIROTA's source-of-truth locale/currency, but
// EN is the default surface locale for this portfolio build.
export const routing = defineRouting({
  locales: ["en", "ja"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
