import { getTranslations } from "next-intl/server";
import type { NavCategory } from "@/lib/catalog/types";
import { CategoryNav } from "@/components/catalog/CategoryNav";
import { ShopSectionTitle } from "@/components/chrome/ShopSectionTitle";

// Center "shop" column: widest region. Sticky "shop" header + the category nav
// (persistent chrome), then the routed content ({children}) — either a product
// grid, a configurator placeholder, or a PDP. Below md the header hosts the
// mobile menu trigger (the dropdown replaces the category nav there).
export async function ShopColumn({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Nav");

  const navLabels: Record<NavCategory, string> = {
    "karate-gi": t("karateGi"),
    obi: t("obi"),
    equipment: t("equipment"),
    accessories: t("accessories"),
  };

  return (
    <section className="flex-1 min-w-0 border-r border-border flex flex-col overflow-hidden max-md:border-r-0">
      {/* Section bar — desktop only. On mobile the TopBar carries all the nav
          chrome (cart + menu), so this "shop / <category>" row is dropped.
          Fixed above the scroll region (like the cart column / admin) rather
          than sticky-over-content, so nothing passes behind it — no
          glassmorphism, opaque like /admin. */}
      <div className="max-md:hidden shrink-0 h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none">
        <ShopSectionTitle shopLabel={t("shop")} categoryLabels={navLabels} />
      </div>

      {/* Scroll region — the category nav + routed content scroll here, below
          the fixed bar. The category links (CategoryNav) AND the "products /
          <category>" sub-header at the top of the routed content are persistent
          chrome and stay STATIC across navigation. The scan-in reveal wraps only
          the content BELOW that sub-header, applied inside each route (CategoryView
          / PDP) rather than here, so the header bar + its divider don't animate on
          a section change. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-none">
        <CategoryNav labels={navLabels} />
        {children}
      </div>
    </section>
  );
}
