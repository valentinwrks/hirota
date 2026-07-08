import { getTranslations } from "next-intl/server";
import type { ObiConfiguredSnapshot } from "@/lib/admin/orders/snapshot";
import { Section, Grid, Field } from "../parts";

// Pattern B2 (obi). Rendered from the FROZEN summary: character counts and the
// thread colour come straight from the snapshot the engine produced — never
// recomputed from text.length (kanji/katakana counts must match what was
// charged, §7 / adjustment 1). Labels forced to English via locale: "en".
export async function ObiView({
  snapshot,
}: {
  snapshot: ObiConfiguredSnapshot;
}) {
  const t = await getTranslations({ locale: "en", namespace: "Obi" });
  const s = snapshot.summary;

  const thread = s.threadColorKey
    ? t(`threadColors.${s.threadColorKey}`)
    : null;

  // frozen per-end character counts
  const endA =
    s.endAChars > 0 && s.endAText
      ? `${s.endAText} (${s.endAChars} chars${thread ? `, ${thread}` : ""})`
      : null;
  const endB =
    s.endBChars > 0 && s.endBText
      ? `${s.endBText} (${s.endBChars} chars${thread ? `, ${thread}` : ""})`
      : null;

  return (
    <>
      <Section title="Spec">
        <Grid>
          <Field label="Colour" value={t(`colors.${s.colorKey}`)} />
          <Field label="Material" value={t(`materials.${s.materialKey}`)} />
          <Field
            label="Width"
            value={s.widthCm === 4 ? t("widthNormal") : t("widthSpecial")}
          />
          <Field label="Size" value={`#${s.sizeCode}`} />
          <Field label="Label" value={s.labelName} />
        </Grid>
      </Section>

      <Section title="Embroidery">
        <Grid>
          <Field label={t("endA")} value={endA} />
          <Field label={t("endB")} value={endB} />
        </Grid>
      </Section>
    </>
  );
}
