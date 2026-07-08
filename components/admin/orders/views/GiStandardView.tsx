import { getTranslations } from "next-intl/server";
import type { GiStandardConfiguredSnapshot } from "@/lib/admin/orders/snapshot";
import { Section, Grid, Field } from "../parts";

const EMB_FIELDS = ["lapel", "shoulder", "chest", "pants"] as const;

// Pattern B1 (ready-made gi). Frozen summary → resolved English labels. The
// embroidery character counts are read from the snapshot, not text.length
// (adjustment 1). C/H are removal-only length adjustments; shrinkage is shown
// whenever an adjustment was entered (§8.2).
export async function GiStandardView({
  snapshot,
}: {
  snapshot: GiStandardConfiguredSnapshot;
}) {
  const t = await getTranslations({ locale: "en", namespace: "GiStandard" });
  const s = snapshot.summary;

  const sizeLabel = s.sizeCode.startsWith("S") ? s.sizeCode : `#${s.sizeCode}`;
  const thread = s.threadColorKey ? t(`threadColors.${s.threadColorKey}`) : null;
  const byField = new Map(s.embroidery.map((f) => [f.field, f]));
  const adjusted = s.sleeveCcm != null || s.pantHcm != null;

  return (
    <>
      <Section title="Spec">
        <Grid>
          <Field label="Model" value={t(`modelNames.${s.modelSlug}`)} />
          <Field label="Fit" value={t(`fits.${s.fit}`)} />
          <Field label="Size" value={sizeLabel} />
          <Field
            label="Mfr logo"
            value={s.mfrLogo ? t(`mfrLogoPlacements.${s.mfrLogo}`) : null}
          />
          <Field label="Label" value={s.labelName} />
          {adjusted ? (
            <Field
              label="Shrinkage"
              value={s.shrinkage ? t(`shrinkageOptions.${s.shrinkage}`) : null}
            />
          ) : null}
        </Grid>
      </Section>

      {adjusted ? (
        <Section title="Length adjustments (removal only)">
          <Grid>
            <Field
              label={t("adjustC")}
              value={s.sleeveCcm != null ? `${s.sleeveCcm} cm` : null}
            />
            <Field
              label={t("adjustH")}
              value={s.pantHcm != null ? `${s.pantHcm} cm` : null}
            />
          </Grid>
        </Section>
      ) : null}

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
    </>
  );
}
