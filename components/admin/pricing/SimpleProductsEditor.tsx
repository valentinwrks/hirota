import { getLocale, getTranslations } from "next-intl/server";
import type { Database } from "@/lib/database.types";
import { localize } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import { listSimpleProducts } from "@/lib/admin/pricing/queries";
import { ProductRowEditor } from "./ProductRowEditor";
import { TableBlock, TH, TH_NUM } from "./parts";

/** Read one language key of a JSONB {en, ja} without EN fallback (blank if absent). */
function pick(value: unknown, key: "en" | "ja"): string {
  if (!value || typeof value !== "object") return "";
  const v = (value as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

// Pattern A section body (Equipment / Accessories): a row editor per simple
// product. Price + stock are editable inline; name / description / product_type
// are editable (EN + JA) in an expandable panel per row. Everything else is
// read-only context. These are the only two sections with stock — configurators
// are made-to-order.
export async function SimpleProductsEditor({
  category,
}: {
  category: Database["public"]["Enums"]["product_category"];
}) {
  const products = await listSimpleProducts(category);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Admin");

  return (
    <TableBlock
      title={t("pricing.titles.stockEditor")}
      note={t("pricing.simpleNote")}
    >
      <thead>
        <tr className="text-foreground">
          <th className={TH}>{t("pricing.colId")}</th>
          <th className={TH}>{t("pricing.colImage")}</th>
          <th className={TH}>{t("pricing.colProduct")}</th>
          <th className={TH}>{t("pricing.colType")}</th>
          <th className={TH_NUM}>{t("pricing.colPrice")}</th>
          <th className={TH_NUM}>{t("pricing.colStock")}</th>
          <th className={TH} aria-label={t("pricing.actions")} />
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <ProductRowEditor
            key={p.id}
            productId={p.id}
            name={localize(p.name, locale)}
            productType={localize(p.product_type, locale)}
            price={p.price}
            stock={p.stock}
            nameEn={pick(p.name, "en")}
            nameJa={pick(p.name, "ja")}
            descEn={pick(p.description, "en")}
            descJa={pick(p.description, "ja")}
            typeEn={pick(p.product_type, "en")}
            typeJa={pick(p.product_type, "ja")}
          />
        ))}
      </tbody>
    </TableBlock>
  );
}
