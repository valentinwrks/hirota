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
  const tGi = useTranslations("GiStandard");
  const locale = useLocale() as Locale;
  const { items, removeItem, setQuantity, subtotalJpy, hydrated, count } =
    useCart();
  const { format } = useCurrency();

  // Simple product (equipment/accessories): one lowercase-labelled line per
  // offered variant ("size: S", "color: red"). A variant-less product keeps a
  // single blank line so its card matches the others' height.
  function simpleLines(item: { size?: string; color?: string }): string[] {
    const lines: string[] = [];
    if (item.size) lines.push(`${t("size")}: ${item.size}`);
    if (item.color) lines.push(`${t("color")}: ${item.color}`);
    return lines.length > 0 ? lines : [""];
  }

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
      `${tObi("obiLine").toLowerCase()}: ${[
        tObi(`colorsShort.${s.colorKey}`),
        tObi(`materialsShort.${s.materialKey}`),
        s.widthCm === 4 ? tObi("widthShortNormal") : tObi("widthShortSpecial"),
        `#${s.sizeCode}`,
      ].join(" · ")}`,
    ];
    const threadSuffix = s.threadColorKey
      ? ` (${tObi(`threadColorsShort.${s.threadColorKey}`)})`
      : "";
    if (s.endAChars > 0 && s.endAText) {
      lines.push(`${tObi("endAShort")}: ${s.endAText}${threadSuffix}`);
    }
    if (s.endBChars > 0 && s.endBText) {
      lines.push(`${tObi("endBShort")}: ${s.endBText}${threadSuffix}`);
    }
    lines.push(`${tObi("label").toLowerCase()}: ${s.labelName}`);
    return lines;
  }

  // The configured standard-gi description, mirroring the configurator's
  // right-panel summary: fit · #size, then mfr-logo, embroidered fields, C/H
  // shortening (with shrinkage), and the label.
  function giStandardLines(s: {
    modelSlug: string;
    fit: string;
    sizeCode: string;
    mfrLogo?: string;
    threadColorKey?: string;
    embroidery: { field: string; chars: number; text: string }[];
    sleeveCcm?: number;
    pantHcm?: number;
    shrinkage?: string;
    labelName: string;
  }): string[] {
    // Numeric sizes get a "#"; the small "S" sizes (S5–S7) are shown as-is.
    const sizeLabel = s.sizeCode.startsWith("S") ? s.sizeCode : `#${s.sizeCode}`;
    // Guard the model against stale cart items saved before modelSlug existed.
    const modelPart = s.modelSlug ? `${tGi(`modelShort.${s.modelSlug}`)} · ` : "";
    const lines = [
      `${tGi("giLine").toLowerCase()}: ${modelPart}${tGi(`fitsShort.${s.fit}`)} · ${sizeLabel}`,
    ];
    const threadSuffix = s.threadColorKey
      ? ` (${tGi(`threadColorsShort.${s.threadColorKey}`)})`
      : "";
    for (const f of s.embroidery) {
      lines.push(
        `${tGi(`embroideryFieldsShort.${f.field}`).toLowerCase()}: ${f.text}${threadSuffix}`,
      );
    }
    if (s.sleeveCcm != null) {
      lines.push(`${tGi("adjustCShort")}: ${s.sleeveCcm}cm`);
    }
    if (s.pantHcm != null) {
      lines.push(`${tGi("adjustHShort")}: ${s.pantHcm}cm`);
    }
    if (s.shrinkage) {
      lines.push(
        `${tGi("shrinkage").toLowerCase()}: ${tGi(`shrinkageOptions.${s.shrinkage}`)}`,
      );
    }
    if (s.mfrLogo) {
      lines.push(
        `${tGi("mfrLogo").toLowerCase()}: ${tGi(`mfrLogoPlacementsShort.${s.mfrLogo}`)}`,
      );
    }
    lines.push(`${tGi("label").toLowerCase()}: ${s.labelName}`);
    return lines;
  }

  return (
    <section className="basis-[22%] 2xl:basis-[27.5%] shrink-0 flex flex-col overflow-hidden">
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
          {/* Scrollable items — grows to fill, keeping the footer pinned below.
              The bottom edge fades to transparent (mask gradient) so a long list
              dissolves just above the subtotal, cueing that there's more to scroll. */}
          <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none mt-2.5 mx-2.5 pb-10 text-xs leading-tight [mask-image:linear-gradient(to_bottom,black_calc(100%_-_2.5rem),transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black_calc(100%_-_2.5rem),transparent)]">
          <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2.5 -mt-2.5 -mb-2.5">
            <tbody>
              {items.map((item) => {
                // Options/config summary lines. Simple products get one
                // "size: …" / "color: …" line per offered variant; a configured
                // obi/gi gets its multi-line description. A blank line reserves
                // height so a variant-less simple card keeps a consistent look.
                const summaryLines: string[] =
                  item.kind === "simple"
                    ? simpleLines(item)
                    : item.config.kind === "obi"
                      ? obiLines(item.config.summary)
                      : item.config.kind === "gi_standard"
                        ? giStandardLines(item.config.summary)
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
                    <div className="mt-0">
                    {summaryLines.map((line, i) => (
                      <p key={i} className="text-ink-40">
                        {line || " "}
                      </p>
                    ))}
                    </div>

                    {/* qty (left) + remove (bottom-right corner) */}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0">
                        <span className="text-ink-40">{`${t("qty")}: `}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.lineId, item.quantity + 1)
                          }
                          aria-label={t("increase")}
                          className="w-4 h-4 flex items-center justify-center rounded-full leading-none text-ink-60 cursor-pointer"
                        >
                          +
                        </button>
                        <span className="min-w-[1rem] text-center tabular-nums">
                          {item.quantity}
                        </span>
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
                              : "text-ink-60 cursor-pointer")
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
          <div className="shrink-0 mx-2.5 mb-[10px] pt-2.5 text-xs leading-tight">
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
