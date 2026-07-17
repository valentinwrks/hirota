import { getLocale, getTranslations } from "next-intl/server";
import { localize } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import type { SimpleSnapshot } from "@/lib/admin/orders/snapshot";
import { Section, Grid, Field } from "../parts";

// Pattern A: fixed-price product + chosen cosmetic variant. Size/colour are
// price-neutral but REQUIRED for fulfilment (§8.1) — the admin needs them. The
// product name is localized to the active locale; structural labels from Admin.
export async function SimpleView({ snapshot }: { snapshot: SimpleSnapshot }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Admin");
  return (
    <Section title={t("view.item")}>
      <Grid>
        <Field label={t("view.product")} value={localize(snapshot.name, locale)} />
        <Field label={t("view.sku")} value={snapshot.slug} />
        <Field label={t("view.size")} value={snapshot.size} />
        <Field label={t("view.colour")} value={snapshot.color} />
      </Grid>
    </Section>
  );
}
