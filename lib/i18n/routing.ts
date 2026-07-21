import { defineRouting } from "next-intl/routing";

// Single source of truth for the app's locales and routing behaviour.
// `localePrefix: "always"` means every URL is prefixed (/en, /ja) — there is no
// unprefixed default. JA is the default surface locale (HIROTA is a Japanese
// brand; the link is sent to Japanese users): with next-intl's locale detection
// on, a Japanese browser lands on /ja, and any non-English browser falls back to
// the /ja default too. Explicitly English browsers still get /en, and EN is
// always reachable via the switcher and /en URLs.
export const routing = defineRouting({
  locales: ["en", "ja"],
  defaultLocale: "ja",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
