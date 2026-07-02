// HIROTA obi — server-only reference/pricing loader.
//
// Reads the three obi tables plus the shared labels, using the publishable-key
// client (RLS enforces public read-only). Returns RAW serialisable row arrays so
// they cross the RSC → client boundary as plain data; the client rebuilds the
// engine's indexed `PricingData` via the pure `indexPricingData`. No Supabase in
// the client, no per-keystroke round trip (AGENTS §6).

import { createPublicClient } from '../supabase/server'
import type {
  ObiEmbroideryPriceRow,
  ObiPriceRow,
  ObiSizeRow,
} from '../pricing/data'

export interface ObiReferenceData {
  obiSizes: ObiSizeRow[]
  obiPrices: ObiPriceRow[]
  obiEmbroideryPrices: ObiEmbroideryPriceRow[]
}

/** A label option (association). Proper nouns — not localized (§8.5). */
export interface LabelOption {
  id: number
  name: string
}

/** Read the obi pricing/reference tables. */
export async function loadObiReferenceData(): Promise<ObiReferenceData> {
  const supabase = createPublicClient()
  const [sizes, prices, embroidery] = await Promise.all([
    supabase.from('obi_sizes').select('*').order('size_code'),
    supabase.from('obi_prices').select('*'),
    supabase.from('obi_embroidery_prices').select('*'),
  ])

  if (sizes.error) throw new Error(`failed to load obi_sizes: ${sizes.error.message}`)
  if (prices.error) throw new Error(`failed to load obi_prices: ${prices.error.message}`)
  if (embroidery.error) {
    throw new Error(`failed to load obi_embroidery_prices: ${embroidery.error.message}`)
  }

  return {
    obiSizes: sizes.data ?? [],
    obiPrices: prices.data ?? [],
    obiEmbroideryPrices: embroidery.data ?? [],
  }
}

/** Read the 15 shared association labels, in their defined sort order (§8.5). */
export async function getLabels(): Promise<LabelOption[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('labels')
    .select('id, name')
    .order('sort_order')
  if (error) throw new Error(`failed to load labels: ${error.message}`)
  return data ?? []
}
