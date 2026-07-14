"use client";

import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart/CartProvider";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import { useCheckout } from "@/lib/checkout/CheckoutProvider";
import { CartItemCard } from "@/components/cart/CartItemCard";

// Right "cart" column: medium width. Guest cart with localStorage persistence,
// rendered from the CartProvider. Line items (via the shared CartItemCard),
// subtotal in the currently-selected currency, and the checkout trigger.
export function CartColumn() {
  const t = useTranslations("Cart");
  const { items, subtotalJpy, hydrated, count } = useCart();
  const { format } = useCurrency();
  const { open } = useCheckout();

  return (
    <section className="basis-[22%] 2xl:basis-[27.5%] shrink-0 flex flex-col overflow-hidden">
      <div className="shrink-0 h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none bg-paper-30">
        {t("title")}
        {hydrated && count > 0 ? `(${count})` : ""}
      </div>

      {/* Until hydrated we render nothing beyond the header to avoid a flash of
          the empty state before localStorage loads. */}
      {!hydrated ? null : items.length === 0 ? (
        <div className="mt-2.5 mx-2.5 text-xs leading-tight">
          <p>{t("empty")}</p>
        </div>
      ) : (
        <>
          {/* Scrollable items — grows to fill, keeping the footer pinned below.
              The bottom edge fades to transparent (mask gradient) so a long list
              dissolves just above the subtotal, cueing that there's more to scroll. */}
          <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none mt-2.5 mx-2.5 pb-10 text-xs leading-tight [mask-image:linear-gradient(to_bottom,black_calc(100%_-_2.5rem),transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black_calc(100%_-_2.5rem),transparent)]">
          <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2.5 -mt-2.5 -mb-2.5">
            <tbody>
              {items.map((item) => (
                <CartItemCard key={item.lineId} item={item} />
              ))}
            </tbody>
          </table>
          </div>

          {/* Footer pinned to the bottom of the cart column. */}
          <div className="shrink-0 mx-2.5 mb-[10px] pt-2.5 text-xs leading-tight">
            <div className="flex justify-between">
              <p className="text-base font-bold leading-tight">{t("subtotal")}</p>
              <p className="text-base font-bold leading-tight">
                {format(subtotalJpy)}
              </p>
            </div>

            <button
              type="button"
              onClick={open}
              className="w-full mt-2.5 text-xs font-bold bg-transparent text-ink-50 border border-border tracking-wide py-1 hover:bg-ink-10 cursor-pointer"
            >
              {t("checkout")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
