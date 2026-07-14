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
    return <p className="p-2.5 text-xs text-foreground-muted">{t("empty")}</p>;
  }

  // One product per row: a stack of horizontal cards, each individually bordered
  // and spaced 10px apart — matching the cart column's item padding/gap
  // (mx-2.5 edges, border-spacing-y-2.5 between items).
  return (
    <div className="p-2.5 flex flex-col gap-2.5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} locale={locale} />
      ))}
    </div>
  );
}
