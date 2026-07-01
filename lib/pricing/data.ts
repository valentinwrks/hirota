// HIROTA pricing — in-memory data shape the engine reads.
//
// The pure engine never talks to the database. Instead it receives a
// `PricingData` object: the reference/pricing tables, pre-indexed into Maps for
// O(1) lookups. `indexPricingData` turns the raw table rows (exactly as they
// come out of Postgres) into that shape, and is shared by both the server-side
// loader (`load-data.ts`) and the test fixtures. The raw row types are the
// generated Supabase types, so this stays in lock-step with the schema — but
// note these are *type-only* imports, so nothing here pulls in a runtime dep.

import type { Database } from '../database.types'
import type { GiClass, GiFit, HemThickness, Thread } from './types'

type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type GiModelRow = Row<'gi_models'>
export type SizeChartRow = Row<'size_charts'>
export type GiStandardPriceRow = Row<'gi_standard_prices'>
export type GiCustomBasePriceRow = Row<'gi_custom_base_prices'>
export type GiOptionRow = Row<'gi_options'>
export type GiHemPriceRow = Row<'gi_hem_prices'>
export type GiHighWaistPriceRow = Row<'gi_high_waist_prices'>
export type GiEmbroideryPriceRow = Row<'gi_embroidery_prices'>
export type ObiSizeRow = Row<'obi_sizes'>
export type ObiPriceRow = Row<'obi_prices'>
export type ObiEmbroideryPriceRow = Row<'obi_embroidery_prices'>
export type ProductRow = Row<'products'>

/** The raw tables, as arrays of rows — mirrors the database 1:1. */
export interface PricingTables {
  giModels: GiModelRow[]
  sizeCharts: SizeChartRow[]
  giStandardPrices: GiStandardPriceRow[]
  giCustomBasePrices: GiCustomBasePriceRow[]
  giOptions: GiOptionRow[]
  giHemPrices: GiHemPriceRow[]
  giHighWaistPrices: GiHighWaistPriceRow[]
  giEmbroideryPrices: GiEmbroideryPriceRow[]
  obiSizes: ObiSizeRow[]
  obiPrices: ObiPriceRow[]
  obiEmbroideryPrices: ObiEmbroideryPriceRow[]
  products: ProductRow[]
}

// ---------------------------------------------------------------------------
// Composite key helpers. Keys are plain strings so the Maps stay serialisable
// and trivially testable. Widths are normalised through Number() so that the
// database's numeric(2,1) `4.0` and a literal `4` collapse to the same key.
// ---------------------------------------------------------------------------

export const sizeChartKey = (chart: GiFit, sizeCode: string) => `${chart}|${sizeCode}`

export const standardPriceKey = (modelSlug: string, fit: GiFit, sizeCode: string) =>
  `${modelSlug}|${fit}|${sizeCode}`

export const hemKey = (part: 'jacket' | 'pants', widthCm: number, thickness: HemThickness) =>
  `${part}|${Number(widthCm)}|${thickness}`

export const obiPriceKey = (
  color: string,
  material: string,
  widthCm: number,
  sizeCode: number,
) => `${color}|${material}|${Number(widthCm)}|${sizeCode}`

export const obiEmbroideryKey = (widthCm: number, thread: Thread) =>
  `${Number(widthCm)}|${thread}`

/** A gi model, reduced to what the engine cares about. */
export interface GiModel {
  slug: string
  class: GiClass | null
  availableCustom: boolean
  availableStandardSlim: boolean
  availableStandardNormal: boolean
}

/** A custom base-price band. `basePrice` null ⇒ quote on request. */
export interface CustomBand {
  bandCode: string
  basePrice: number | null
  topSizeCode: string | null
}

/** A high-waist band: `[minCm, maxCm]` inclusive maps to `price`. */
export interface HighWaistBand {
  minCm: number
  maxCm: number
  price: number
}

/**
 * The indexed, lookup-optimised pricing data the engine consumes. Everything is
 * pre-resolved so the engine does no scanning — just keyed reads.
 */
export interface PricingData {
  models: Map<string, GiModel>
  sizeCharts: Map<string, SizeChartRow>
  standardPrices: Map<string, number>
  customBands: Map<string, CustomBand>
  /** gi_options keyed by their `code` (e.g. 'collar_thick'). */
  options: Map<string, GiOptionRow>
  /** Hem price + kata_only flag, keyed by part|width|thickness. */
  hemPrices: Map<string, { price: number; kataOnly: boolean }>
  highWaistBands: HighWaistBand[]
  /** Gi embroidery price per character, keyed by thread. */
  giEmbroidery: Map<Thread, number>
  obiSizes: Map<number, number>
  /** Obi price, keyed by color|material|width|size. `null` ⇒ size not offered. */
  obiPrices: Map<string, number | null>
  /** Obi embroidery price per character, keyed by width|thread. */
  obiEmbroidery: Map<string, number>
  products: Map<number, ProductRow>
}

/** Build the indexed `PricingData` from the raw table rows. Pure, no I/O. */
export function indexPricingData(t: PricingTables): PricingData {
  const models = new Map<string, GiModel>()
  for (const m of t.giModels) {
    models.set(m.slug, {
      slug: m.slug,
      class: m.class,
      availableCustom: m.available_custom,
      availableStandardSlim: m.available_standard_slim,
      availableStandardNormal: m.available_standard_normal,
    })
  }

  const sizeCharts = new Map<string, SizeChartRow>()
  for (const s of t.sizeCharts) {
    sizeCharts.set(sizeChartKey(s.chart, s.size_code), s)
  }

  const standardPrices = new Map<string, number>()
  for (const p of t.giStandardPrices) {
    standardPrices.set(standardPriceKey(p.model_slug, p.fit, p.size_code), p.price)
  }

  const customBands = new Map<string, CustomBand>()
  for (const b of t.giCustomBasePrices) {
    customBands.set(b.band_code, {
      bandCode: b.band_code,
      basePrice: b.base_price,
      topSizeCode: b.top_size_code,
    })
  }

  const options = new Map<string, GiOptionRow>()
  for (const o of t.giOptions) options.set(o.code, o)

  const hemPrices = new Map<string, { price: number; kataOnly: boolean }>()
  for (const h of t.giHemPrices) {
    // `part` is 'jacket' | 'pants' here (hems are never stored as 'both').
    hemPrices.set(hemKey(h.part as 'jacket' | 'pants', h.width_cm, h.thickness), {
      price: h.price,
      kataOnly: h.kata_only,
    })
  }

  const highWaistBands: HighWaistBand[] = t.giHighWaistPrices.map((h) => ({
    minCm: h.min_cm,
    maxCm: h.max_cm,
    price: h.price,
  }))

  const giEmbroidery = new Map<Thread, number>()
  for (const e of t.giEmbroideryPrices) giEmbroidery.set(e.thread, e.price_per_char)

  const obiSizes = new Map<number, number>()
  for (const s of t.obiSizes) obiSizes.set(s.size_code, s.length_cm)

  const obiPrices = new Map<string, number | null>()
  for (const p of t.obiPrices) {
    obiPrices.set(obiPriceKey(p.color, p.material, p.width_cm, p.size_code), p.price)
  }

  const obiEmbroidery = new Map<string, number>()
  for (const e of t.obiEmbroideryPrices) {
    obiEmbroidery.set(obiEmbroideryKey(e.width_cm, e.thread), e.price_per_char)
  }

  const products = new Map<number, ProductRow>()
  for (const p of t.products) products.set(p.id, p)

  return {
    models,
    sizeCharts,
    standardPrices,
    customBands,
    options,
    hemPrices,
    highWaistBands,
    giEmbroidery,
    obiSizes,
    obiPrices,
    obiEmbroidery,
    products,
  }
}
