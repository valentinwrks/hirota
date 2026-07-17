import { getLocale, getTranslations } from "next-intl/server";
import type { Database } from "@/lib/database.types";
import { localize } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import { listSimpleProducts } from "@/lib/admin/pricing/queries";
import { ProductRowEditor } from "./ProductRowEditor";
import { TableBlock, TH, TH_NUM } from "./parts";

// Pattern A section body (Equipment / Accessories): a row editor per simple
// product. Price + stock are editable; everything else is read-only context.
// These are the only two sections with stock — configurators are made-to-order.
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
          <th className={TH}>{t("pricing.colProduct")}</th>
          <th className={`${TH} max-md:hidden`}>{t("pricing.colType")}</th>
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
            productType={p.product_type}
            price={p.price}
            stock={p.stock}
          />
        ))}
      </tbody>
    </TableBlock>
  );
}
