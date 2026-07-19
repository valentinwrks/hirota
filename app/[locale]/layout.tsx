import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { ImageGuard } from "@/components/chrome/ImageGuard";
import "../globals.css";

export const metadata: Metadata = {
  title: "HIROTA — BEST KARATE-GI",
  description:
    "HIROTA — premium Japanese karate-gi and equipment. Self-initiated concept storefront.",
  // Suppress Chrome/Google's automatic page translation — the app ships its own
  // EN/JA i18n, so the browser's machine translation would only fight it. Emits
  // <meta name="google" content="notranslate">; paired with translate="no" on
  // <html> below for the strongest signal.
  other: { google: "notranslate" },
};

// Pre-render both locale shells.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Root locale layout — deliberately MINIMAL: <html>/<body>, the intl provider,
// and the background gradient (globals.css). It is the common ancestor of BOTH
// the store and the admin panel, so it must NOT carry store-only chrome
// (TopBar, columns, cart). Those live in (store)/layout.tsx; the admin panel
// brings its own shell. Route groups — (store) and admin — don't affect URLs.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Next 16: route params are async — await them.
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this locale segment (next-intl).
  setRequestLocale(locale);

  // Store client components read chrome strings from this provider. Admin is
  // hardcoded English and doesn't depend on messages.
  const messages = await getMessages();

  return (
    <html lang={locale} translate="no" className="h-full antialiased notranslate">
      {/* NOTE: body background gradient is applied in globals.css — do not touch. */}
      <body className="min-h-full">
        <NextIntlClientProvider messages={messages}>
          <ImageGuard />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
