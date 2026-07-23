import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { routing, type Locale } from "@/lib/i18n/routing";
import { getProductBySlug } from "@/lib/catalog/queries";
import {
  parseOptions,
  productImage,
} from "@/lib/catalog/types";
import { localize, type LocalizedText } from "@/lib/i18n/localized";
import { ProductPurchase } from "@/components/pdp/ProductPurchase";
import { CategorySubHeader } from "@/components/catalog/CategorySubHeader";
import { ColumnReveal } from "@/components/chrome/ColumnReveal";

// Meta descriptions get truncated by search engines around ~160 chars; keep ours
// within that so it isn't cut mid-word.
const MAX_DESCRIPTION = 160;
function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

// Per-product title + description. Title is the localized product name; the
// layout's template turns "Gloves" into "Gloves — HIROTA". Description is the
// product's own localized copy, trimmed. `getProductBySlug` is React-cached, so
// this shares the page body's query rather than issuing a second one. When the
// description is empty the field is omitted, letting the site default apply.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const loc = locale as Locale;
  const name = localize(product.name as LocalizedText, loc);
  const description = localize(product.description as LocalizedText, loc).trim();

  return {
    // Uppercased in the title only (like ADMIN); the on-page name keeps its
    // natural case. Japanese characters have no case, so JA names are unaffected.
    title: name.toUpperCase(),
    ...(description
      ? { description: truncate(description, MAX_DESCRIPTION) }
      : {}),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const t = await getTranslations("Product");
  const loc = locale as Locale;
  const name = localize(product.name, loc);
  const description = localize(product.description, loc);
  const productType = localize(product.product_type, loc);
  const options = parseOptions(product.options);

  return (
    <div>
      {/* Keep the "products / <category>" context bar visible on the PDP —
          static chrome, outside the scan-in reveal below. */}
      <CategorySubHeader category={product.category} />

      <ColumnReveal>
      <div className="p-2.5 max-md:px-2 max-w-[640px]">
        <Link
          href={`/${product.category}`}
          className="text-xs text-foreground-muted hover:text-foreground"
        >
          {t("back")}
        </Link>

        {/* Below md the image/info columns stack: full-width image on top. */}
        <div className="mt-3 flex gap-4 max-md:flex-col">
          {/* product image */}
          <div className="basis-[45%] max-md:basis-auto shrink-0">
            <div className="aspect-square border border-border overflow-hidden bg-background-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productImage(product.id)}
                alt={name}
                className="w-full h-full object-cover object-center opacity-80"
              />
            </div>
          </div>

          {/* product info + purchase */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold leading-tight mb-1">{name}</p>
            {productType && (
              <p className="text-[11px] italic leading-tight mb-1 text-foreground-muted">
                {productType}
              </p>
            )}
            {description && (
              <p className="text-xs leading-tight">{description}</p>
            )}

            <ProductPurchase
              productId={product.id}
              slug={product.slug}
              name={product.name as LocalizedText}
              priceJpy={product.price}
              stock={product.stock}
              options={options}
            />
          </div>
        </div>
      </div>
      </ColumnReveal>
    </div>
  );
}
