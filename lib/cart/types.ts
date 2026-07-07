import type { LocalizedText } from "../i18n/localized";
import type {
  GiCustomConfig,
  GiMeasurements,
  GiStandardConfig,
  HemSelection,
  MfrLogo,
  ObiConfig,
  PriceBreakdown,
  PurchaseUnit,
  Shrinkage,
} from "../pricing/types";

// Cart line items are a discriminated union on `kind`. Only `simple` is used
// this sprint; `configured` is defined now so the made-to-order configurator
// (standard gi / custom gi / obi) can slot in later without reshaping the cart.
//
// Prices are snapshotted in JPY (the source of truth) at add-to-cart time and
// never recomputed from a live FX rate — USD is a display-only conversion.

type CartLineBase = {
  /** Stable per-line id (distinguishes lines with the same product/variant). */
  lineId: string;
  productId: number;
  /** Localized name snapshot so the cart renders without re-fetching. */
  name: LocalizedText;
  /** Unit price in integer JPY, snapshotted at add time. */
  unitPriceJpy: number;
  quantity: number;
  /** Public image path snapshot (see productImage). */
  image?: string;
};

// The cosmetic variant groups a simple product can offer. Price-neutral, but
// REQUIRED for fulfillment when the product offers them (AGENTS §8.1).
export type SimpleVariantGroup = "size" | "color";

// Pattern A: fixed-price product. size/color are price-neutral. They stay
// optional at the type level (many products offer no groups), but when a product
// DOES offer a group the UI and the cart guard require a chosen value.
export type SimpleCartItem = CartLineBase & {
  kind: "simple";
  slug: string;
  size?: string;
  color?: string;
};

// A concise, display-ready summary of a configured obi. The FULL resolved spec
// lives in `config`; this is only what the cart panel needs to render a compact
// line without re-deriving anything (labels/thread etc. rendered by the caller).
export type ObiCartSummary = {
  colorKey: string;
  materialKey: string;
  widthCm: number;
  sizeCode: number;
  /** Character counts per end; 0 = that end is not embroidered. */
  endAChars: number;
  endBChars: number;
  /** Embroidery text per end (fulfilment detail); present when that end is used. */
  endAText?: string;
  endBText?: string;
  /** Chosen embroidery thread color (fulfilment detail); absent if no embroidery. */
  threadColorKey?: string;
  labelName: string;
};

// The resolved snapshot for a configured line item, carrying the exact engine
// input (`config`) and the itemized `breakdown` the engine returned, so the cart
// (and, later, the order) renders precisely what was priced. A discriminated
// union so gi snapshots can slot in later; obi is the first member.
export type ObiConfiguredSnapshot = {
  kind: "obi";
  config: ObiConfig;
  breakdown: PriceBreakdown;
  summary: ObiCartSummary;
};

// One embroidered gi field, for the cart summary (fulfilment detail). Only
// present fields are recorded.
export type GiEmbroiderySummaryField = {
  /** Field key: 'lapel' | 'shoulder' | 'chest' | 'pants'. */
  field: string;
  chars: number;
  text: string;
};

// A concise, display-ready summary of a configured standard gi. The FULL
// resolved spec lives in `config`; the model name lives on the cart line's
// localized `name`, so this holds only the option lines the cart panel renders.
export type GiStandardCartSummary = {
  /** Model slug (e.g. 'mh-11'), for the localized short model name in the line. */
  modelSlug: string;
  /** 'slim' | 'normal'. */
  fit: string;
  sizeCode: string;
  /** Manufacturer's-logo placement key ('neck' | 'breast_neck') when present. */
  mfrLogo?: string;
  /** Chosen embroidery thread color (fulfilment detail); absent if no embroidery. */
  threadColorKey?: string;
  embroidery: GiEmbroiderySummaryField[];
  /** Shortened sleeve (C) final cm, when the sleeve was adjusted. */
  sleeveCcm?: number;
  /** Shortened pant-length (H) final cm, when the pant length was adjusted. */
  pantHcm?: number;
  /** 'accounted' | 'to_add', present only when C and/or H was adjusted. */
  shrinkage?: string;
  labelName: string;
};

export type GiStandardConfiguredSnapshot = {
  kind: "gi_standard";
  config: GiStandardConfig;
  breakdown: PriceBreakdown;
  summary: GiStandardCartSummary;
};

// A concise, display-ready summary of a configured CUSTOM gi (Pattern C). The
// FULL resolved spec (incl. every measurement + body data) lives in `config`;
// this holds what the cart panel renders as compact lines. The model name lives
// on the cart line's localized `name`. Per §7 the snapshot must let the admin
// later render the COMPLETE spec — so nothing here is lossy relative to `config`.
export type GiCustomCartSummary = {
  /** Model slug (e.g. 'takumi'), for the localized short model name in the line. */
  modelSlug: string;
  /** 'set' | 'jacket' | 'pants'. */
  purchaseUnit: PurchaseUnit;
  /** Base-price band code (e.g. '3_to_5_5'), for the localized band label. */
  bandCode: string;
  /** Every entered measurement A–J (fulfilment; F is collected but unvalidated). */
  measurements: GiMeasurements;
  /** Collar thickness ('thick' | 'extra_thick'), when chosen (jacket, kata only). */
  collar?: "thick" | "extra_thick";
  /** Free jacket toggles. */
  sideTies: boolean;
  chestTies: boolean;
  /** Pants, Tsubasa-only. */
  elasticWaist: boolean;
  /** Manufacturer's-logo placement key ('neck' | 'breast_neck') when present. */
  mfrLogo?: MfrLogo;
  /** Non-default hem selection (uniform); absent ⇒ the free 4cm/normal default. */
  hem?: HemSelection;
  /** Exact high-waist cm, when added (pants). */
  highWaistCm?: number;
  /** Chosen embroidery thread color (fulfilment detail); absent if no embroidery. */
  threadColorKey?: string;
  embroidery: GiEmbroiderySummaryField[];
  /** 'accounted' | 'to_add' — always present (real measurements are entered). */
  shrinkage?: Shrinkage;
  /** Sanity-check body data (stored, never priced). */
  bodyHeightCm?: number;
  bodyWeightKg?: number;
  bodyWaistCm?: number;
  labelName: string;
};

export type GiCustomConfiguredSnapshot = {
  kind: "gi_custom";
  config: GiCustomConfig;
  breakdown: PriceBreakdown;
  summary: GiCustomCartSummary;
};

export type ConfiguredSnapshot =
  | ObiConfiguredSnapshot
  | GiStandardConfiguredSnapshot
  | GiCustomConfiguredSnapshot;

// The configurator output: a resolved spec + itemized breakdown snapshot. The
// line's `unitPriceJpy` mirrors `config.breakdown.unitSubtotalJpy` at add time.
export type ConfiguredCartItem = CartLineBase & {
  kind: "configured";
  config: ConfiguredSnapshot;
};

export type CartItem = SimpleCartItem | ConfiguredCartItem;

/** Total for a line in JPY. */
export function lineTotalJpy(item: CartItem): number {
  return item.unitPriceJpy * item.quantity;
}

/** Cart subtotal in JPY (source of truth; convert for display only). */
export function cartSubtotalJpy(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + lineTotalJpy(item), 0);
}
