import { getTranslations } from "next-intl/server";
import type { NavCategory } from "@/lib/catalog/types";
import { CategoryNav } from "@/components/catalog/CategoryNav";
import { MobileMenuButton } from "@/components/chrome/MobileMenuButton";
import { ShopSectionTitle } from "@/components/chrome/ShopSectionTitle";

// Center "shop" column: widest region. Sticky "shop" header + the category nav
// (persistent chrome), then the routed content ({children}) — either a product
// grid, a configurator placeholder, or a PDP. Below md the header hosts the
// mobile menu trigger (the dropdown replaces the category nav there).
export async function ShopColumn({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Nav");

  const navLabels: Record<NavCategory, string> = {
    "karate-gi-custom": t("karateGiCustom"),
    "karate-gi-standard": t("karateGiStandard"),
    obi: t("obi"),
    equipment: t("equipment"),
    accessories: t("accessories"),
  };

  return (
    <section className="flex-1 min-w-0 border-r border-border overflow-y-auto overscroll-contain scrollbar-none max-md:border-r-0">
      <div className="sticky top-0 z-10 h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none backdrop-blur-md">
        <ShopSectionTitle shopLabel={t("shop")} categoryLabels={navLabels} />
        <MobileMenuButton />
      </div>

      <CategoryNav labels={navLabels} />

      {children}
    </section>
  );
}
