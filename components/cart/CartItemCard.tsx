"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/lib/cart/CartProvider";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import { localize } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import { type CartItem, lineTotalJpy } from "@/lib/cart/types";

// One cart line, rendered as a bordered table row. Shared by the always-visible
// cart column and the checkout summary. In `readOnly` mode (checkout) the qty is
// fixed text and there is no remove button — quantity is locked at checkout.
//
// All four line-type summaries (simple / obi / standard gi / custom gi) live
// here so both consumers render an identical line; a change to any of them hits
// every place a cart line appears.
export function CartItemCard({
  item,
  readOnly = false,
}: {
  item: CartItem;
  readOnly?: boolean;
}) {
  const t = useTranslations("Cart");
  const tObi = useTranslations("Obi");
  const tGi = useTranslations("GiStandard");
  const tGiC = useTranslations("GiCustom");
  const locale = useLocale() as Locale;
  const { removeItem, setQuantity } = useCart();
  const { format } = useCurrency();

  // Simple product (equipment/accessories): one lowercase-labelled line per
  // offered variant ("size: S", "color: red"). A variant-less product keeps a
  // single blank line so its card matches the others' height.
  function simpleLines(it: { size?: string; color?: string }): string[] {
    const lines: string[] = [];
    if (it.size) lines.push(`${t("size")}: ${it.size}`);
    if (it.color) lines.push(`${t("color")}: ${it.color}`);
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

  // The configured custom-gi description, mirroring the configurator's
  // right-panel summary: model · purchase unit · band, then the key option flags
  // (collar, ties, hem, high waist, elastic, embroidery, mfr-logo, shrinkage) and
  // the label. The full spec (measurements, body data) lives in the snapshot.
  function giCustomLines(s: {
    modelSlug: string;
    purchaseUnit: string;
    bandCode: string;
    collar?: string;
    sideTies: boolean;
    chestTies: boolean;
    elasticWaist: boolean;
    mfrLogo?: string;
    hem?: { widthCm: number; thickness: string };
    highWaistCm?: number;
    threadColorKey?: string;
    embroidery: { field: string; chars: number; text: string }[];
    shrinkage?: string;
    labelName: string;
  }): string[] {
    const modelPart = s.modelSlug ? `${tGiC(`modelShort.${s.modelSlug}`)} · ` : "";
    const lines = [
      `${tGiC("giLine").toLowerCase()}: ${modelPart}${tGiC(`purchaseUnitsShort.${s.purchaseUnit}`)} · ${tGiC(`bandsShort.${s.bandCode}`)}`,
    ];
    if (s.collar) {
      lines.push(tGiC(`collarOptions.${s.collar}`).toLowerCase());
    }
    if (s.sideTies) lines.push(tGiC("sideTies").toLowerCase());
    if (s.chestTies) lines.push(tGiC("chestTies").toLowerCase());
    if (s.hem) {
      lines.push(
        `${tGiC("hems").toLowerCase()}: ${tGiC(`hemOptions.${s.hem.widthCm}-${s.hem.thickness}`)}`,
      );
    }
    if (s.highWaistCm != null) {
      lines.push(`${tGiC("highWaist").toLowerCase()}: ${s.highWaistCm}cm`);
    }
    if (s.elasticWaist) lines.push(tGiC("elasticWaist").toLowerCase());
    const threadSuffix = s.threadColorKey
      ? ` (${tGiC(`threadColorsShort.${s.threadColorKey}`)})`
      : "";
    for (const f of s.embroidery) {
      lines.push(
        `${tGiC(`embroideryFieldsShort.${f.field}`).toLowerCase()}: ${f.text}${threadSuffix}`,
      );
    }
    if (s.mfrLogo) {
      lines.push(
        `${tGiC("mfrLogo").toLowerCase()}: ${tGiC(`mfrLogoPlacementsShort.${s.mfrLogo}`)}`,
      );
    }
    if (s.shrinkage) {
      lines.push(
        `${tGiC("shrinkage").toLowerCase()}: ${tGiC(`shrinkageOptions.${s.shrinkage}`)}`,
      );
    }
    lines.push(`${tGiC("label").toLowerCase()}: ${s.labelName}`);
    return lines;
  }

  // Options/config summary lines. Simple products get one "size: …" / "color: …"
  // line per offered variant; a configured obi/gi gets its multi-line
  // description. A blank line reserves height so a variant-less simple card keeps
  // a consistent look.
  const summaryLines: string[] =
    item.kind === "simple"
      ? simpleLines(item)
      : item.config.kind === "obi"
        ? obiLines(item.config.summary)
        : item.config.kind === "gi_standard"
          ? giStandardLines(item.config.summary)
          : item.config.kind === "gi_custom"
            ? giCustomLines(item.config.summary)
            : [""];

  return (
    <tr className="align-top">
      <td className="px-2 py-1 border border-border">
        {/* name + line total */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold truncate min-w-0">
            {localize(item.name, locale)}
          </p>
          <p className="font-bold whitespace-nowrap">
            {format(lineTotalJpy(item))}
          </p>
        </div>

        {/* Config summary — one line for simple products, several for a
            configured obi/gi. A blank line reserves height. */}
        <div className="mt-0">
          {summaryLines.map((line, i) => (
            <p key={i} className="text-foreground-muted">
              {line || " "}
            </p>
          ))}
        </div>

        {readOnly ? (
          /* Checkout: qty is locked — plain text, no stepper, no remove. */
          <div className="mt-1 text-foreground-muted">
            {`${t("qty")}: ${item.quantity}`}
          </div>
        ) : (
          /* qty (left) + remove (bottom-right corner) */
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-0">
              <span className="text-foreground-muted">{`${t("qty")}: `}</span>
              <button
                type="button"
                onClick={() => setQuantity(item.lineId, item.quantity + 1)}
                aria-label={t("increase")}
                className="w-4 h-4 flex items-center justify-center rounded-full leading-none text-foreground-strong cursor-pointer"
              >
                +
              </button>
              <span className="min-w-[1rem] text-center tabular-nums">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  item.quantity > 1 && setQuantity(item.lineId, item.quantity - 1)
                }
                disabled={item.quantity <= 1}
                aria-label={t("decrease")}
                className={
                  "w-4 h-4 flex items-center justify-center rounded-full leading-none " +
                  (item.quantity <= 1
                    ? "text-foreground-blocked cursor-default"
                    : "text-foreground-strong cursor-pointer")
                }
              >
                −
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.lineId)}
              className="text-foreground-muted underline hover:text-foreground cursor-pointer"
            >
              {t("remove")}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
