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
// counts, prices are all as captured at purchase). Labels forced to English.
export async function GiCustomView({
  snapshot,
}: {
  snapshot: GiCustomConfiguredSnapshot;
}) {
  const t = await getTranslations({ locale: "en", namespace: "GiCustom" });
  const s = snapshot.summary;

  const m = s.measurements ?? {};
  const thread = s.threadColorKey ? t(`threadColors.${s.threadColorKey}`) : null;
  const byField = new Map(s.embroidery.map((f) => [f.field, f]));

  // Hem: an explicit selection, or the free 4cm/normal default.
  const hemKey = s.hem ? `${s.hem.widthCm}-${s.hem.thickness}` : "4-normal";

  return (
    <>
      <Section title="Spec">
        <Grid>
          <Field label="Model" value={t(`modelNames.${s.modelSlug}`)} />
          <Field label="Purchase unit" value={t(`purchaseUnits.${s.purchaseUnit}`)} />
          <Field label="Size band" value={t(`bands.${s.bandCode}`)} />
          <Field label="Label" value={s.labelName} />
          <Field
            label="Shrinkage"
            value={s.shrinkage ? t(`shrinkageOptions.${s.shrinkage}`) : null}
          />
        </Grid>
      </Section>

      <Section title="Measurements (cm)">
        <Grid cols={2}>
          {MEASURE_KEYS.map((k) => {
            const v = m[k];
            const value =
              v != null
                ? `${v} cm${k === "f" ? " · not used for sizing" : ""}`
                : null;
            return <Field key={k} label={t(`measureLabels.${k}`)} value={value} />;
          })}
        </Grid>
      </Section>

      <Section title="Options">
        <Grid>
          <Field
            label="Collar"
            value={s.collar ? t(`collarOptions.${s.collar}`) : null}
          />
          <Field label="Hems" value={t(`hemOptions.${hemKey}`)} />
          <Field label="Side ties" value={s.sideTies ? "Yes" : false} />
          <Field
            label="High waist"
            value={s.highWaistCm != null ? `${s.highWaistCm} cm` : null}
          />
          <Field label="Chest ties" value={s.chestTies ? "Yes" : false} />
          <Field label="Elastic waist" value={s.elasticWaist ? "Yes" : false} />
          <Field
            label="Mfr logo"
            value={s.mfrLogo ? t(`mfrLogoPlacements.${s.mfrLogo}`) : null}
          />
        </Grid>
      </Section>

      <Section title="Embroidery">
        <Grid>
          {EMB_FIELDS.map((field) => {
            const f = byField.get(field);
            return (
              <Field
                key={field}
                label={t(`embroideryFields.${field}`)}
                value={
                  f
                    ? `${f.text} (${f.chars} chars${thread ? `, ${thread}` : ""})`
                    : null
                }
              />
            );
          })}
        </Grid>
      </Section>

      <Section title="Body data (sanity — not used to build)">
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
