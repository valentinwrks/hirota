import { getTranslations } from "next-intl/server";

// Honest placeholder for the karate-gi and obi lines: their made-to-order
// configurators are a later sprint. No fake products, no fake pricing.
export async function ConfiguratorPlaceholder() {
  const t = await getTranslations("Catalog");

  return (
    <div className="p-2.5">
      <div className="border border-border p-4 leading-tight">
        <p className="text-lg font-bold uppercase text-ink-60">
          {t("configuratorComing")}
        </p>
        <p className="mt-2 text-xs text-ink-40">{t("configuratorNote")}</p>
      </div>
    </div>
  );
}
