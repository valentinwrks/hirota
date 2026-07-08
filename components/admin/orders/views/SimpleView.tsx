import { localize } from "@/lib/i18n/localized";
import type { SimpleSnapshot } from "@/lib/admin/orders/snapshot";
import { Section, Grid, Field } from "../parts";

// Pattern A: fixed-price product + chosen cosmetic variant. Size/colour are
// price-neutral but REQUIRED for fulfilment (§8.1) — the admin needs them.
export function SimpleView({ snapshot }: { snapshot: SimpleSnapshot }) {
  return (
    <Section title="Item">
      <Grid>
        <Field label="Product" value={localize(snapshot.name, "en")} />
        <Field label="SKU" value={snapshot.slug} />
        <Field label="Size" value={snapshot.size} />
        <Field label="Colour" value={snapshot.color} />
      </Grid>
    </Section>
  );
}
