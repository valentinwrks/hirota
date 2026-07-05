import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { getUsdPerJpy } from "@/lib/currency/fx";
import { CurrencyProvider } from "@/lib/currency/CurrencyProvider";
import { CartProvider } from "@/lib/cart/CartProvider";
import { TopBar } from "@/components/chrome/TopBar";
import { LogoColumn } from "@/components/chrome/LogoColumn";
import { AboutColumn } from "@/components/chrome/AboutColumn";
import { ShopColumn } from "@/components/chrome/ShopColumn";
import { CartColumn } from "@/components/chrome/CartColumn";
import "../globals.css";

export const metadata: Metadata = {
  title: "HIROTA — BEST KARATE-GI",
  description:
    "HIROTA — premium Japanese karate-gi and equipment. Self-initiated concept storefront.",
};

// Pre-render both locale shells.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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

  // FX is fetched server-side and cached (see fx.ts); injected into the client
  // CurrencyProvider once. JPY is the source of truth, USD display-only.
  const [messages, usdPerJpy] = await Promise.all([
    getMessages(),
    getUsdPerJpy(),
  ]);

  return (
    <html lang={locale} className="h-full antialiased">
      {/* NOTE: body background gradient is applied in globals.css — do not touch. */}
      <body className="min-h-full">
        <NextIntlClientProvider messages={messages}>
          <CurrencyProvider rate={usdPerJpy}>
            <CartProvider>
              {/* Fixed 26px top bar. */}
              <TopBar />
              {/* Column layout below the bar, filling the viewport.
                  Default (< 2xl): three regions — 22% / 56% / 22%.
                  2xl+: four regions like the legacy UI — a 7.5% vertical-logo
                  band appears and widths shift to 7.5 / 20 / 45 / 27.5. Shop is
                  flex-1, so it absorbs the remainder in both layouts. */}
              <main className="mt-[26px] h-[calc(100vh-26px)] flex overflow-hidden">
                <LogoColumn />
                <AboutColumn />
                <ShopColumn>{children}</ShopColumn>
                <CartColumn />
              </main>
            </CartProvider>
          </CurrencyProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
