// HIROTA standard gi — server-only reference/pricing loader.
//
// Reads the ready-made gi tables plus the shared labels, using the publishable-
// key client (RLS enforces public read-only). Returns RAW serialisable row
// arrays so they cross the RSC → client boundary as plain data; the client
// rebuilds the engine's indexed `PricingData` via the pure `indexPricingData`.
// No Supabase in the client, no per-keystroke round trip (AGENTS §6). Mirrors
// `lib/obi/queries.ts`.

import { createPublicClient } from '../supabase/server'
import type {
  GiEmbroideryPriceRow,
  GiModelRow,
  GiOptionRow,
  GiStandardPriceRow,
  SizeChartRow,
} from '../pricing/data'

export interface GiStandardReferenceData {
  giModels: GiModelRow[]
  sizeCharts: SizeChartRow[]
  giStandardPrices: GiStandardPriceRow[]
  giOptions: GiOptionRow[]
  giEmbroideryPrices: GiEmbroideryPriceRow[]
}

/** Read the standard-gi pricing/reference tables. */
export async function loadGiStandardReferenceData(): Promise<GiStandardReferenceData> {
  const supabase = createPublicClient()
  const [models, sizeCharts, prices, options, embroidery] = await Promise.all([
    supabase.from('gi_models').select('*').order('sort_order'),
    supabase.from('size_charts').select('*').order('sort_order'),
    supabase.from('gi_standard_prices').select('*'),
    supabase.from('gi_options').select('*').order('sort_order'),
    supabase.from('gi_embroidery_prices').select('*'),
  ])

  if (models.error) throw new Error(`failed to load gi_models: ${models.error.message}`)
  if (sizeCharts.error) throw new Error(`failed to load size_charts: ${sizeCharts.error.message}`)
  if (prices.error) throw new Error(`failed to load gi_standard_prices: ${prices.error.message}`)
  if (options.error) throw new Error(`failed to load gi_options: ${options.error.message}`)
  if (embroidery.error) {
    throw new Error(`failed to load gi_embroidery_prices: ${embroidery.error.message}`)
  }

  return {
    giModels: models.data ?? [],
    sizeCharts: sizeCharts.data ?? [],
    giStandardPrices: prices.data ?? [],
    giOptions: options.data ?? [],
    giEmbroideryPrices: embroidery.data ?? [],
  }
}
