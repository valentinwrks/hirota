// HIROTA standard (ready-made) gi — typed model definitions (AGENTS §8.2).
//
// Pattern B1. Which of the five ready-made models offer a fit choice, which size
// chart each uses, and which optionals (manufacturer's logo, C/H shortening)
// each allows are BUSINESS RULES — per §10 they live here as typed data, never
// as inline JSX conditionals. Availability already encoded in the gi_models rows
// (the fits a model is sold in, hence its size chart) is DERIVED from those rows;
// the capability rules that are NOT in the schema (mfr-logo eligibility, the
// mh-12 no-adjust exception) are declared as typed constants below and are the
// single source of truth — the pricing engine imports them.
//
// Pure: no I/O, no React. `standardOfferedSizes` reads the already-loaded
// `PricingData`, mirroring the obi model's `offeredSizes`.

import type { GiModelRow, PricingData, SizeChartRow } from '../pricing/data'
import { sizeChartKey, standardPriceKey } from '../pricing/data'
import type { GiFit, Thread } from '../pricing/types'

/**
 * The standard models that may take the manufacturer's logo (§8.2). Declared
 * here so both the configurator and the pure engine read the same set — the
 * engine imports this rather than re-declaring it.
 */
export const STANDARD_MFR_LOGO_MODELS: ReadonlySet<string> = new Set([
  'tsubasa',
  'pinac-kumite',
])

/**
 * C/H shortening (sleeve length C, pant-hem length H) is offered on every
 * standard model EXCEPT mh-12 (§8.2). Single source of truth for the rule.
 */
export function standardAllowsAdjustCH(slug: string): boolean {
  return slug !== 'mh-12'
}

/** A resolved standard model: capabilities derived from its gi_models row. */
export interface StandardModelDef {
  slug: string
  nameEn: string
  nameJa: string
  /** Fits this model is sold ready-made in, in `[slim, normal]` order. */
  fits: GiFit[]
  /** True only when the buyer must choose a fit (both offered) — pinac-kumite. */
  hasFitChoice: boolean
  /** Manufacturer's-logo eligibility (§8.2). */
  mfrLogo: boolean
  /** C/H shortening eligibility (§8.2) — false for mh-12. */
  adjustCH: boolean
}

/**
 * The ready-made models, in display (sort) order, resolved from the gi_models
 * rows. A model is "standard" iff it is sold in at least one ready-made fit
 * (Takumi, Kū, Pinac Kata are custom-only and fall out here). The fit(s) a model
 * offers — and thus its size chart(s) — come straight from the row; the mfr-logo
 * and adjust-C/H capabilities from the rules above.
 */
export function standardModels(rows: GiModelRow[]): StandardModelDef[] {
  return rows
    .filter((m) => m.available_standard_slim || m.available_standard_normal)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => {
      const fits: GiFit[] = []
      if (m.available_standard_slim) fits.push('slim')
      if (m.available_standard_normal) fits.push('normal')
      return {
        slug: m.slug,
        nameEn: m.name_en,
        nameJa: m.name_ja,
        fits,
        hasFitChoice: fits.length > 1,
        mfrLogo: STANDARD_MFR_LOGO_MODELS.has(m.slug),
        adjustCH: standardAllowsAdjustCH(m.slug),
      }
    })
}

/**
 * Sizes offered for a resolved (model, fit): the size-chart rows of that fit's
 * chart that HAVE a standard price row (§8.2, "no runtime size math"). Returned
 * as full `SizeChartRow`s (the caller needs cm + the C/H measurements), sorted
 * by the chart's `sort_order`.
 */
export function standardOfferedSizes(
  data: PricingData,
  modelSlug: string,
  fit: GiFit,
): SizeChartRow[] {
  const rows: SizeChartRow[] = []
  for (const row of data.sizeCharts.values()) {
    if (row.chart !== fit) continue
    if (data.standardPrices.has(standardPriceKey(modelSlug, fit, row.size_code))) {
      rows.push(row)
    }
  }
  return rows.sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * The size-chart row for a resolved (fit, size), or undefined before one is
 * chosen. Source of the C/H "< N" ceilings shown in the adjust inputs and of the
 * engine's adjust validation.
 */
export function standardSizeChartRow(
  data: PricingData,
  fit: GiFit,
  sizeCode: string,
): SizeChartRow | undefined {
  return data.sizeCharts.get(sizeChartKey(fit, sizeCode))
}

// ---------------------------------------------------------------------------
// Embroidery thread. Gi embroidery is priced by thread *category* (standard vs
// metallic, §8.4); the specific colour is a fulfilment detail. Same six colours
// as the obi palette, but with no belt-colour restriction — declared here so the
// gi configurator is independent of the obi module.
// ---------------------------------------------------------------------------

export type GiThreadColor =
  | 'golden_brown'
  | 'red'
  | 'white'
  | 'silver_grey'
  | 'gold'
  | 'silver'

export const GI_THREAD_COLORS: readonly GiThreadColor[] = [
  'golden_brown',
  'red',
  'white',
  'silver_grey',
  'gold',
  'silver',
] as const

/** The pricing category (standard/metallic) a thread colour belongs to. */
export function giThreadCategory(color: GiThreadColor): Thread {
  return color === 'gold' || color === 'silver' ? 'metallic' : 'standard'
}

/** The four independent gi embroidery fields, in the engine's emission order
 *  (jacket lapel, shoulder, chest, then pants) so a positional pairing with the
 *  price breakdown lines stays correct. */
export const GI_EMBROIDERY_FIELDS = ['lapel', 'shoulder', 'chest', 'pants'] as const
export type GiEmbroideryFieldKey = (typeof GI_EMBROIDERY_FIELDS)[number]
