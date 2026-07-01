import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/lib/i18n/routing";
import {
  isNavCategory,
  isSimpleCategory,
  type NavCategory,
} from "@/lib/catalog/types";
import { getSimpleProducts } from "@/lib/catalog/queries";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ConfiguratorPlaceholder } from "@/components/catalog/ConfiguratorPlaceholder";

const CATEGORY_LABEL_KEY: Record<NavCategory, string> = {
  "karate-gi": "karateGi",
  obi: "obi",
  equipment: "equipment",
  accessories: "accessories",
};

// Pre-render the four category routes per locale.
export function generateStaticParams() {
  return (["karate-gi", "obi", "equipment", "accessories"] as const).map(
    (category) => ({ category }),
  );
}

export default async function CatalogCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  if (!isNavCategory(category)) notFound();
  setRequestLocale(locale);

  const tNav = await getTranslations("Nav");
  const tCatalog = await getTranslations("Catalog");
  const categoryLabel = tNav(CATEGORY_LABEL_KEY[category]);

  return (
    <div>
      {/* products / <category> sub-header */}
      <div className="h-[26px] flex items-center px-1.5 border-b border-neutral-400 text-sm leading-none backdrop-blur-xs bg-white/20">
        {tCatalog("products")} / {categoryLabel}
      </div>

      {isSimpleCategory(category) ? (
        <ProductGrid
          products={await getSimpleProducts(category)}
          locale={locale as Locale}
        />
      ) : (
        <ConfiguratorPlaceholder />
      )}
    </div>
  );
}
