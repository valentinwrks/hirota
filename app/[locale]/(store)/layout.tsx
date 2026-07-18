import { getUsdPerJpy } from "@/lib/currency/fx";
import { CurrencyProvider } from "@/lib/currency/CurrencyProvider";
import { CartProvider } from "@/lib/cart/CartProvider";
import { CheckoutProvider } from "@/lib/checkout/CheckoutProvider";
import { TopBar } from "@/components/chrome/TopBar";
import { LogoColumn } from "@/components/chrome/LogoColumn";
import { AboutColumn } from "@/components/chrome/AboutColumn";
import { ShopColumn } from "@/components/chrome/ShopColumn";
import { CartColumn } from "@/components/chrome/CartColumn";
import { CheckoutSheet } from "@/components/checkout/CheckoutSheet";
import { MobileChromeProvider } from "@/components/chrome/MobileChromeProvider";
import { MobilePanel } from "@/components/chrome/MobilePanel";
import { StoreMobileNav } from "@/components/chrome/StoreMobileNav";
import { StoreMobileMenu } from "@/components/chrome/StoreMobileMenu";

// Store chrome layout — the three/four-column "spreadsheet" storefront shell.
// Lives in the (store) route group so it wraps ONLY the public store, not the
// admin panel. Route groups are invisible in the URL, so every store path
// (/en, /en/obi, /en/product/…) is wrapped only here, not in the admin shell.
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // FX is fetched server-side and cached (see fx.ts); injected into the client
  // CurrencyProvider once. JPY is the source of truth, USD display-only.
  const usdPerJpy = await getUsdPerJpy();

  return (
    <CurrencyProvider rate={usdPerJpy}>
      <CartProvider>
        <CheckoutProvider>
          <MobileChromeProvider>
            {/* Fixed 26px top bar. Below md the right group is replaced by the
                mobile cart + menu controls (StoreMobileNav). */}
            <TopBar mobile={<StoreMobileNav />} />
            {/* Mobile menu panel — a TopBar sibling (z below it) so the opaque
                bar hides it while it slides in/out from behind. */}
            <StoreMobileMenu />
            {/* Column layout below the bar, filling the viewport.
                Below md: single column — shop inline; about and cart become
                full-screen overlays (MobilePanel) driven by the mobile menu.
                md–2xl: three regions — 22% / 56% / 22%.
                2xl+: four regions like the legacy UI — a 7.5% vertical-logo
                band appears and widths shift to 7.5 / 20 / 45 / 27.5. Shop is
                flex-1, so it absorbs the remainder in both layouts. */}
            <main className="mt-[26px] h-[calc(100dvh-26px)] flex overflow-hidden">
              <LogoColumn />
              <MobilePanel view="about">
                <AboutColumn />
              </MobilePanel>
              <ShopColumn>{children}</ShopColumn>
              <MobilePanel view="cart">
                <CartColumn />
              </MobilePanel>
            </main>
            {/* The checkout sheet is a full-screen overlay; it lives outside
                the column <main> and renders only when opened. */}
            <CheckoutSheet />
          </MobileChromeProvider>
        </CheckoutProvider>
      </CartProvider>
    </CurrencyProvider>
  );
}
