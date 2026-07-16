import { getTranslations } from "next-intl/server";
import type { NavCategory } from "@/lib/catalog/types";

const CATEGORY_LABEL_KEY: Record<NavCategory, string> = {
  "karate-gi-custom": "karateGiCustom",
  "karate-gi-standard": "karateGiStandard",
  obi: "obi",
  equipment: "equipment",
  accessories: "accessories",
};

// The "products / <category>" sub-header bar at the top of the shop content.
// Shown on both the category grid and a product detail page so the current
// category context is always visible. Without a `category` (the `/` index) it
// renders just "products" — the same divider bar, no section suffix.
export async function CategorySubHeader({
  category,
}: {
  category?: NavCategory;
}) {
  const [tNav, tCatalog] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Catalog"),
  ]);

  return (
    // Hidden below md — the mobile dropdown menu shows the active category.
    <div className="max-md:hidden h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none">
      {tCatalog("products")}
      {category ? ` / ${tNav(CATEGORY_LABEL_KEY[category])}` : ""}
    </div>
  );
}
