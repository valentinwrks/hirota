import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { getUsdPerJpy } from "@/lib/currency/fx";
import { CurrencyProvider } from "@/lib/currency/CurrencyProvider";
import { CartProvider } from "@/lib/cart/CartProvider";
import { TopBar } from "@/components/chrome/TopBar";
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
              {/* Three-region grid below the bar, filling the viewport. */}
              <main className="mt-[26px] h-[calc(100vh-26px)] flex overflow-hidden">
                {/* About = narrowest, Shop = widest, Cart = medium. */}
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
