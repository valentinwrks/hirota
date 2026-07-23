import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Price } from "@/components/ui/Price";
import { localize } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import { parseOptions, productImage, type ProductRow } from "@/lib/catalog/types";

// A single product row in the catalog list. HORIZONTAL layout: square image on
// the left, info column on the right — one product per row, table-like. Server
// component: localized text is resolved here; only the price is a client island
// (currency-reactive).
export async function ProductCard({
  product,
  locale,
}: {
  product: ProductRow;
  locale: Locale;
}) {
  const t = await getTranslations("Catalog");
  const name = localize(product.name, locale);
  const description = localize(product.description, locale);
  const productType = localize(product.product_type, locale);
  const options = parseOptions(product.options);
  const outOfStock = product.stock <= 0;

  // Small availability note (e.g. "3 sizes · 2 colors"), localized.
  const optionParts: string[] = [];
  if (options.size?.length)
    optionParts.push(t("variantSizes", { count: options.size.length }));
  if (options.color?.length)
    optionParts.push(t("variantColors", { count: options.color.length }));

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex items-stretch border border-border hover:bg-foreground-hover-subtle"
    >
      {/* image — square thumbnail inset with padding ("air"), centered in its
          cell; no divider, so it shares the card with the info column */}
      <div className="w-[120px] max-md:w-[96px] shrink-0 self-stretch p-2 flex items-center justify-center">
        <div className="w-full aspect-square overflow-hidden bg-background-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productImage(product.id)}
            alt={name}
            className="w-full h-full object-cover object-center opacity-70 group-hover:opacity-100"
          />
        </div>
      </div>

      {/* info — fills remaining width, vertically distributed to match the image */}
      <div className="flex-1 min-w-0 p-2.5 flex flex-col gap-1 leading-tight">
        {/* name + price */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold">{name}</p>
          <Price
            amountJpy={product.price}
            className="text-sm font-bold whitespace-nowrap shrink-0"
          />
        </div>

        {productType && (
          <p className="text-[11px] italic text-foreground-muted">
            {productType}
          </p>
        )}

        {description && (
          <p className="text-[11px] text-foreground-muted line-clamp-2">{description}</p>
        )}

        {/* meta footer — subcategory + availability, pushed to the bottom */}
        <div className="mt-auto flex items-center gap-2 pt-1 text-[10px] uppercase tracking-wide text-foreground-muted">
          <span>{t(`subcategories.${product.subcategory}`)}</span>
          {optionParts.length > 0 && (
            <>
              <span className="text-foreground-blocked">·</span>
              <span>{optionParts.join(" · ")}</span>
            </>
          )}
          {outOfStock && (
            <span className="ml-auto text-foreground-muted not-italic">
              {t("outOfStock")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
