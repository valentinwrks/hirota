import { getTranslations } from "next-intl/server";
import type { NavCategory } from "@/lib/catalog/types";
import { CategoryNav } from "@/components/catalog/CategoryNav";
import { ColumnReveal } from "@/components/chrome/ColumnReveal";
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
          the fixed bar. The category links (CategoryNav) scan in on a FULL load
          (after the preloader) and on a locale switch, but stay STATIC on a
          section change — hence a ColumnReveal keyed by locale (like the side
          columns), not by pathname: the layout persists across section changes so
          the key doesn't change and the nav doesn't replay. The "products /
          <category>" sub-header inside the routed content is persistent chrome and
          stays static; the section content below it has its OWN pathname-keyed
          reveal (in CategoryView / PDP), so it re-scans on every section change. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-none">
        <ColumnReveal revealKey="static">
          <CategoryNav labels={navLabels} />
        </ColumnReveal>
        {children}
      </div>
    </section>
  );
}
