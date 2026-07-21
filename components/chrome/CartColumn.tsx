"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/lib/cart/CartProvider";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import { useCheckout } from "@/lib/checkout/CheckoutProvider";
import { CartItemCard } from "@/components/cart/CartItemCard";
import { MobileCloseButton } from "@/components/chrome/MobileCloseButton";
import { ColumnReveal } from "@/components/chrome/ColumnReveal";

// Right "cart" column: medium width. Guest cart with localStorage persistence,
// rendered from the CartProvider. Line items (via the shared CartItemCard),
// subtotal in the currently-selected currency, and the checkout trigger.
export function CartColumn() {
  const t = useTranslations("Cart");
  const locale = useLocale();
  const { items, subtotalJpy, hydrated, count } = useCart();
  const { format } = useCurrency();
  const { open } = useCheckout();

  return (
    <section className="basis-[22%] 2xl:basis-[27.5%] shrink-0 flex flex-col overflow-hidden max-md:h-full">
      {/* Header — desktop only; on mobile the cart is toggled from the TopBar
          bag icon (which also shows the count), so this "cart" row is dropped. */}
      <div className="max-md:hidden shrink-0 h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none">
        {t("title")}
        {hydrated && count > 0 ? `(${count})` : ""}
        <MobileCloseButton />
      </div>

      {/* Until hydrated we render nothing beyond the header to avoid a flash of
          the empty state before localStorage loads. The reveal wrapper carries
          the flex sizing so the footer stays pinned below the scrolling items. */}
      <ColumnReveal revealKey={locale} className="flex-1 min-h-0 flex flex-col">
      {!hydrated ? null : items.length === 0 ? (
        <div className="mt-2.5 mx-2.5 max-md:mx-2 text-xs leading-tight">
          {/* Larger on the mobile cart flap, where the empty state is the whole
              full-screen surface; stays compact in the narrow desktop column. */}
          <p className="max-md:text-lg">{t("empty")}</p>
        </div>
      ) : (
        <>
          {/* Scrollable items — grows to fill, keeping the footer pinned below.
              The bottom edge fades to transparent (mask gradient) so a long list
              dissolves just above the subtotal, cueing that there's more to scroll. */}
          <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none mt-2.5 mx-2.5 max-md:mx-2 pb-10 text-xs leading-tight [mask-image:linear-gradient(to_bottom,black_calc(100%_-_2.5rem),transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black_calc(100%_-_2.5rem),transparent)]">
          <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2.5 -mt-2.5 -mb-2.5">
            <tbody>
              {items.map((item) => (
                <CartItemCard key={item.lineId} item={item} />
              ))}
            </tbody>
          </table>
          </div>

          {/* Footer pinned to the bottom of the cart column. */}
          <div className="shrink-0 mx-2.5 max-md:mx-2 mb-[10px] pt-2.5 text-xs leading-tight">
            <div className="flex justify-between">
              <p className="text-base font-bold leading-tight">{t("subtotal")}</p>
              <p className="text-base font-bold leading-tight">
                {format(subtotalJpy)}
              </p>
            </div>

            <button
              type="button"
              onClick={open}
              className="w-full mt-2.5 text-xs font-bold bg-transparent text-foreground border border-border tracking-wide py-1 hover:bg-foreground-hover cursor-pointer"
            >
              {t("checkout")}
            </button>
          </div>
        </>
      )}
      </ColumnReveal>
    </section>
  );
}
