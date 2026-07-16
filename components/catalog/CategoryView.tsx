import { isSimpleCategory, type NavCategory } from "@/lib/catalog/types";
import type { Locale } from "@/lib/i18n/routing";
import { getSimpleProducts } from "@/lib/catalog/queries";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ConfiguratorPlaceholder } from "@/components/catalog/ConfiguratorPlaceholder";
import { CategorySubHeader } from "@/components/catalog/CategorySubHeader";
import { ObiConfiguratorSection } from "@/components/obi/ObiConfiguratorSection";
import { GiStandardConfiguratorSection } from "@/components/gi-standard/GiStandardConfiguratorSection";
import { GiCustomConfiguratorSection } from "@/components/gi-custom/GiCustomConfiguratorSection";

// Renders the center-column content for one nav category: the "products /
// <category>" sub-header, then either a product grid (simple categories) or the
// matching configurator. Shared by the `/[category]` route and the store index
// (`/`), which renders the default category behind the mobile hirota overlay.
export async function CategoryView({
  category,
  locale,
}: {
  category: NavCategory;
  locale: Locale;
}) {
  return (
    <div>
      <CategorySubHeader category={category} />

      {isSimpleCategory(category) ? (
        <ProductGrid products={await getSimpleProducts(category)} locale={locale} />
      ) : category === "obi" ? (
        <ObiConfiguratorSection />
      ) : category === "karate-gi-standard" ? (
        <GiStandardConfiguratorSection />
      ) : category === "karate-gi-custom" ? (
        <GiCustomConfiguratorSection />
      ) : (
        <ConfiguratorPlaceholder />
      )}
    </div>
  );
}
