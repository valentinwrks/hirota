// HIROTA pricing — the pure engine.
//
// Given a resolved `LineItemConfig` and the indexed `PricingData`, it returns a
// fully itemised `PriceBreakdown` in integer JPY. It is the single source of
// truth for HIROTA's pricing rules (AGENTS.md §8): the configurator UI uses it
// for a live price, and the server re-runs it before creating an order so a
// client-submitted total is never trusted.
//
// No I/O, no DB, no React. Availability rules that need reference data (a
// model's kata/kumite class, whether an obi cell exists) are derived from the
// `PricingData` passed in — the engine reads it, it never fetches it.

import {
  hemKey,
  obiEmbroideryKey,
  obiPriceKey,
  sizeChartKey,
  standardPriceKey,
  type PricingData,
} from './data'
import type {
  EmbroideryField,
  GiCustomConfig,
  GiEmbroidery,
  GiStandardConfig,
  LineItemConfig,
  ObiConfig,
  PriceBreakdown,
  PriceLine,
  SimpleConfig,
  Thread,
  ValidationError,
  ValidationResult,
} from './types'

/** Purchase-unit multipliers, applied to the custom BASE price only. Note that
 *  jacket (0.6) + pants (0.5) = 1.1 > set (1.0): parts do not sum to the set,
 *  and the engine must never assume they do. */
const PURCHASE_UNIT_MULTIPLIER: Record<GiCustomConfig['purchaseUnit'], number> = {
  set: 1.0,
  jacket: 0.6,
  pants: 0.5,
}

// gi_options codes referenced by the engine.
const OPT = {
  collarThick: 'collar_thick',
  collarExtraThick: 'collar_extra_thick',
  elasticWaist: 'elastic_waist',
  mfrLogoNeck: 'mfr_logo_neck',
  mfrLogoBreastNeck: 'mfr_logo_breast_neck',
  adjustSleeveC: 'adjust_sleeve_c',
  adjustPantH: 'adjust_pant_h',
} as const

/** Standard gi models that may take the manufacturer's logo (AGENTS §8.2). */
const STANDARD_MFR_LOGO_MODELS = new Set(['tsubasa', 'pinac-kumite'])

/** Thrown by `priceLineItem` when asked to price a config that fails validation. */
export class PricingError extends Error {
  readonly errors: ValidationError[]
  constructor(errors: ValidationError[]) {
    super(`invalid pricing config: ${errors.map((e) => e.code).join(', ')}`)
    this.name = 'PricingError'
    this.errors = errors
  }
}

// ---------------------------------------------------------------------------
// Small shared helpers.
// ---------------------------------------------------------------------------

const err = (code: string, message: string, field?: string): ValidationError => ({
  code,
  message,
  field,
})

/** Does the chosen purchase unit include the given garment part? */
function unitIncludesPart(
  unit: GiCustomConfig['purchaseUnit'],
  part: 'jacket' | 'pants',
): boolean {
  if (unit === 'set') return true
  return unit === part
}

/** Price per character for a gi embroidery thread. */
function giCharRate(data: PricingData, thread: Thread): number {
  return data.giEmbroidery.get(thread) ?? 0
}

/**
 * Build one embroidery line per present field whose part is included. `label`
 * prefixes the field name; `includePart` decides which fields count.
 */
function giEmbroideryLines(
  embroidery: GiEmbroidery | undefined,
  data: PricingData,
  includePart: (part: 'jacket' | 'pants') => boolean,
): PriceLine[] {
  if (!embroidery) return []
  const fields: { name: string; part: 'jacket' | 'pants'; field?: EmbroideryField }[] = [
    { name: 'lapel', part: 'jacket', field: embroidery.lapel },
    { name: 'shoulder', part: 'jacket', field: embroidery.shoulder },
    { name: 'chest', part: 'jacket', field: embroidery.chest },
    { name: 'pants', part: 'pants', field: embroidery.pants },
  ]
  const lines: PriceLine[] = []
  for (const { name, part, field } of fields) {
    if (!field || field.chars <= 0 || !includePart(part)) continue
    const rate = giCharRate(data, field.thread)
    lines.push({
      label: `Embroidery (${name}): ${field.chars} char${field.chars === 1 ? '' : 's'} × ¥${rate}`,
      amountJpy: field.chars * rate,
    })
  }
  return lines
}

/** Assemble a priced breakdown from base + surcharge lines. */
function breakdownFrom(lines: PriceLine[], quantity: number): PriceBreakdown {
  const unitSubtotalJpy = lines.reduce((sum, l) => sum + l.amountJpy, 0)
  return {
    lines,
    quantity,
    unitSubtotalJpy,
    totalJpy: unitSubtotalJpy * quantity,
    quote: false,
  }
}

const qty = (config: { quantity?: number }): number => Math.max(1, config.quantity ?? 1)

// ---------------------------------------------------------------------------
// Validation. `validateConfig` never throws; it reports. `priceLineItem` calls
// it and refuses (throws) when a config is invalid.
// ---------------------------------------------------------------------------

export function validateConfig(config: LineItemConfig, data: PricingData): ValidationResult {
  let errors: ValidationError[]
  switch (config.kind) {
    case 'simple':
      errors = validateSimple(config, data)
      break
    case 'gi_standard':
      errors = validateGiStandard(config, data)
      break
    case 'gi_custom':
      errors = validateGiCustom(config, data)
      break
    case 'obi':
      errors = validateObi(config, data)
      break
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}

function validateSimple(config: SimpleConfig, data: PricingData): ValidationError[] {
  const errors: ValidationError[] = []
  if (!data.products.has(config.productId)) {
    errors.push(err('product_not_found', `no product ${config.productId}`, 'productId'))
  }
  return errors
}

function validateGiStandard(config: GiStandardConfig, data: PricingData): ValidationError[] {
  const errors: ValidationError[] = []
  const model = data.models.get(config.modelSlug)
  if (!model) {
    errors.push(err('model_not_found', `no model ${config.modelSlug}`, 'modelSlug'))
  }
  if (!data.standardPrices.has(standardPriceKey(config.modelSlug, config.fit, config.sizeCode))) {
    errors.push(
      err(
        'standard_price_not_found',
        `no standard price for ${config.modelSlug}/${config.fit}/${config.sizeCode}`,
        'sizeCode',
      ),
    )
  }
  if (config.mfrLogo && !STANDARD_MFR_LOGO_MODELS.has(config.modelSlug)) {
    errors.push(
      err(
        'mfr_logo_not_allowed',
        `manufacturer's logo is not available on standard ${config.modelSlug}`,
        'mfrLogo',
      ),
    )
  }
  // mh-12 does not allow C/H shortening.
  if (config.modelSlug === 'mh-12' && (config.adjustSleeveC || config.adjustPantH)) {
    errors.push(err('adjust_not_allowed', 'mh-12 does not allow C/H adjustment', 'adjustSleeveC'))
  }
  // Entering shortened measurements requires a shrinkage decision.
  if ((config.adjustSleeveC || config.adjustPantH) && !config.shrinkage) {
    errors.push(
      err('shrinkage_required', 'a shrinkage selection is required when adjusting C/H', 'shrinkage'),
    )
  }
  return errors
}

function validateGiCustom(config: GiCustomConfig, data: PricingData): ValidationError[] {
  const errors: ValidationError[] = []
  const model = data.models.get(config.modelSlug)
  const band = data.customBands.get(config.bandCode)

  if (!model) {
    errors.push(err('model_not_found', `no model ${config.modelSlug}`, 'modelSlug'))
  } else if (!model.availableCustom) {
    errors.push(err('model_not_custom', `${config.modelSlug} is not available custom`, 'modelSlug'))
  }
  if (!band) {
    errors.push(err('band_not_found', `no band ${config.bandCode}`, 'bandCode'))
  }

  const isKata = model?.class === 'kata'
  const jacket = unitIncludesPart(config.purchaseUnit, 'jacket')
  const pants = unitIncludesPart(config.purchaseUnit, 'pants')

  // Collar — jacket, kata only.
  if (config.collar) {
    if (!jacket) {
      errors.push(err('option_part_excluded', 'collar is a jacket option', 'collar'))
    }
    if (model && !isKata) {
      errors.push(err('collar_kata_only', 'collar thickness is only available on kata models', 'collar'))
    }
  }

  // Elastic waist — pants, tsubasa only.
  if (config.elasticWaist) {
    if (!pants) {
      errors.push(err('option_part_excluded', 'elastic waist is a pants option', 'elasticWaist'))
    }
    const restrict = data.options.get(OPT.elasticWaist)?.restrict_model_slug
    if (restrict && config.modelSlug !== restrict) {
      errors.push(
        err('elastic_waist_model', `elastic waist is only available on ${restrict}`, 'elasticWaist'),
      )
    }
  }

  // Manufacturer's logo — jacket.
  if (config.mfrLogo && !jacket) {
    errors.push(err('option_part_excluded', "manufacturer's logo is a jacket option", 'mfrLogo'))
  }

  // Hems — a uniform selection. kumite models may only use 5cm/normal (4cm/normal
  // is the free default and always allowed).
  if (config.hem) {
    const { widthCm, thickness } = config.hem
    const isDefault = widthCm === 4 && thickness === 'normal'
    const isFiveNormal = widthCm === 5 && thickness === 'normal'
    if (model && !isKata && !isDefault && !isFiveNormal) {
      errors.push(
        err('hem_kumite_restricted', 'kumite models only allow the 5cm/normal hem', 'hem'),
      )
    }
    if (jacket && !data.hemPrices.has(hemKey('jacket', widthCm, thickness))) {
      errors.push(err('hem_not_found', `no jacket hem ${widthCm}/${thickness}`, 'hem'))
    }
    if (pants && !data.hemPrices.has(hemKey('pants', widthCm, thickness))) {
      errors.push(err('hem_not_found', `no pants hem ${widthCm}/${thickness}`, 'hem'))
    }
  }

  // High waist — pants; exact cm must fall inside a band (>13 not offered).
  if (config.highWaistCm != null && config.highWaistCm > 0) {
    if (!pants) {
      errors.push(err('option_part_excluded', 'high waist is a pants option', 'highWaistCm'))
    }
    if (!highWaistBandFor(data, config.highWaistCm)) {
      errors.push(err('high_waist_out_of_range', `high waist ${config.highWaistCm}cm is not offered`, 'highWaistCm'))
    }
  }

  errors.push(...validateCustomMeasurements(config, data))
  return errors
}

/** Measurement fitting against the top size of the band (AGENTS §8.4). */
function validateCustomMeasurements(
  config: GiCustomConfig,
  data: PricingData,
): ValidationError[] {
  const m = config.measurements
  const band = data.customBands.get(config.bandCode)
  if (!m || !band || !band.topSizeCode) return [] // quote band has no top size.
  const top = data.sizeCharts.get(sizeChartKey('normal', band.topSizeCode))
  if (!top) return []

  const jacket = unitIncludesPart(config.purchaseUnit, 'jacket')
  const pants = unitIncludesPart(config.purchaseUnit, 'pants')
  const hw = config.highWaistCm ?? 0
  const errors: ValidationError[] = []

  // Jacket letters A–E (F is skirt-slit depth, ignored for sizing).
  const jacketChecks: [keyof typeof top & string, number | undefined][] = jacket
    ? [
        ['a', m.a],
        ['b', m.b],
        ['c', m.c],
        ['d', m.d],
        ['e', m.e],
      ]
    : []
  for (const [letter, value] of jacketChecks) {
    if (value == null) continue
    const limit = top[letter] as number
    if (value > limit) {
      errors.push(
        err('measurement_exceeds', `${letter.toUpperCase()} ${value} exceeds size ${band.topSizeCode} (${limit})`, letter),
      )
    }
  }

  // Pants letters G–J. H and J have the high waist subtracted before comparing
  // (the size chart does not include high waist).
  if (pants) {
    const pantChecks: [string, number | undefined, number][] = [
      ['g', m.g, 0],
      ['h', m.h, hw],
      ['i', m.i, 0],
      ['j', m.j, hw],
    ]
    for (const [letter, value, subtract] of pantChecks) {
      if (value == null) continue
      const limit = top[letter as keyof typeof top] as number
      if (value - subtract > limit) {
        errors.push(
          err('measurement_exceeds', `${letter.toUpperCase()} ${value} exceeds size ${band.topSizeCode} (${limit})`, letter),
        )
      }
    }
  }
  return errors
}

function validateObi(config: ObiConfig, data: PricingData): ValidationError[] {
  const errors: ValidationError[] = []
  const key = obiPriceKey(config.color, config.material, config.widthCm, config.sizeCode)
  const price = data.obiPrices.get(key)
  // Missing row ⇒ the combo isn't offered; null price ⇒ that size isn't offered.
  if (price === undefined || price === null) {
    errors.push(
      err(
        'obi_unavailable',
        `obi ${config.color}/${config.material}/${config.widthCm}cm/size ${config.sizeCode} is not offered`,
        'sizeCode',
      ),
    )
  }
  return errors
}

// ---------------------------------------------------------------------------
// Pricing.
// ---------------------------------------------------------------------------

export function priceLineItem(config: LineItemConfig, data: PricingData): PriceBreakdown {
  const result = validateConfig(config, data)
  if (!result.ok) throw new PricingError(result.errors)

  switch (config.kind) {
    case 'simple':
      return priceSimple(config, data)
    case 'gi_standard':
      return priceGiStandard(config, data)
    case 'gi_custom':
      return priceGiCustom(config, data)
    case 'obi':
      return priceObi(config, data)
  }
}

function priceSimple(config: SimpleConfig, data: PricingData): PriceBreakdown {
  const product = data.products.get(config.productId)!
  const name = (product.name as { en?: string } | null)?.en ?? `Product ${product.id}`
  // Size and colour are cosmetic and never change the price.
  return breakdownFrom([{ label: name, amountJpy: product.price }], qty(config))
}

function priceGiStandard(config: GiStandardConfig, data: PricingData): PriceBreakdown {
  const lines: PriceLine[] = []
  const base = data.standardPrices.get(
    standardPriceKey(config.modelSlug, config.fit, config.sizeCode),
  )!
  lines.push({
    label: `${config.modelSlug} (${config.fit}, size ${config.sizeCode})`,
    amountJpy: base,
  })

  if (config.mfrLogo) {
    const code = config.mfrLogo === 'neck' ? OPT.mfrLogoNeck : OPT.mfrLogoBreastNeck
    lines.push({ label: "Manufacturer's logo", amountJpy: data.options.get(code)?.price ?? 0 })
  }

  // Standard gi: full set, so all four embroidery fields are in scope.
  lines.push(...giEmbroideryLines(config.embroidery, data, () => true))

  if (config.adjustSleeveC) {
    lines.push({ label: 'Sleeve shortening (C)', amountJpy: data.options.get(OPT.adjustSleeveC)?.price ?? 0 })
  }
  if (config.adjustPantH) {
    lines.push({ label: 'Pant-length shortening (H)', amountJpy: data.options.get(OPT.adjustPantH)?.price ?? 0 })
  }

  return breakdownFrom(lines, qty(config))
}

function priceGiCustom(config: GiCustomConfig, data: PricingData): PriceBreakdown {
  const band = data.customBands.get(config.bandCode)!
  const quantity = qty(config)

  // Above size 8 (or any band without a base price) is quote-on-request.
  if (band.basePrice === null) {
    return {
      lines: [{ label: `${config.modelSlug} — custom (${band.bandCode}, quote on request)`, amountJpy: 0 }],
      quantity,
      unitSubtotalJpy: null,
      totalJpy: null,
      quote: true,
    }
  }

  const jacket = unitIncludesPart(config.purchaseUnit, 'jacket')
  const pants = unitIncludesPart(config.purchaseUnit, 'pants')
  const lines: PriceLine[] = []

  // Base × purchase-unit multiplier (multiplier applies to the base only).
  const multiplier = PURCHASE_UNIT_MULTIPLIER[config.purchaseUnit]
  const baseAmount = Math.round(band.basePrice * multiplier)
  lines.push({
    label: `${config.modelSlug} — custom base (${band.bandCode}, ${config.purchaseUnit} ×${multiplier})`,
    amountJpy: baseAmount,
  })

  // Collar (jacket, kata only — validated already).
  if (config.collar && jacket) {
    const code = config.collar === 'thick' ? OPT.collarThick : OPT.collarExtraThick
    lines.push({
      label: config.collar === 'thick' ? 'Thick collar' : 'Extra-thick collar',
      amountJpy: data.options.get(code)?.price ?? 0,
    })
  }

  // Elastic waist (pants).
  if (config.elasticWaist && pants) {
    lines.push({ label: 'Elastic waist', amountJpy: data.options.get(OPT.elasticWaist)?.price ?? 0 })
  }

  // Manufacturer's logo (jacket).
  if (config.mfrLogo && jacket) {
    const code = config.mfrLogo === 'neck' ? OPT.mfrLogoNeck : OPT.mfrLogoBreastNeck
    lines.push({ label: "Manufacturer's logo", amountJpy: data.options.get(code)?.price ?? 0 })
  }

  // Hems: single uniform selection, priced as the sum of the included parts'
  // per-part rows. The free 4cm/normal default adds nothing.
  if (config.hem) {
    const { widthCm, thickness } = config.hem
    let hemTotal = 0
    if (jacket) hemTotal += data.hemPrices.get(hemKey('jacket', widthCm, thickness))?.price ?? 0
    if (pants) hemTotal += data.hemPrices.get(hemKey('pants', widthCm, thickness))?.price ?? 0
    if (hemTotal > 0) {
      lines.push({ label: `Hems (${widthCm}cm, ${thickness})`, amountJpy: hemTotal })
    }
  }

  // High waist (pants): price from the band the entered cm falls into.
  if (pants && config.highWaistCm != null && config.highWaistCm > 0) {
    const hwBand = highWaistBandFor(data, config.highWaistCm)
    if (hwBand) {
      lines.push({ label: `High waist (${config.highWaistCm}cm)`, amountJpy: hwBand.price })
    }
  }

  // Embroidery: only fields whose part is included.
  lines.push(
    ...giEmbroideryLines(config.embroidery, data, (part) =>
      part === 'jacket' ? jacket : pants,
    ),
  )

  return breakdownFrom(lines, quantity)
}

function priceObi(config: ObiConfig, data: PricingData): PriceBreakdown {
  const lines: PriceLine[] = []
  const base = data.obiPrices.get(
    obiPriceKey(config.color, config.material, config.widthCm, config.sizeCode),
  )! // non-null: validation already rejected missing/null cells.
  lines.push({
    label: `Obi ${config.color}/${config.material} ${config.widthCm}cm (size ${config.sizeCode})`,
    amountJpy: base,
  })

  // Embroidery: two ends, rate by width × thread. (Non-black belts embroider in
  // black thread — a display concern, not a price difference; ignored here.)
  for (const [name, field] of [
    ['end A', config.embroideryEndA],
    ['end B', config.embroideryEndB],
  ] as const) {
    if (!field || field.chars <= 0) continue
    const rate = data.obiEmbroidery.get(obiEmbroideryKey(config.widthCm, field.thread)) ?? 0
    lines.push({
      label: `Embroidery (${name}): ${field.chars} char${field.chars === 1 ? '' : 's'} × ¥${rate}`,
      amountJpy: field.chars * rate,
    })
  }

  return breakdownFrom(lines, qty(config))
}

/** Find the high-waist band an exact cm value falls into (inclusive). */
function highWaistBandFor(data: PricingData, cm: number) {
  return data.highWaistBands.find((b) => cm >= b.minCm && cm <= b.maxCm)
}

// ---------------------------------------------------------------------------
// Cart.
// ---------------------------------------------------------------------------

/** Price a whole cart, summing priceable line items. Quote-only items are
 *  itemised but excluded from the total (and flagged). */
export function priceCart(
  items: LineItemConfig[],
  data: PricingData,
): { items: PriceBreakdown[]; totalJpy: number; containsQuote: boolean } {
  const breakdowns = items.map((item) => priceLineItem(item, data))
  const totalJpy = breakdowns.reduce((sum, b) => sum + (b.totalJpy ?? 0), 0)
  const containsQuote = breakdowns.some((b) => b.quote)
  return { items: breakdowns, totalJpy, containsQuote }
}
