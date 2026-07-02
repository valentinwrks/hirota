// HIROTA obi — typed model definitions (AGENTS §8.3).
//
// The obi dependency chain (color → material → width → size) is business logic,
// so per §10 it lives here as typed definitions, never inline in JSX. The
// color→material and material→width relationships are fixed rules and are
// declared as typed maps below; the OFFERED SIZES for a chosen (material, width)
// are NOT hardcoded — they are derived at runtime from the non-NULL rows in
// `obi_prices` (see `offeredSizes`), so a future size is a one-cell DB update.
//
// Pure: no I/O, no React. `offeredSizes` reads the already-loaded `PricingData`.

import type { PricingData } from '../pricing/data'
import { obiPriceKey } from '../pricing/data'
import type { ObiColor, ObiMaterial, ObiWidth, Thread } from '../pricing/types'

/** All obi colors in display order. */
export const OBI_COLORS: readonly ObiColor[] = [
  'black',
  'blue',
  'red',
  'white',
  'green',
  'yellow',
  'purple',
  'orange',
  'brown',
] as const

/** A titled group of colors, shown as a captioned sub-table in the picker. */
export interface ObiColorGroup {
  /** i18n key under `Obi.colorGroups`. */
  titleKey: string
  colors: readonly ObiColor[]
}

/**
 * Colors grouped by the grade/use they signify. Purely a presentational
 * grouping of `OBI_COLORS`; flattening these yields the same nine colors.
 */
export const OBI_COLOR_GROUPS: readonly ObiColorGroup[] = [
  { titleKey: 'dan', colors: ['black'] },
  { titleKey: 'competition', colors: ['blue', 'red'] },
  { titleKey: 'kyu', colors: ['white', 'green', 'yellow', 'purple', 'orange', 'brown'] },
] as const

/** All obi materials in display order (canonical codes; §8.3 name mapping). */
export const OBI_MATERIALS: readonly ObiMaterial[] = [
  'nami',
  'shushi',
  'yohachi',
  'silk',
] as const

/** Every obi width, for the always-visible width table (4cm normal, 4.5 special). */
export const OBI_WIDTHS: readonly ObiWidth[] = [4, 4.5] as const

/**
 * Color → materials it can be made in (§8.3). Black offers all four; blue/red
 * offer the three cottons; every "Other" color (white + green/purple/brown/
 * yellow/orange) is Nami only.
 */
export const COLOR_MATERIALS: Record<ObiColor, readonly ObiMaterial[]> = {
  black: ['nami', 'shushi', 'yohachi', 'silk'],
  blue: ['nami', 'shushi', 'yohachi'],
  red: ['nami', 'shushi', 'yohachi'],
  white: ['nami'],
  green: ['nami'],
  yellow: ['nami'],
  purple: ['nami'],
  orange: ['nami'],
  brown: ['nami'],
}

/**
 * Material → widths it can be woven at (§8.3). Nami is 4cm (normal) only; the
 * other three add 4.5cm (special).
 */
export const MATERIAL_WIDTHS: Record<ObiMaterial, readonly ObiWidth[]> = {
  nami: [4],
  shushi: [4, 4.5],
  yohachi: [4, 4.5],
  silk: [4, 4.5],
}

/**
 * Selectable embroidery thread colors. The engine prices by thread *category*
 * (standard vs metallic); the specific color is a cosmetic/fulfilment detail.
 * Standard colors all price at the standard rate; gold/silver at the metallic
 * rate (§8.3 obi embroidery table).
 */
export type ObiThreadColor =
  | 'golden_brown'
  | 'red'
  | 'white'
  | 'silver_grey'
  | 'gold'
  | 'silver'

export const OBI_STANDARD_THREAD_COLORS: readonly ObiThreadColor[] = [
  'golden_brown',
  'red',
  'white',
  'silver_grey',
] as const

export const OBI_METALLIC_THREAD_COLORS: readonly ObiThreadColor[] = [
  'gold',
  'silver',
] as const

/** All thread colors in one list (standard first, then metallic). */
export const OBI_THREAD_COLORS: readonly ObiThreadColor[] = [
  ...OBI_STANDARD_THREAD_COLORS,
  ...OBI_METALLIC_THREAD_COLORS,
] as const

/** The pricing category (standard/metallic) a thread color belongs to. */
export function threadCategory(color: ObiThreadColor): Thread {
  return color === 'gold' || color === 'silver' ? 'metallic' : 'standard'
}

/**
 * "Other" colors: everything except black/blue/red. Only Nami is offered, and
 * embroidery on them is restricted to standard (non-metallic) thread (§8.3).
 */
export function isOtherColor(color: ObiColor): boolean {
  return color !== 'black' && color !== 'blue' && color !== 'red'
}

/**
 * Whether metallic (gold/silver) embroidery thread is offered for a color.
 * "Other"-color belts can only be embroidered in black, so metallic is off.
 */
export function metallicAllowed(color: ObiColor): boolean {
  return !isOtherColor(color)
}

/** The threads offered for a given color (metallic gated by `metallicAllowed`). */
export function offeredThreads(color: ObiColor): readonly Thread[] {
  return metallicAllowed(color) ? (['standard', 'metallic'] as const) : (['standard'] as const)
}

/**
 * The sizes offered for a chosen (color, material, width) — DERIVED from the
 * loaded price table: exactly the size codes whose price row exists and is
 * non-NULL (§8.3, "no runtime size math"). Sorted ascending.
 */
export function offeredSizes(
  data: PricingData,
  color: ObiColor,
  material: ObiMaterial,
  width: ObiWidth,
): number[] {
  const sizes: number[] = []
  for (const [sizeCode] of data.obiSizes) {
    const price = data.obiPrices.get(obiPriceKey(color, material, width, sizeCode))
    if (price !== undefined && price !== null) sizes.push(sizeCode)
  }
  return sizes.sort((a, b) => a - b)
}
