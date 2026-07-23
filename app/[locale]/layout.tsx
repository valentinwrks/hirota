import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { ImageGuard } from "@/components/chrome/ImageGuard";
import { Preloader } from "@/components/ui/Preloader";
import "../globals.css";

// Production origin — base for absolute canonical/OG/twitter URLs. Relative
// paths in metadata are resolved against this, so OG images and hreflang links
// come out absolute (required by crawlers and social scrapers).
const SITE_URL = "https://hirota-karate-gi.vercel.app";

// Localized, per-locale metadata. Replaces a static English `metadata` export
// so titles/descriptions/OG match the active locale like the rest of the UI.
// The OG/Twitter *images* are supplied by the `opengraph-image`/`twitter-image`
// file conventions in this segment — do NOT also set `openGraph.images` here or
// they'd be emitted twice.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  const ogLocale = locale === "ja" ? "ja_JP" : "en_US";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("title"),
      // Child pages set only their own segment; "%s" is filled with it and the
      // brand suffix is appended automatically.
      template: t("titleTemplate"),
    },
    description: t("description"),
    applicationName: t("siteName"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        ja: "/ja",
        "x-default": "/en",
      },
    },
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      title: t("title"),
      description: t("description"),
      url: `/${locale}`,
      locale: ogLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    // Suppress Chrome/Google's automatic page translation — the app ships its own
    // EN/JA i18n, so the browser's machine translation would only fight it. Emits
    // <meta name="google" content="notranslate">; paired with translate="no" on
    // <html> below for the strongest signal.
    other: { google: "notranslate" },
  };
}

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
          <Preloader />
          <ImageGuard />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
