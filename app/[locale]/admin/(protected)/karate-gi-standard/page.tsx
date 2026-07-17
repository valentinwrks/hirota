import { getTranslations } from "next-intl/server";
import { getGiStandardTables } from "@/lib/admin/pricing/queries";
import { PriceCell } from "@/components/admin/pricing/PriceCell";
import { GiEmbroideryTable } from "@/components/admin/pricing/GiEmbroideryTable";
import { NotOffered, TableBlock, TD, TD_NUM, TH, TH_NUM } from "@/components/admin/pricing/parts";

// Ready-made (standard) gi pricing: full-set price per (model · fit · size).
// Rows = each model/fit line that exists (Pinac Kumite appears twice: slim and
// normal); columns = the union of size codes. An absent (model, fit, size)
// combination renders "—" and is NOT editable — creating it is an INSERT
// (offering a new size), which stays a migration.

// S-sizes (S5–S7) sort before the numeric ladder.
function sizeSort(a: string, b: string): number {
  const aS = a.startsWith("S");
  const bS = b.startsWith("S");
  if (aS !== bS) return aS ? -1 : 1;
  if (aS && bS) return a.localeCompare(b);
  return Number(a) - Number(b);
}

export default async function AdminGiStandardPage() {
  const { prices, models, adjustments, embroidery } = await getGiStandardTables();
  const t = await getTranslations("Admin");
  const tg = await getTranslations("GiStandard");

  const modelOrder = new Map(models.map((m) => [m.slug, m.sort_order]));

  const sizes = [...new Set(prices.map((r) => r.size_code))].sort(sizeSort);
  const lines = [...new Set(prices.map((r) => `${r.model_slug}|${r.fit}`))].sort(
    (a, b) => {
      const [ma, fa] = a.split("|");
      const [mb, fb] = b.split("|");
      const order =
        (modelOrder.get(ma) ?? 99) - (modelOrder.get(mb) ?? 99);
      if (order !== 0) return order;
      // Slim before normal within a model (alphabetical would invert it).
      const fitRank = (f: string) => (f === "slim" ? 0 : 1);
      return fitRank(fa) - fitRank(fb);
    },
  );
  const byKey = new Map(
    prices.map((r) => [`${r.model_slug}|${r.fit}|${r.size_code}`, r]),
  );

  return (
    <div className="pb-10">
      <TableBlock
        title={t("pricing.titles.giStandardPrices")}
        note={t("pricing.giStandardPricesNote")}
      >
        <thead>
          <tr className="text-foreground">
            <th className={TH}>{t("pricing.colModelFit")}</th>
            {sizes.map((s) => (
              <th key={s} className={TH_NUM}>
                {s.startsWith("S") ? s : `#${s}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const [slug, fit] = line.split("|");
            return (
              <tr key={line} className="hover:bg-foreground-hover-subtle">
                <td className={`${TD} text-foreground`}>
                  {tg(`modelNames.${slug}`)} · {t(`pricing.fits.${fit}`)}
                </td>
                {sizes.map((size) => {
                  const row = byKey.get(`${line}|${size}`);
                  return (
                    <td key={size} className={TD_NUM}>
                      {row ? (
                        <PriceCell
                          target="gi_standard_price"
                          pk={{
                            model_slug: row.model_slug,
                            fit: row.fit,
                            size_code: row.size_code,
                          }}
                          value={row.price}
                        />
                      ) : (
                        <NotOffered />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </TableBlock>

      <TableBlock
        title={t("pricing.titles.giStandardAdjust")}
        note={t("pricing.adjustNote")}
      >
        <thead>
          <tr className="text-foreground">
            <th className={TH}>{t("pricing.colAdjustment")}</th>
            <th className={TH_NUM}>{t("pricing.colPrice")}</th>
          </tr>
        </thead>
        <tbody>
          {adjustments.map((o) => (
            <tr key={o.code} className="hover:bg-foreground-hover-subtle">
              <td className={`${TD} text-foreground`}>{t(`pricing.optionNames.${o.code}`)}</td>
              <td className={TD_NUM}>
                <PriceCell target="gi_option" pk={{ code: o.code }} value={o.price} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableBlock>

      <GiEmbroideryTable rows={embroidery} />
    </div>
  );
}
