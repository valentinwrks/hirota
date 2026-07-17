import { getTranslations } from "next-intl/server";
import type { GiEmbroideryRow } from "@/lib/admin/pricing/queries";
import { PriceCell } from "./PriceCell";
import { TableBlock, TD, TD_NUM, TH, TH_NUM } from "./parts";

const THREAD_KEY: Record<GiEmbroideryRow["thread"], string> = {
  standard: "threadStandard",
  metallic: "threadMetallic",
};

// Gi embroidery per-character rates. ONE underlying table shared by ready-made
// and fully-tailored gi, displayed in BOTH sections (HIROTA looks for
// ready-made pricing under Ready-made) — the note makes the shared write
// explicit. Same cells, same registry target, wherever it's edited.
export async function GiEmbroideryTable({
  rows,
  title,
}: {
  rows: GiEmbroideryRow[];
  title?: string;
}) {
  const t = await getTranslations("Admin");
  return (
    <TableBlock
      title={title ?? t("pricing.titles.giEmbroidery")}
      note={t("pricing.giEmbNote")}
    >
      <thead>
        <tr className="text-foreground">
          <th className={TH}>{t("pricing.colThread")}</th>
          <th className={TH_NUM}>{t("pricing.colPerChar")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.thread} className="hover:bg-foreground-hover-subtle">
            <td className={`${TD} text-foreground`}>{t(`pricing.${THREAD_KEY[r.thread]}`)}</td>
            <td className={TD_NUM}>
              <PriceCell
                target="gi_embroidery"
                pk={{ thread: r.thread }}
                value={r.price_per_char}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </TableBlock>
  );
}
