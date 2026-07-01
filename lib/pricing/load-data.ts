// HIROTA pricing — server-only data loader.
//
// This is the ONLY file in lib/pricing that touches Supabase. It reads the
// reference/pricing tables and shapes them into the engine's `PricingData` via
// the pure `indexPricingData`. The engine itself never imports this file (or
// Supabase); keeping the I/O here is what lets the engine stay pure and unit-
// testable with a hardcoded fixture.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import { indexPricingData, type PricingData, type PricingTables } from './data'

type Db = SupabaseClient<Database>

/** Read every pricing table and return the indexed `PricingData`. */
export async function loadPricingData(supabase: Db): Promise<PricingData> {
  const [
    giModels,
    sizeCharts,
    giStandardPrices,
    giCustomBasePrices,
    giOptions,
    giHemPrices,
    giHighWaistPrices,
    giEmbroideryPrices,
    obiSizes,
    obiPrices,
    obiEmbroideryPrices,
    products,
  ] = await Promise.all([
    read(supabase, 'gi_models'),
    read(supabase, 'size_charts'),
    read(supabase, 'gi_standard_prices'),
    read(supabase, 'gi_custom_base_prices'),
    read(supabase, 'gi_options'),
    read(supabase, 'gi_hem_prices'),
    read(supabase, 'gi_high_waist_prices'),
    read(supabase, 'gi_embroidery_prices'),
    read(supabase, 'obi_sizes'),
    read(supabase, 'obi_prices'),
    read(supabase, 'obi_embroidery_prices'),
    read(supabase, 'products'),
  ])

  const tables: PricingTables = {
    giModels,
    sizeCharts,
    giStandardPrices,
    giCustomBasePrices,
    giOptions,
    giHemPrices,
    giHighWaistPrices,
    giEmbroideryPrices,
    obiSizes,
    obiPrices,
    obiEmbroideryPrices,
    products,
  }

  return indexPricingData(tables)
}

/** Select all rows from a table, throwing on error. */
async function read<T extends keyof Database['public']['Tables']>(
  supabase: Db,
  table: T,
): Promise<Database['public']['Tables'][T]['Row'][]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`failed to load ${table}: ${error.message}`)
  // The generic `.select('*')` return type is an unresolved conditional over `T`;
  // narrow it to the concrete Row array (data is validated by the schema/RLS).
  return (data ?? []) as unknown as Database['public']['Tables'][T]['Row'][]
}
