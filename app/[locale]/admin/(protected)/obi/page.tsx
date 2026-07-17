import { getTranslations } from "next-intl/server";
import { getObiTables, type ObiPriceRow } from "@/lib/admin/pricing/queries";
import { PriceCell } from "@/components/admin/pricing/PriceCell";
import { NotOffered, TableBlock, TD, TD_NUM, TH, TH_NUM } from "@/components/admin/pricing/parts";

// Obi pricing, mirrored from HIROTA's paper tables: one matrix per tailoring
// width (4cm normal / 4.5cm special), rows = colour · material combos that
// exist, columns = sizes #0–#13. NULL price = size not offered for that combo:
// rendered "—", NOT editable (offering it is structural — a migration; the RLS
// USING guard also refuses it at the DB). 0 would mean offered & free.

const COLOR_ORDER = [
  "black", "blue", "red", "white", "green", "yellow", "purple", "orange", "brown",
] as const;
const MATERIAL_ORDER = ["nami", "shushi", "yohachi", "silk"] as const;

async function WidthMatrix({ title, rows }: { title: string; rows: ObiPriceRow[] }) {
  const t = await getTranslations("Admin");
  const sizes = [...new Set(rows.map((r) => r.size_code))].sort((a, b) => a - b);

  // Distinct (color, material) combos, in the paper-table order.
  const combos = [...new Set(rows.map((r) => `${r.color}|${r.material}`))].sort(
    (a, b) => {
      const [ca, ma] = a.split("|");
      const [cb, mb] = b.split("|");
      const c =
        COLOR_ORDER.indexOf(ca as (typeof COLOR_ORDER)[number]) -
        COLOR_ORDER.indexOf(cb as (typeof COLOR_ORDER)[number]);
      if (c !== 0) return c;
      return (
        MATERIAL_ORDER.indexOf(ma as (typeof MATERIAL_ORDER)[number]) -
        MATERIAL_ORDER.indexOf(mb as (typeof MATERIAL_ORDER)[number])
      );
    },
  );

  const byKey = new Map(
    rows.map((r) => [`${r.color}|${r.material}|${r.size_code}`, r]),
  );

  return (
    <TableBlock title={title} note={t("pricing.obiPricesNote")}>
      <thead>
        <tr className="text-foreground">
          <th className={TH}>{t("pricing.colColourMaterial")}</th>
          {sizes.map((s) => (
            <th key={s} className={TH_NUM}>
              #{s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {combos.map((combo) => {
          const [color, material] = combo.split("|");
          return (
            <tr key={combo} className="hover:bg-foreground-hover-subtle">
              <td className={`${TD} text-foreground`}>
                {t(`pricing.obiColors.${color}`)} · {t(`pricing.obiMaterials.${material}`)}
              </td>
              {sizes.map((size) => {
                const row = byKey.get(`${combo}|${size}`);
                return (
                  <td key={size} className={TD_NUM}>
                    {row && row.price !== null ? (
                      <PriceCell
                        target="obi_price"
                        pk={{
                          color: row.color,
                          material: row.material,
                          width_cm: row.width_cm,
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
  );
}

export default async function AdminObiPage() {
  const { prices, embroidery } = await getObiTables();
  const t = await getTranslations("Admin");

  const normal = prices.filter((r) => r.width_cm === 4);
  const special = prices.filter((r) => r.width_cm === 4.5);
  const threads = ["standard", "metallic"] as const;
  const widths = [...new Set(embroidery.map((r) => r.width_cm))].sort();

  return (
    <div className="pb-10">
      <WidthMatrix title={t("pricing.titles.obiNormal")} rows={normal} />
      <WidthMatrix title={t("pricing.titles.obiSpecial")} rows={special} />

      <TableBlock
        title={t("pricing.titles.obiEmbroidery")}
        note={t("pricing.obiEmbNote")}
      >
        <thead>
          <tr className="text-foreground">
            <th className={TH}>{t("pricing.colWidth")}</th>
            <th className={TH_NUM}>{t("pricing.colStandardThread")}</th>
            <th className={TH_NUM}>{t("pricing.colMetallic")}</th>
          </tr>
        </thead>
        <tbody>
          {widths.map((w) => (
            <tr key={w} className="hover:bg-foreground-hover-subtle">
              <td className={`${TD} text-foreground`}>{w}cm</td>
              {threads.map((thread) => {
                const row = embroidery.find(
                  (r) => r.width_cm === w && r.thread === thread,
                );
                return (
                  <td key={thread} className={TD_NUM}>
                    {row ? (
                      <PriceCell
                        target="obi_embroidery"
                        pk={{ width_cm: row.width_cm, thread: row.thread }}
                        value={row.price_per_char}
                      />
                    ) : (
                      <NotOffered />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </TableBlock>
    </div>
  );
}
