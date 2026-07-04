import { getTranslations } from "next-intl/server";
import { ProductCard } from "./ProductCard";
import type { Locale } from "@/lib/i18n/routing";
import type { ProductRow } from "@/lib/catalog/types";

// Grid of simple (Pattern A) products. Server component.
export async function ProductGrid({
  products,
  locale,
}: {
  products: ProductRow[];
  locale: Locale;
}) {
  const t = await getTranslations("Catalog");

  if (products.length === 0) {
    return <p className="p-2.5 text-xs text-ink-40">{t("empty")}</p>;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 p-2.5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} locale={locale} />
      ))}
    </div>
  );
}
