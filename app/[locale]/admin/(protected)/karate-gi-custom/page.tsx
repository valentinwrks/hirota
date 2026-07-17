import { getTranslations } from "next-intl/server";
import { getGiCustomTables } from "@/lib/admin/pricing/queries";
import { PriceCell } from "@/components/admin/pricing/PriceCell";
import { GiEmbroideryTable } from "@/components/admin/pricing/GiEmbroideryTable";
import { NotOffered, TableBlock, TD, TD_NUM, TH, TH_NUM } from "@/components/admin/pricing/parts";

// Fully-tailored (custom) gi pricing: the band base prices plus the add-on
// tables the engine sums (options, hems, high waist, embroidery). A price of 0
// = offered & FREE (side/chest ties) and is editable like any cell; only NULL
// (the quote band) renders "—" and stays non-editable — a quote band becoming
// auto-priced is a business change, not a price edit.

const HEM_ROWS = [
  { width_cm: 4, thickness: "normal" },
  { width_cm: 4, thickness: "thick" },
  { width_cm: 4, thickness: "ultra" },
  { width_cm: 5, thickness: "normal" },
  { width_cm: 5, thickness: "thick" },
  { width_cm: 5, thickness: "ultra" },
] as const;

// Collar-thickness options live in their own table (analogous to hems), so they
// are pulled out of the flat Options list by code.
const COLLAR_CODES = ["collar_thick", "collar_extra_thick"];

export default async function AdminGiCustomPage() {
  const { bands, options, hems, highWaist, embroidery } = await getGiCustomTables();
  const t = await getTranslations("Admin");

  const collars = options.filter((o) => COLLAR_CODES.includes(o.code));
  const otherOptions = options.filter((o) => !COLLAR_CODES.includes(o.code));

  return (
    <div className="pb-10">
      <TableBlock
        title={t("pricing.titles.giCustomBase")}
        note={t("pricing.bandNote")}
      >
        <thead>
          <tr className="text-foreground">
            <th className={TH}>{t("pricing.colBand")}</th>
            <th className={TH_NUM}>{t("pricing.colBase")}</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b) => (
            <tr key={b.band_code} className="hover:bg-foreground-hover-subtle">
              <td className={`${TD} text-foreground`}>{t(`pricing.bands.${b.band_code}`)}</td>
              <td className={TD_NUM}>
                {b.base_price !== null ? (
                  <PriceCell
                    target="gi_custom_base"
                    pk={{ band_code: b.band_code }}
                    value={b.base_price}
                  />
                ) : (
                  <NotOffered />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </TableBlock>

      <TableBlock
        title={t("pricing.titles.giCustomOptionals")}
        note={t("pricing.optionsNote")}
      >
        <thead>
          <tr className="text-foreground">
            <th className={TH}>{t("pricing.colOption")}</th>
            <th className={TH}>{t("pricing.colPart")}</th>
            <th className={TH_NUM}>{t("pricing.colPrice")}</th>
          </tr>
        </thead>
        <tbody>
          {otherOptions.map((o) => (
            <tr key={o.code} className="hover:bg-foreground-hover-subtle">
              <td className={`${TD} text-foreground`}>
                {t(`pricing.optionNames.${o.code}`)}
              </td>
              <td className={`${TD} text-foreground-muted`}>
                {t(`pricing.parts.${o.part}`)}
              </td>
              <td className={TD_NUM}>
                <PriceCell target="gi_option" pk={{ code: o.code }} value={o.price} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableBlock>

      <TableBlock
        title={t("pricing.titles.giCustomCollar")}
        note={t("pricing.collarNote")}
      >
        <thead>
          <tr className="text-foreground">
            <th className={TH}>{t("pricing.colThickness")}</th>
            <th className={TH_NUM}>{t("pricing.colPrice")}</th>
          </tr>
        </thead>
        <tbody>
          {collars.map((o) => (
            <tr key={o.code} className="hover:bg-foreground-hover-subtle">
              <td className={`${TD} text-foreground`}>{t(`pricing.optionNames.${o.code}`)}</td>
              <td className={TD_NUM}>
                <PriceCell target="gi_option" pk={{ code: o.code }} value={o.price} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableBlock>

      <TableBlock
        title={t("pricing.titles.giCustomHems")}
        note={t("pricing.hemsNote")}
      >
        <thead>
          <tr className="text-foreground">
            <th className={TH}>{t("pricing.colWidthThickness")}</th>
            <th className={TH_NUM}>{t("pricing.colJacket")}</th>
            <th className={TH_NUM}>{t("pricing.colPants")}</th>
          </tr>
        </thead>
        <tbody>
          {HEM_ROWS.map(({ width_cm, thickness }) => (
            <tr
              key={`${width_cm}-${thickness}`}
              className="hover:bg-foreground-hover-subtle"
            >
              <td className={`${TD} text-foreground`}>
                {width_cm}cm · {t(`pricing.thickness.${thickness}`)}
              </td>
              {(["jacket", "pants"] as const).map((part) => {
                const row = hems.find(
                  (h) =>
                    h.part === part &&
                    h.width_cm === width_cm &&
                    h.thickness === thickness,
                );
                return (
                  <td key={part} className={TD_NUM}>
                    {row ? (
                      <PriceCell
                        target="gi_hem"
                        pk={{
                          part: row.part,
                          width_cm: row.width_cm,
                          thickness: row.thickness,
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
          ))}
        </tbody>
      </TableBlock>

      <TableBlock
        title={t("pricing.titles.giCustomHighWaist")}
        note={t("pricing.highWaistNote")}
      >
        <thead>
          <tr className="text-foreground">
            <th className={TH}>{t("pricing.colBand")}</th>
            <th className={TH_NUM}>{t("pricing.colPrice")}</th>
          </tr>
        </thead>
        <tbody>
          {highWaist.map((h) => (
            <tr
              key={`${h.min_cm}-${h.max_cm}`}
              className="hover:bg-foreground-hover-subtle"
            >
              <td className={`${TD} text-foreground`}>
                {h.min_cm}–{h.max_cm} cm
              </td>
              <td className={TD_NUM}>
                <PriceCell
                  target="gi_high_waist"
                  pk={{ min_cm: h.min_cm, max_cm: h.max_cm }}
                  value={h.price}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </TableBlock>

      <GiEmbroideryTable rows={embroidery} />
    </div>
  );
}
