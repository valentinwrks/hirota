import { loadObiReferenceData, getLabels } from "@/lib/obi/queries";
import { ObiConfigurator } from "./ObiConfigurator";

// Server component: loads the obi reference/pricing tables + shared labels and
// hands them to the client configurator as plain serialisable props (AGENTS §6).
// The client rebuilds the engine's PricingData and runs the pure engine locally.
export async function ObiConfiguratorSection() {
  const [reference, labels] = await Promise.all([
    loadObiReferenceData(),
    getLabels(),
  ]);

  return (
    <ObiConfigurator
      obiSizes={reference.obiSizes}
      obiPrices={reference.obiPrices}
      obiEmbroideryPrices={reference.obiEmbroideryPrices}
      labels={labels}
    />
  );
}
