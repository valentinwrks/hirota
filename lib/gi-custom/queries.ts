// HIROTA custom gi — server-only reference/pricing loader.
//
// Reads the made-to-order gi tables plus the shared labels, using the
// publishable-key client (RLS enforces public read-only). Returns RAW
// serialisable row arrays so they cross the RSC → client boundary as plain data;
// the client rebuilds the engine's indexed `PricingData` via the pure
// `indexPricingData`. No Supabase in the client, no per-keystroke round trip
// (AGENTS §6). Mirrors `lib/gi-standard/queries.ts`.

import { createPublicClient } from '../supabase/server'
import type {
  GiCustomBasePriceRow,
  GiEmbroideryPriceRow,
  GiHemPriceRow,
  GiHighWaistPriceRow,
  GiModelRow,
  GiOptionRow,
  SizeChartRow,
} from '../pricing/data'

export interface GiCustomReferenceData {
  giModels: GiModelRow[]
  sizeCharts: SizeChartRow[]
  giCustomBasePrices: GiCustomBasePriceRow[]
  giOptions: GiOptionRow[]
  giHemPrices: GiHemPriceRow[]
  giHighWaistPrices: GiHighWaistPriceRow[]
  giEmbroideryPrices: GiEmbroideryPriceRow[]
}

/** Read the custom-gi pricing/reference tables. */
export async function loadGiCustomReferenceData(): Promise<GiCustomReferenceData> {
  const supabase = createPublicClient()
  const [models, sizeCharts, bands, options, hems, highWaist, embroidery] =
    await Promise.all([
      supabase.from('gi_models').select('*').order('sort_order'),
      supabase.from('size_charts').select('*').order('sort_order'),
      supabase.from('gi_custom_base_prices').select('*').order('sort_order'),
      supabase.from('gi_options').select('*').order('sort_order'),
      supabase.from('gi_hem_prices').select('*'),
      supabase.from('gi_high_waist_prices').select('*').order('min_cm'),
      supabase.from('gi_embroidery_prices').select('*'),
    ])

  if (models.error) throw new Error(`failed to load gi_models: ${models.error.message}`)
  if (sizeCharts.error) throw new Error(`failed to load size_charts: ${sizeCharts.error.message}`)
  if (bands.error) throw new Error(`failed to load gi_custom_base_prices: ${bands.error.message}`)
  if (options.error) throw new Error(`failed to load gi_options: ${options.error.message}`)
  if (hems.error) throw new Error(`failed to load gi_hem_prices: ${hems.error.message}`)
  if (highWaist.error) {
    throw new Error(`failed to load gi_high_waist_prices: ${highWaist.error.message}`)
  }
  if (embroidery.error) {
    throw new Error(`failed to load gi_embroidery_prices: ${embroidery.error.message}`)
  }

  return {
    giModels: models.data ?? [],
    sizeCharts: sizeCharts.data ?? [],
    giCustomBasePrices: bands.data ?? [],
    giOptions: options.data ?? [],
    giHemPrices: hems.data ?? [],
    giHighWaistPrices: highWaist.data ?? [],
    giEmbroideryPrices: embroidery.data ?? [],
  }
}
