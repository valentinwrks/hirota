import { getTranslations } from "next-intl/server";
import { CategoryNav } from "@/components/catalog/CategoryNav";

// Center "shop" column: widest region. Sticky "shop" header + the category nav
// (persistent chrome), then the routed content ({children}) — either a product
// grid, a configurator placeholder, or a PDP.
export async function ShopColumn({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Nav");

  return (
    <section className="flex-1 min-w-0 border-r border-border overflow-y-auto overscroll-contain scrollbar-none">
      <div className="sticky top-0 z-10 h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none backdrop-blur-xs bg-background-header">
        {t("shop")}
      </div>

      <CategoryNav
        labels={{
          "karate-gi-custom": t("karateGiCustom"),
          "karate-gi-standard": t("karateGiStandard"),
          obi: t("obi"),
          equipment: t("equipment"),
          accessories: t("accessories"),
        }}
      />

      {children}
    </section>
  );
}
