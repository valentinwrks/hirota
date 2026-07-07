import { getLabels } from "@/lib/obi/queries";
import { loadGiCustomReferenceData } from "@/lib/gi-custom/queries";
import { GiCustomConfigurator } from "./GiCustomConfigurator";

// Server component: loads the custom-gi reference/pricing tables + shared labels
// and hands them to the client configurator as plain serialisable props
// (AGENTS §6). The client rebuilds the engine's PricingData and runs the pure
// engine locally. Mirrors GiStandardConfiguratorSection.
export async function GiCustomConfiguratorSection() {
  const [reference, labels] = await Promise.all([
    loadGiCustomReferenceData(),
    getLabels(),
  ]);

  return (
    <GiCustomConfigurator
      giModels={reference.giModels}
      sizeCharts={reference.sizeCharts}
      giCustomBasePrices={reference.giCustomBasePrices}
      giOptions={reference.giOptions}
      giHemPrices={reference.giHemPrices}
      giHighWaistPrices={reference.giHighWaistPrices}
      giEmbroideryPrices={reference.giEmbroideryPrices}
      labels={labels}
    />
  );
}
