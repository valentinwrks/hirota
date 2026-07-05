import { getLabels } from "@/lib/obi/queries";
import { loadGiStandardReferenceData } from "@/lib/gi-standard/queries";
import { GiStandardConfigurator } from "./GiStandardConfigurator";

// Server component: loads the standard-gi reference/pricing tables + shared
// labels and hands them to the client configurator as plain serialisable props
// (AGENTS §6). The client rebuilds the engine's PricingData and runs the pure
// engine locally. Mirrors ObiConfiguratorSection.
export async function GiStandardConfiguratorSection() {
  const [reference, labels] = await Promise.all([
    loadGiStandardReferenceData(),
    getLabels(),
  ]);

  return (
    <GiStandardConfigurator
      giModels={reference.giModels}
      sizeCharts={reference.sizeCharts}
      giStandardPrices={reference.giStandardPrices}
      giOptions={reference.giOptions}
      giEmbroideryPrices={reference.giEmbroideryPrices}
      labels={labels}
    />
  );
}
