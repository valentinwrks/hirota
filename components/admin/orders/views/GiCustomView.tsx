import { getTranslations } from "next-intl/server";
import type { GiCustomConfiguredSnapshot } from "@/lib/admin/orders/snapshot";
import { Section, Grid, Field } from "../parts";

const EMB_FIELDS = ["lapel", "shoulder", "chest", "pants"] as const;
const MEASURE_KEYS = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j",
] as const;

// Pattern C (fully-tailored gi) — the most important admin screen: a tailor must
// be able to BUILD the garment from this alone (§8.4). Everything is read from
// the FROZEN summary/breakdown; nothing is recomputed (measurements, char
// counts, prices are all as captured at purchase). Domain VALUE labels come from
// the store's GiCustom namespace in the active locale; the structural field
// labels come from Admin.view.
export async function GiCustomView({
  snapshot,
}: {
  snapshot: GiCustomConfiguredSnapshot;
}) {
  const t = await getTranslations("GiCustom");
  const tA = await getTranslations("Admin");
  // Thread colours live in the shared GiThread namespace (one gi palette, §8.4).
  const tThread = await getTranslations("GiThread");
  const s = snapshot.summary;

  const m = s.measurements ?? {};
  const thread = s.threadColorKey ? tThread(`threadColors.${s.threadColorKey}`) : null;
  const byField = new Map(s.embroidery.map((f) => [f.field, f]));

  // Hem: an explicit selection, or the free 4cm/normal default.
  const hemKey = s.hem ? `${s.hem.widthCm}-${s.hem.thickness}` : "4-normal";

  return (
    <>
      <Section title={tA("view.spec")}>
        <Grid>
          <Field label={tA("view.model")} value={t(`modelNames.${s.modelSlug}`)} />
          <Field label={tA("view.purchaseUnit")} value={t(`purchaseUnits.${s.purchaseUnit}`)} />
          <Field label={tA("view.sizeBand")} value={t(`bands.${s.bandCode}`)} />
          <Field label={tA("view.label")} value={s.labelName} />
          <Field
            label={tA("view.shrinkage")}
            value={s.shrinkage ? t(`shrinkageOptions.${s.shrinkage}`) : null}
          />
        </Grid>
      </Section>

      <Section title={tA("view.measurements")}>
        <Grid cols={2}>
          {MEASURE_KEYS.map((k) => {
            const v = m[k];
            const value =
              v != null
                ? `${v} cm${k === "f" ? ` · ${tA("view.notForSizing")}` : ""}`
                : null;
            return <Field key={k} label={t(`measureLabels.${k}`)} value={value} />;
          })}
        </Grid>
      </Section>

      <Section title={tA("view.options")}>
        <Grid>
          <Field
            label={tA("view.collar")}
            value={s.collar ? t(`collarOptions.${s.collar}`) : null}
          />
          <Field label={tA("view.hems")} value={t(`hemOptions.${hemKey}`)} />
          <Field label={tA("view.sideTies")} value={s.sideTies ? tA("view.yes") : false} />
          <Field
            label={tA("view.highWaist")}
            value={s.highWaistCm != null ? `${s.highWaistCm} cm` : null}
          />
          <Field label={tA("view.chestTies")} value={s.chestTies ? tA("view.yes") : false} />
          <Field label={tA("view.elasticWaist")} value={s.elasticWaist ? tA("view.yes") : false} />
          <Field
            label={tA("view.mfrLogo")}
            value={s.mfrLogo ? t(`mfrLogoPlacements.${s.mfrLogo}`) : null}
          />
        </Grid>
      </Section>

      <Section title={tA("view.embroidery")}>
        <Grid>
          {EMB_FIELDS.map((field) => {
            const f = byField.get(field);
            return (
              <Field
                key={field}
                label={t(`embroideryFields.${field}`)}
                value={
                  f
                    ? `${f.text} (${tA("view.charCount", { count: f.chars })}${thread ? `, ${thread}` : ""})`
                    : null
                }
              />
            );
          })}
        </Grid>
      </Section>

      <Section title={tA("view.bodyData")}>
        <Grid cols={3}>
          <Field
            label={t("bodyHeight")}
            value={s.bodyHeightCm != null ? `${s.bodyHeightCm} cm` : null}
          />
          <Field
            label={t("bodyWeight")}
            value={s.bodyWeightKg != null ? `${s.bodyWeightKg} kg` : null}
          />
          <Field
            label={t("bodyWaist")}
            value={s.bodyWaistCm != null ? `${s.bodyWaistCm} cm` : null}
          />
        </Grid>
      </Section>
    </>
  );
}
