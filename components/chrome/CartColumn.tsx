"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/lib/cart/CartProvider";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import { localize } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import { lineTotalJpy } from "@/lib/cart/types";

// Right "cart" column: medium width. Guest cart with localStorage persistence,
// rendered from the CartProvider. Line items, qty stepper, remove, subtotal in
// the currently-selected currency.
export function CartColumn() {
  const t = useTranslations("Cart");
  const locale = useLocale() as Locale;
  const { items, removeItem, setQuantity, subtotalJpy, hydrated } = useCart();
  const { format } = useCurrency();

  return (
    <section className="basis-[27%] shrink-0 overflow-y-auto overscroll-contain scrollbar-none">
      <div className="sticky top-0 z-10 h-[26px] flex items-center px-1.5 border-b border-line text-sm leading-none backdrop-blur-xs bg-paper/30">
        {t("title")}
      </div>

      {/* Until hydrated we render nothing beyond the header to avoid a flash of
          the empty state before localStorage loads. */}
      {!hydrated ? null : items.length === 0 ? (
        <div className="mt-2 mx-1.5 text-xs leading-tight">
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="mt-2 mx-1.5 text-xs leading-tight">
          <table className="w-full border-collapse">
            <tbody>
              {items.map((item) => (
                <tr key={item.lineId} className="align-top">
                  <td className="px-2 py-1 border border-line">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold truncate">
                          {localize(item.name, locale)}
                        </p>
                        {item.kind === "simple" &&
                          (item.size || item.color) && (
                            <p className="text-ink/40">
                              {[item.size, item.color]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        <div className="mt-1 flex items-center gap-2">
                          <label className="flex items-center gap-1">
                            <span className="text-ink/40">{t("qty")}</span>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                setQuantity(
                                  item.lineId,
                                  Math.max(1, Number(e.target.value) || 1),
                                )
                              }
                              className="w-10 text-right bg-transparent border border-line focus:outline-none px-1"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeItem(item.lineId)}
                            className="text-ink/40 underline hover:text-ink/70 cursor-pointer"
                          >
                            {t("remove")}
                          </button>
                        </div>
                      </div>
                      <p className="font-bold whitespace-nowrap">
                        {format(lineTotalJpy(item))}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between mt-2.5">
            <p className="text-base font-bold leading-tight">{t("subtotal")}</p>
            <p className="text-base font-bold leading-tight">
              {format(subtotalJpy)}
            </p>
          </div>

          {/* Checkout is a later sprint; honest disabled placeholder for now. */}
          <button
            type="button"
            disabled
            title={t("checkoutComing")}
            className="w-full mt-2.5 text-xs font-bold bg-transparent text-ink/30 border border-line-soft tracking-wide py-1 cursor-not-allowed"
          >
            {t("checkout")}
          </button>
        </div>
      )}
    </section>
  );
}
