import { getLabels } from "@/lib/obi/queries";
import { loadGiStandardReferenceData } from "@/lib/gi-standard/queries";
import { loadGiCustomReferenceData } from "@/lib/gi-custom/queries";
import { KarateGiConfigurator } from "./KarateGiConfigurator";

// Server component for the unified /karate-gi route: loads BOTH the standard
// (ready-made) and custom (fully-tailored) reference/pricing tables + shared
// labels in parallel and hands them to the client wrapper as plain serialisable
// props (AGENTS §6). The wrapper's mode radio decides which configurator runs;
// each rebuilds the engine's PricingData and runs the pure engine locally.
export async function KarateGiConfiguratorSection() {
  const [standard, custom, labels] = await Promise.all([
    loadGiStandardReferenceData(),
    loadGiCustomReferenceData(),
    getLabels(),
  ]);

  return (
    <KarateGiConfigurator
      standard={{
        giModels: standard.giModels,
        sizeCharts: standard.sizeCharts,
        giStandardPrices: standard.giStandardPrices,
        giOptions: standard.giOptions,
        giEmbroideryPrices: standard.giEmbroideryPrices,
      }}
      custom={{
        giModels: custom.giModels,
        sizeCharts: custom.sizeCharts,
        giCustomBasePrices: custom.giCustomBasePrices,
        giOptions: custom.giOptions,
        giHemPrices: custom.giHemPrices,
        giHighWaistPrices: custom.giHighWaistPrices,
        giEmbroideryPrices: custom.giEmbroideryPrices,
      }}
      labels={labels}
    />
  );
}
