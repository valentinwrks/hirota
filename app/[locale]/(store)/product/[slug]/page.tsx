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
  const options = parseOptions(product.options);

  return (
    <div>
      {/* Keep the "products / <category>" context bar visible on the PDP. */}
      <CategorySubHeader category={product.category} />

      <div className="p-2.5 max-w-[640px]">
        <Link
          href={`/catalog/${product.category}`}
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
            {product.product_type && (
              <p className="text-[11px] italic leading-tight mb-1 text-foreground-muted">
                {product.product_type}
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
    </div>
  );
}
