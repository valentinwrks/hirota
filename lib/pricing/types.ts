// HIROTA pricing — domain types.
//
// This is the vocabulary the pure pricing engine speaks. Nothing here imports
// React, Supabase, or Next — a `LineItemConfig` is a plain, serialisable
// description of one thing a customer configured, and `PriceBreakdown` is the
// itemised, JPY-only answer the engine gives back. Currency (USD) conversion is
// a display concern handled elsewhere; every amount below is integer JPY.

export type Currency = 'JPY' | 'USD'

export type GiClass = 'kata' | 'kumite'

/** Which size chart / cut a standard gi uses. Mirrors the `gi_size_chart` enum. */
export type GiFit = 'normal' | 'slim'

export type HemThickness = 'normal' | 'thick' | 'ultra'

export type Thread = 'standard' | 'metallic'

/** What part(s) of a custom gi the buyer is purchasing. */
export type PurchaseUnit = 'set' | 'jacket' | 'pants'

export type ObiColor =
  | 'black'
  | 'blue'
  | 'red'
  | 'white'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'brown'

export type ObiMaterial = 'nami' | 'shushi' | 'yohachi' | 'silk'

/** Obi weave width in cm: 4 (normal) or 4.5 (special). */
export type ObiWidth = 4 | 4.5

/** Manufacturer's (HIROTA) logo placement. Both placements cost the same. */
export type MfrLogo = 'neck' | 'breast_neck'

export type Shrinkage = 'accounted' | 'to_add'

/** One embroidery field: how many characters and in which thread. */
export interface EmbroideryField {
  chars: number
  thread: Thread
}

/**
 * The four independent gi embroidery fields. `lapel`, `shoulder` and `chest`
 * live on the jacket; `pants` on the pants. Each is optional and priced per
 * character, summed across all present fields.
 */
export interface GiEmbroidery {
  lapel?: EmbroideryField
  shoulder?: EmbroideryField
  chest?: EmbroideryField
  pants?: EmbroideryField
}

/** Jacket (A–F) + pants (G–J) measurements, all in cm. F is ignored for sizing. */
export interface GiMeasurements {
  a?: number
  b?: number
  c?: number
  d?: number
  e?: number
  f?: number
  g?: number
  h?: number
  i?: number
  j?: number
}

// ---------------------------------------------------------------------------
// LineItemConfig — the discriminated union the engine prices.
// ---------------------------------------------------------------------------

/** Pattern A — a fixed-price simple product. Size/colour are cosmetic. */
export interface SimpleConfig {
  kind: 'simple'
  productId: number
  quantity?: number
  size?: string
  color?: string
}

/** Pattern B1 — a ready-made (standard) gi. Full set only; base is a lookup. */
export interface GiStandardConfig {
  kind: 'gi_standard'
  modelSlug: string
  fit: GiFit
  sizeCode: string
  quantity?: number
  labelId?: number
  /** Only tsubasa & pinac-kumite may take the manufacturer's logo in standard. */
  mfrLogo?: MfrLogo | null
  embroidery?: GiEmbroidery
  /** Sleeve (C) shortening — the desired shorter final cm, +1100. Present ⇒
   *  adjustment active. Must be strictly shorter than the size chart's C. Not
   *  offered on mh-12. */
  sleeveCcm?: number
  /** Pant-length (H) shortening — the desired shorter final cm, +1100. Present ⇒
   *  adjustment active. Must be strictly shorter than the size chart's H. Not
   *  offered on mh-12. */
  pantHcm?: number
  /** Required when C and/or H is adjusted (free selection). */
  shrinkage?: Shrinkage
}

/** Uniform hem selection for a custom gi (applied to whichever parts are bought). */
export interface HemSelection {
  widthCm: 4 | 5
  thickness: HemThickness
}

/** Pattern C — a made-to-order custom gi. The only genuinely complex case. */
export interface GiCustomConfig {
  kind: 'gi_custom'
  modelSlug: string
  /** Base-price band the buyer explicitly selected. */
  bandCode: string
  purchaseUnit: PurchaseUnit
  quantity?: number
  /** Jacket, kata-only. */
  collar?: 'thick' | 'extra_thick' | null
  /** Jacket, free toggles. */
  sideTies?: boolean
  chestTies?: boolean
  /** Pants, tsubasa-only, +550. Does not replace high waist. */
  elasticWaist?: boolean
  /** Jacket, +1100. */
  mfrLogo?: MfrLogo | null
  /** Uniform hem. Omit (or 4cm/normal) for the free default. */
  hem?: HemSelection
  /** Pants. Exact cm entered; price comes from the band. >13 not offered. */
  highWaistCm?: number
  embroidery?: GiEmbroidery
  labelId?: number
  shrinkage?: Shrinkage
  /** Sanity-check body data; stored on the order, never priced. */
  bodyHeightCm?: number
  bodyWeightKg?: number
  bodyWaistCm?: number
  /** Optional entered measurements, validated against the band's top size. */
  measurements?: GiMeasurements
}

/** Pattern B2 — an obi (belt). Availability is derived from the price table. */
export interface ObiConfig {
  kind: 'obi'
  color: ObiColor
  material: ObiMaterial
  widthCm: ObiWidth
  sizeCode: number
  quantity?: number
  labelId?: number
  /** The two bordable ends, each optional. */
  embroideryEndA?: EmbroideryField
  embroideryEndB?: EmbroideryField
}

export type LineItemConfig =
  | SimpleConfig
  | GiStandardConfig
  | GiCustomConfig
  | ObiConfig

// ---------------------------------------------------------------------------
// PriceBreakdown — the transparent, itemised result.
// ---------------------------------------------------------------------------

/** One line of a price breakdown. Every surcharge gets its own line. */
export interface PriceLine {
  label: string
  amountJpy: number
}

/**
 * The itemised price of a single line item. `lines` sum to `unitSubtotalJpy`
 * (the per-unit price); `totalJpy` is that times `quantity`. When `quote` is
 * true the item cannot be auto-priced (custom gi above size 8) and both totals
 * are null.
 */
export interface PriceBreakdown {
  lines: PriceLine[]
  quantity: number
  unitSubtotalJpy: number | null
  totalJpy: number | null
  quote: boolean
}

/** Result of pricing a whole cart. */
export interface CartBreakdown {
  items: PriceBreakdown[]
  totalJpy: number
  /** True if any item is quote-only and thus excluded from `totalJpy`. */
  containsQuote: boolean
}

// ---------------------------------------------------------------------------
// Validation.
// ---------------------------------------------------------------------------

export interface ValidationError {
  code: string
  message: string
  /** The offending field, when it maps to one. */
  field?: string
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] }
