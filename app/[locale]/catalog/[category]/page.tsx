import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/lib/i18n/routing";
import { isNavCategory, isSimpleCategory } from "@/lib/catalog/types";
import { getSimpleProducts } from "@/lib/catalog/queries";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ConfiguratorPlaceholder } from "@/components/catalog/ConfiguratorPlaceholder";
import { CategorySubHeader } from "@/components/catalog/CategorySubHeader";
import { ObiConfiguratorSection } from "@/components/obi/ObiConfiguratorSection";

// Pre-render the four category routes per locale.
export function generateStaticParams() {
  return (
    [
      "karate-gi-custom",
      "karate-gi-standard",
      "obi",
      "equipment",
      "accessories",
    ] as const
  ).map((category) => ({ category }));
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

  return (
    <div>
      <CategorySubHeader category={category} />

      {isSimpleCategory(category) ? (
        <ProductGrid
          products={await getSimpleProducts(category)}
          locale={locale as Locale}
        />
      ) : category === "obi" ? (
        <ObiConfiguratorSection />
      ) : (
        <ConfiguratorPlaceholder />
      )}
    </div>
  );
}
