import { getTranslations } from "next-intl/server";
import type { ObiConfiguredSnapshot } from "@/lib/admin/orders/snapshot";
import { Section, Grid, Field } from "../parts";

// Pattern B2 (obi). Rendered from the FROZEN summary: character counts and the
// thread colour come straight from the snapshot the engine produced — never
// recomputed from text.length (kanji/katakana counts must match what was
// charged, §7 / adjustment 1). Domain values come from the Obi namespace in the
// active locale; structural field labels from Admin.view.
export async function ObiView({
  snapshot,
}: {
  snapshot: ObiConfiguredSnapshot;
}) {
  const t = await getTranslations("Obi");
  const tA = await getTranslations("Admin");
  const s = snapshot.summary;

  const thread = s.threadColorKey
    ? t(`threadColors.${s.threadColorKey}`)
    : null;

  // frozen per-end character counts
  const endA =
    s.endAChars > 0 && s.endAText
      ? `${s.endAText} (${tA("view.charCount", { count: s.endAChars })}${thread ? `, ${thread}` : ""})`
      : null;
  const endB =
    s.endBChars > 0 && s.endBText
      ? `${s.endBText} (${tA("view.charCount", { count: s.endBChars })}${thread ? `, ${thread}` : ""})`
      : null;

  return (
    <>
      <Section title={tA("view.spec")}>
        <Grid>
          <Field label={tA("view.colour")} value={t(`colors.${s.colorKey}`)} />
          <Field label={tA("view.material")} value={t(`materials.${s.materialKey}`)} />
          <Field
            label={tA("view.width")}
            value={s.widthCm === 4 ? t("widthNormal") : t("widthSpecial")}
          />
          <Field label={tA("view.size")} value={`#${s.sizeCode}`} />
          <Field label={tA("view.label")} value={s.labelName} />
        </Grid>
      </Section>

      <Section title={tA("view.embroidery")}>
        <Grid>
          <Field label={t("endA")} value={endA} />
          <Field label={t("endB")} value={endB} />
        </Grid>
      </Section>
    </>
  );
}
