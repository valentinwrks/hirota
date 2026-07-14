"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/lib/cart/CartProvider";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import { localize, type LocalizedText } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import { type ProductOptions, productImage } from "@/lib/catalog/types";
import type { SimpleVariantGroup } from "@/lib/cart/types";

// Interactive PDP block for a simple (Pattern A) product: size/color selectors
// (price-neutral but REQUIRED when offered — AGENTS §8.1), stock display, and
// add-to-cart. The unit price is fixed JPY; the chosen size/color are snapshotted
// onto the cart line for fulfillment.
export function ProductPurchase({
  productId,
  slug,
  name,
  priceJpy,
  stock,
  options,
}: {
  productId: number;
  slug: string;
  name: LocalizedText;
  priceJpy: number;
  stock: number;
  options: ProductOptions;
}) {
  const t = useTranslations("Product");
  const locale = useLocale() as Locale;
  const { format } = useCurrency();
  const { addItem } = useCart();

  const [size, setSize] = useState<string | undefined>(undefined);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [justAdded, setJustAdded] = useState(false);

  const inStock = stock > 0;

  // Which groups this product offers. Every offered group starts UNSELECTED and
  // must be chosen before adding — a conscious choice, no auto-pick.
  const offersSize = !!options.size?.length;
  const offersColor = !!options.color?.length;
  const offeredGroups: SimpleVariantGroup[] = [
    ...(offersSize ? (["size"] as const) : []),
    ...(offersColor ? (["color"] as const) : []),
  ];

  const needsSize = offersSize && !size;
  const needsColor = offersColor && !color;
  const canAdd = inStock && !needsSize && !needsColor;

  function handleAdd() {
    if (!canAdd) return;
    addItem({
      kind: "simple",
      productId,
      slug,
      name,
      unitPriceJpy: priceJpy,
      image: productImage(productId),
      size,
      color,
      offeredGroups,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div className="mt-4">
      {/* price */}
      <p className="text-lg font-bold leading-tight">
        {format(priceJpy)}
      </p>

      {/* required selectors (price-neutral) */}
      {offersSize && (
        <VariantGroup
          label={t("size")}
          values={options.size!}
          selected={size}
          onSelect={setSize}
          hint={needsSize ? t("selectSize") : undefined}
        />
      )}
      {offersColor && (
        <VariantGroup
          label={t("color")}
          values={options.color!}
          selected={color}
          onSelect={setColor}
          hint={needsColor ? t("selectColor") : undefined}
        />
      )}
      {(offersSize || offersColor) && (
        <p className="mt-1.5 text-[11px] italic text-foreground-hint">
          {t("cosmeticNote")}
        </p>
      )}

      {/* stock */}
      <p className="mt-3 text-xs text-foreground-muted">
        {inStock ? t("stockCount", { count: stock }) : t("outOfStock")}
      </p>

      {/* add to cart — reuses the legacy CTA styling. Disabled until every
          offered group has a selection. */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        aria-label={localize(name, locale)}
        className={
          "w-full mt-2.5 text-xs font-bold bg-transparent border tracking-wide py-1 " +
          (canAdd
            ? "text-foreground border-border hover:bg-foreground-hover cursor-pointer"
            : "text-foreground-disabled border-border-blocked")
        }
      >
        {!inStock ? t("outOfStock") : justAdded ? t("added") : t("addToCart")}
      </button>
    </div>
  );
}

// A row of custom-radio-style option chips (selected = bg-foreground-selected text-background,
// hover = bg-foreground-hover), matching the prototype's option states.
function VariantGroup({
  label,
  values,
  selected,
  onSelect,
  hint,
}: {
  label: string;
  values: string[];
  selected: string | undefined;
  onSelect: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-xs">{label}</p>
        {hint && <p className="text-[11px] italic text-foreground-muted">{hint}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => {
          const active = value === selected;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              aria-pressed={active}
              className={
                "px-2 py-1 text-xs border border-border cursor-pointer " +
                (active
                  ? "bg-foreground-selected text-background"
                  : "text-foreground-selected hover:bg-foreground-hover")
              }
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
