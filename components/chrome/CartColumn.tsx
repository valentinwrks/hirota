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
  const tObi = useTranslations("Obi");
  const locale = useLocale() as Locale;
  const { items, removeItem, setQuantity, subtotalJpy, hydrated, count } =
    useCart();
  const { format } = useCurrency();

  // The configured-obi description, mirroring the configurator's right-panel
  // summary: one "Obi: …" line, then each embroidered end, then the label.
  function obiLines(s: {
    colorKey: string;
    materialKey: string;
    widthCm: number;
    sizeCode: number;
    endAChars: number;
    endBChars: number;
    endAText?: string;
    endBText?: string;
    threadColorKey?: string;
    labelName: string;
  }): string[] {
    const lines = [
      `${tObi("obiLine")}: ${[
        tObi(`colorsShort.${s.colorKey}`),
        tObi(`materialsShort.${s.materialKey}`),
        s.widthCm === 4 ? tObi("widthShortNormal") : tObi("widthShortSpecial"),
        `#${s.sizeCode}`,
      ].join(" · ")}`,
    ];
    const threadSuffix = s.threadColorKey
      ? `, ${tObi(`threadColorsShort.${s.threadColorKey}`)}`
      : "";
    if (s.endAChars > 0 && s.endAText) {
      lines.push(`${tObi("endAShort")}: ${s.endAText}${threadSuffix}`);
    }
    if (s.endBChars > 0 && s.endBText) {
      lines.push(`${tObi("endB")}: ${s.endBText}${threadSuffix}`);
    }
    lines.push(`${tObi("label")}: ${s.labelName}`);
    return lines;
  }

  return (
    <section className="basis-[27%] shrink-0 flex flex-col overflow-hidden">
      <div className="shrink-0 h-[26px] flex items-center px-1.5 border-b border-line text-sm leading-none bg-paper-30">
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
          {/* Scrollable items — grows to fill, keeping the footer pinned below. */}
          <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none mt-2.5 mx-2.5 text-xs leading-tight">
          <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2.5 -mt-2.5 -mb-2.5">
            <tbody>
              {items.map((item) => {
                // Options/config summary lines. Simple products get one line
                // (size · color, possibly empty); a configured obi gets its
                // multi-line description. An empty array reserves one blank line
                // so simple cards keep a consistent height.
                const summaryLines: string[] =
                  item.kind === "simple"
                    ? [[item.size, item.color].filter(Boolean).join(" · ")]
                    : item.config.kind === "obi"
                      ? obiLines(item.config.summary)
                      : [""];
                return (
                <tr key={item.lineId} className="align-top">
                  <td className="px-2 py-1 border border-line">
                    {/* name + line total */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold truncate min-w-0">
                        {localize(item.name, locale)}
                      </p>
                      <p className="font-bold whitespace-nowrap">
                        {format(lineTotalJpy(item))}
                      </p>
                    </div>

                    {/* Config summary — one line for simple products, several
                        for a configured obi. A blank line reserves height. */}
                    {summaryLines.map((line, i) => (
                      <p key={i} className="text-ink-40">
                        {line || " "}
                      </p>
                    ))}

                    {/* qty (left) + remove (bottom-right corner) */}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-ink-40">{t("qty")}</span>
                        <span className="min-w-[1.25rem] text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.lineId, item.quantity + 1)
                          }
                          aria-label={t("increase")}
                          className="w-4 h-4 flex items-center justify-center rounded-full leading-none text-ink-60 hover:bg-ink-10 cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            item.quantity > 1 &&
                            setQuantity(item.lineId, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          aria-label={t("decrease")}
                          className={
                            "w-4 h-4 flex items-center justify-center rounded-full leading-none " +
                            (item.quantity <= 1
                              ? "text-ink-20 cursor-default"
                              : "text-ink-60 hover:bg-ink-10 cursor-pointer")
                          }
                        >
                          −
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.lineId)}
                        className="text-ink-40 underline hover:text-ink-70 cursor-pointer"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Footer pinned to the bottom of the cart column. */}
          <div className="shrink-0 mx-2.5 mb-[15px] pt-2.5 text-xs leading-tight">
            <div className="flex justify-between">
              <p className="text-base font-bold leading-tight">{t("subtotal")}</p>
              <p className="text-base font-bold leading-tight">
                {format(subtotalJpy)}
              </p>
            </div>

            {/* Checkout is a later sprint; the button is styled like the legacy
                ADD TO CART CTA but intentionally does nothing yet. */}
            <button
              type="button"
              className="w-full mt-2.5 text-xs font-bold bg-transparent text-ink-50 border border-line tracking-wide py-1 hover:bg-ink-10 cursor-pointer"
            >
              {t("checkout")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
