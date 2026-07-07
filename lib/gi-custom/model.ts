// HIROTA custom (made-to-order) karate-gi — typed model definitions (AGENTS §8.4).
//
// Pattern C. Which of the seven made-to-order models are kata vs kumite (the
// class that governs the collar/hem thickness options), which model may take an
// elastic waist (Tsubasa only), the base-price bands, the hem ladder and the
// A–J measurement layout are all BUSINESS RULES — per §10 they live here as
// typed data, never as inline JSX conditionals. The pricing engine is the single
// source of truth for the actual arithmetic + validation; this module only
// resolves reference rows into the shapes the configurator renders, and mirrors
// the pure engine's availability rules so the UI can show the same gating.
//
// Pure: no I/O, no React. Reads the already-loaded raw rows / `PricingData`.

import type {
  GiCustomBasePriceRow,
  GiModelRow,
  PricingData,
} from '../pricing/data'
import { hemKey } from '../pricing/data'
import type { GiClass, HemThickness, PurchaseUnit } from '../pricing/types'

// Embroidery thread + fields are identical to the standard gi (§8.4); re-export
// them so the custom configurator doesn't re-declare the palette.
export {
  GI_THREAD_COLORS,
  GI_EMBROIDERY_FIELDS,
  giThreadCategory,
} from '../gi-standard/model'
export type { GiThreadColor, GiEmbroideryFieldKey } from '../gi-standard/model'

/** A resolved custom model: capabilities derived from its gi_models row. */
export interface CustomModelDef {
  slug: string
  nameEn: string
  nameJa: string
  /** kata models allow the full option set; kumite lock collar + hem thickness. */
  class: GiClass
  isKata: boolean
  /** Elastic waist is Tsubasa-only (§8.4). */
  allowsElasticWaist: boolean
}

/**
 * The seven made-to-order models, in display (sort) order, resolved from the
 * gi_models rows. A model is offered custom iff `available_custom` (MH-12 is
 * false and so falls out here). `class` is non-null for every custom model.
 */
export function customModels(rows: GiModelRow[]): CustomModelDef[] {
  return rows
    .filter((m) => m.available_custom)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => {
      const isKata = m.class === 'kata'
      return {
        slug: m.slug,
        nameEn: m.name_en,
        nameJa: m.name_ja,
        class: (m.class ?? 'kata') as GiClass,
        isKata,
        allowsElasticWaist: m.slug === 'tsubasa',
      }
    })
}

/** A resolved base-price band. `basePrice` null ⇒ quote on request (above 8). */
export interface CustomBandDef {
  bandCode: string
  basePrice: number | null
  topSizeCode: string | null
  isQuote: boolean
}

/** The base-price bands, in defined sort order (§8.4). */
export function customBands(rows: GiCustomBasePriceRow[]): CustomBandDef[] {
  return rows
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((b) => ({
      bandCode: b.band_code,
      basePrice: b.base_price,
      topSizeCode: b.top_size_code,
      isQuote: b.base_price === null,
    }))
}

/** The base price for a purchase unit = band base × the unit multiplier (§8.4).
 *  A quote band (null base) yields null. Mirrors the engine, for live display. */
export const PURCHASE_UNIT_MULTIPLIER: Record<PurchaseUnit, number> = {
  set: 1.0,
  jacket: 0.6,
  pants: 0.5,
}

export function bandBaseFor(
  band: CustomBandDef | undefined,
  unit: PurchaseUnit | undefined,
): number | null {
  if (!band || band.basePrice == null || unit == null) return null
  return Math.round(band.basePrice * PURCHASE_UNIT_MULTIPLIER[unit])
}

// ---------------------------------------------------------------------------
// Purchase unit → which garment parts / measurements / optionals are in scope.
// ---------------------------------------------------------------------------

export const PURCHASE_UNITS: readonly PurchaseUnit[] = ['set', 'jacket', 'pants'] as const

export function unitIncludesJacket(unit: PurchaseUnit | undefined): boolean {
  return unit === 'set' || unit === 'jacket'
}
export function unitIncludesPants(unit: PurchaseUnit | undefined): boolean {
  return unit === 'set' || unit === 'pants'
}

// ---------------------------------------------------------------------------
// Measurements. Jacket A–F, pants G–J (§7 size-chart columns). Every letter is
// COLLECTED (F matters for construction), but F is excluded from size fitting —
// a larger F adds no fabric — so the engine never range-checks it.
// ---------------------------------------------------------------------------

export const JACKET_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'] as const
export const PANTS_LETTERS = ['g', 'h', 'i', 'j'] as const
export type MeasureLetter =
  | (typeof JACKET_LETTERS)[number]
  | (typeof PANTS_LETTERS)[number]

/** F is collected like any measurement but never validated for sizing (§8.4). */
export const UNVALIDATED_LETTERS: ReadonlySet<MeasureLetter> = new Set(['f'])

/** Letters whose size-chart ceiling has the entered high-waist subtracted (§8.4). */
export const HIGH_WAIST_SUBTRACTED_LETTERS: ReadonlySet<MeasureLetter> = new Set([
  'h',
  'j',
])

// ---------------------------------------------------------------------------
// Hems. A single uniform width/thickness applied to whichever parts are bought;
// the price is the sum of the included parts' per-part rows (§8.4). The free
// default is 4cm/normal (no surcharge). kumite models may only use the
// 5cm/normal row (plus the free default).
// ---------------------------------------------------------------------------

export interface HemOption {
  widthCm: 4 | 5
  thickness: HemThickness
  /** The free 4cm/normal default (no option row is "selected" for it). */
  isDefault: boolean
}

export const HEM_OPTIONS: readonly HemOption[] = [
  { widthCm: 4, thickness: 'normal', isDefault: true },
  { widthCm: 4, thickness: 'thick', isDefault: false },
  { widthCm: 4, thickness: 'ultra', isDefault: false },
  { widthCm: 5, thickness: 'normal', isDefault: false },
  { widthCm: 5, thickness: 'thick', isDefault: false },
  { widthCm: 5, thickness: 'ultra', isDefault: false },
] as const

/** A stable key for a hem option, used as a radio value. */
export const hemOptionKey = (o: { widthCm: number; thickness: HemThickness }) =>
  `${o.widthCm}-${o.thickness}`

/** kumite models allow only normal-thickness hems (the 4cm/normal default and
 *  the 5cm/normal row); kata models allow every row. Mirrors the engine. */
export function hemAllowedForModel(isKata: boolean, o: HemOption): boolean {
  return isKata || o.thickness === 'normal'
}

/** Live surcharge for a hem selection under the current purchase unit = sum of
 *  the included parts' rows (§8.4). Reads `PricingData`, mirroring the engine so
 *  the row's displayed price matches what lands in the subtotal. */
export function hemDisplayPrice(
  data: PricingData,
  unit: PurchaseUnit,
  o: { widthCm: number; thickness: HemThickness },
): number {
  let total = 0
  if (unitIncludesJacket(unit)) {
    total += data.hemPrices.get(hemKey('jacket', o.widthCm, o.thickness))?.price ?? 0
  }
  if (unitIncludesPants(unit)) {
    total += data.hemPrices.get(hemKey('pants', o.widthCm, o.thickness))?.price ?? 0
  }
  return total
}
