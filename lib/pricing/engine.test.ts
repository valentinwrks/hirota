import { describe, expect, it } from 'vitest'
import { fixtureData as data } from './fixture'
import { PricingError, priceCart, priceLineItem, validateConfig } from './engine'
import type { GiCustomConfig, LineItemConfig } from './types'

describe('simple products', () => {
  it('prices at the fixed price times quantity; size/colour never change it', () => {
    const b = priceLineItem(
      { kind: 'simple', productId: 3, quantity: 2, size: 'L', color: 'red' },
      data,
    )
    expect(b.unitSubtotalJpy).toBe(3960)
    expect(b.totalJpy).toBe(3960 * 2)
    expect(b.lines).toHaveLength(1)
  })
})

describe('gi standard', () => {
  it('sums base + embroidery + one adjustment', () => {
    const b = priceLineItem(
      {
        kind: 'gi_standard',
        modelSlug: 'mh-10',
        fit: 'normal',
        sizeCode: '0',
        embroidery: { lapel: { chars: 3, thread: 'standard' } },
        sleeveCcm: 40,
        shrinkage: 'accounted',
      },
      data,
    )
    // 17710 base + (3 × 220) embroidery + 1100 sleeve adjustment.
    expect(b.totalJpy).toBe(17710 + 660 + 1100)
  })

  it("rejects the manufacturer's logo on mh-10 (only tsubasa & pinac-kumite allow it)", () => {
    const config: LineItemConfig = {
      kind: 'gi_standard',
      modelSlug: 'mh-10',
      fit: 'normal',
      sizeCode: '0',
      mfrLogo: 'neck',
    }
    expect(validateConfig(config, data).ok).toBe(false)
    expect(() => priceLineItem(config, data)).toThrow(PricingError)
  })

  it('rejects C/H adjustment on mh-12', () => {
    const config: LineItemConfig = {
      kind: 'gi_standard',
      modelSlug: 'mh-12',
      fit: 'normal',
      sizeCode: '0',
      pantHcm: 40,
      shrinkage: 'accounted',
    }
    expect(() => priceLineItem(config, data)).toThrow(PricingError)
  })

  it('requires a shrinkage selection when adjusting', () => {
    const config: LineItemConfig = {
      kind: 'gi_standard',
      modelSlug: 'mh-10',
      fit: 'normal',
      sizeCode: '0',
      sleeveCcm: 40,
    }
    expect(validateConfig(config, data).ok).toBe(false)
  })

  it('accepts a C/H shortening strictly under the size-chart value', () => {
    // tsubasa slim #7: size-chart C = 53.5, H = 119.
    const b = priceLineItem(
      {
        kind: 'gi_standard',
        modelSlug: 'tsubasa',
        fit: 'slim',
        sizeCode: '7',
        sleeveCcm: 50,
        pantHcm: 115,
        shrinkage: 'accounted',
      },
      data,
    )
    expect(b.totalJpy).toBe(22330 + 1100 + 1100)
  })

  it('rejects a C value not strictly shorter than the size chart (equal is invalid)', () => {
    const config: LineItemConfig = {
      kind: 'gi_standard',
      modelSlug: 'tsubasa',
      fit: 'slim',
      sizeCode: '7',
      sleeveCcm: 53.5, // equals the chart C → invalid (shortens only)
      shrinkage: 'accounted',
    }
    expect(validateConfig(config, data).ok).toBe(false)
    expect(() => priceLineItem(config, data)).toThrow(PricingError)
  })

  it('rejects an H value longer than the size chart', () => {
    const config: LineItemConfig = {
      kind: 'gi_standard',
      modelSlug: 'tsubasa',
      fit: 'slim',
      sizeCode: '7',
      pantHcm: 120, // chart H = 119
      shrinkage: 'accounted',
    }
    expect(validateConfig(config, data).ok).toBe(false)
  })
})

describe('gi custom — purchase unit multipliers', () => {
  const base = 35200 // band 6_to_8
  const mk = (purchaseUnit: GiCustomConfig['purchaseUnit']): GiCustomConfig => ({
    kind: 'gi_custom',
    modelSlug: 'takumi',
    bandCode: '6_to_8',
    purchaseUnit,
  })

  it('set ×1.0, jacket ×0.6, pants ×0.5', () => {
    expect(priceLineItem(mk('set'), data).totalJpy).toBe(base)
    expect(priceLineItem(mk('jacket'), data).totalJpy).toBe(Math.round(base * 0.6))
    expect(priceLineItem(mk('pants'), data).totalJpy).toBe(Math.round(base * 0.5))
  })

  it('jacket + pants bought separately = 1.1× the set (parts do not sum to 1.0)', () => {
    const jacket = priceLineItem(mk('jacket'), data).totalJpy!
    const pants = priceLineItem(mk('pants'), data).totalJpy!
    expect(jacket + pants).toBe(Math.round(base * 1.1))
    expect(jacket + pants).toBeGreaterThan(base)
  })

  it('band above_8 returns a quote with no total', () => {
    const b = priceLineItem({ ...mk('set'), bandCode: 'above_8' }, data)
    expect(b.quote).toBe(true)
    expect(b.totalJpy).toBeNull()
    expect(b.unitSubtotalJpy).toBeNull()
  })
})

describe('gi custom — hems', () => {
  it('a full set hem = jacket row + pants row for the same 5cm/thick selection', () => {
    const b = priceLineItem(
      {
        kind: 'gi_custom',
        modelSlug: 'takumi', // kata: thick allowed
        bandCode: '6_to_8',
        purchaseUnit: 'set',
        hem: { widthCm: 5, thickness: 'thick' },
      },
      data,
    )
    // jacket 5/thick = 2200, pants 5/thick = 1100 → 3300.
    const hemLine = b.lines.find((l) => l.label.startsWith('Hems'))
    expect(hemLine?.amountJpy).toBe(3300)
    expect(b.totalJpy).toBe(35200 + 3300)
  })

  it('kumite models reject 5cm/thick but accept 5cm/normal', () => {
    const thick: LineItemConfig = {
      kind: 'gi_custom',
      modelSlug: 'kuu', // kumite
      bandCode: '6_to_8',
      purchaseUnit: 'set',
      hem: { widthCm: 5, thickness: 'thick' },
    }
    expect(() => priceLineItem(thick, data)).toThrow(PricingError)

    const normal = priceLineItem({ ...thick, hem: { widthCm: 5, thickness: 'normal' } }, data)
    // jacket 5/normal = 1100, pants 5/normal = 550 → 1650.
    expect(normal.totalJpy).toBe(35200 + 1650)
  })
})

describe('gi custom — option availability', () => {
  it('rejects a kata-only collar on a kumite model', () => {
    const config: LineItemConfig = {
      kind: 'gi_custom',
      modelSlug: 'kuu', // kumite
      bandCode: '6_to_8',
      purchaseUnit: 'set',
      collar: 'thick',
    }
    expect(() => priceLineItem(config, data)).toThrow(PricingError)
  })

  it('rejects elastic waist off tsubasa but allows it on tsubasa', () => {
    const offTsubasa: LineItemConfig = {
      kind: 'gi_custom',
      modelSlug: 'kuu',
      bandCode: '6_to_8',
      purchaseUnit: 'set',
      elasticWaist: true,
    }
    expect(() => priceLineItem(offTsubasa, data)).toThrow(PricingError)

    const onTsubasa = priceLineItem(
      {
        kind: 'gi_custom',
        modelSlug: 'tsubasa',
        bandCode: '6_to_8',
        purchaseUnit: 'set',
        elasticWaist: true,
      },
      data,
    )
    expect(onTsubasa.totalJpy).toBe(35200 + 550)
  })

  it('prices high waist 12cm from the 11–13cm band (4400)', () => {
    const b = priceLineItem(
      {
        kind: 'gi_custom',
        modelSlug: 'takumi',
        bandCode: '6_to_8',
        purchaseUnit: 'set',
        highWaistCm: 12,
      },
      data,
    )
    expect(b.totalJpy).toBe(35200 + 4400)
  })

  it('rejects high waist above 13cm', () => {
    const config: LineItemConfig = {
      kind: 'gi_custom',
      modelSlug: 'takumi',
      bandCode: '6_to_8',
      purchaseUnit: 'set',
      highWaistCm: 14,
    }
    expect(() => priceLineItem(config, data)).toThrow(PricingError)
  })
})

describe('gi custom — measurement fitting', () => {
  it('rejects a measurement that exceeds the top size of the band', () => {
    const config: LineItemConfig = {
      kind: 'gi_custom',
      modelSlug: 'takumi',
      bandCode: '3_to_5_5', // top size 5.5 (normal) → a = 88
      purchaseUnit: 'set',
      measurements: { a: 90 },
    }
    expect(validateConfig(config, data).ok).toBe(false)
    expect(() => priceLineItem(config, data)).toThrow(PricingError)
  })

  it('subtracts the high waist before checking H and J', () => {
    // normal 8: h = 118. Measured H 130 − 13cm high waist = 117 ≤ 118 → ok.
    const config: LineItemConfig = {
      kind: 'gi_custom',
      modelSlug: 'takumi',
      bandCode: '6_to_8',
      purchaseUnit: 'set',
      highWaistCm: 13,
      measurements: { h: 130 },
    }
    expect(validateConfig(config, data).ok).toBe(true)
  })
})

describe('obi', () => {
  it('prices a valid combo from the lookup table', () => {
    const b = priceLineItem(
      { kind: 'obi', color: 'black', material: 'silk', widthCm: 4, sizeCode: 8 },
      data,
    )
    expect(b.totalJpy).toBe(10890)
  })

  it('returns unavailable for a NULL-price size', () => {
    const config: LineItemConfig = {
      kind: 'obi',
      color: 'white',
      material: 'nami',
      widthCm: 4,
      sizeCode: 9,
    }
    expect(validateConfig(config, data).ok).toBe(false)
    expect(() => priceLineItem(config, data)).toThrow(PricingError)
  })

  it('charges embroidery at the 4cm rate', () => {
    const b = priceLineItem(
      {
        kind: 'obi',
        color: 'black',
        material: 'nami',
        widthCm: 4,
        sizeCode: 0,
        embroideryEndA: { chars: 5, thread: 'standard' },
      },
      data,
    )
    // 2310 base + 5 × 220 = 3410.
    expect(b.totalJpy).toBe(2310 + 5 * 220)
  })

  it('charges embroidery at the higher 4.5cm rate', () => {
    const b = priceLineItem(
      {
        kind: 'obi',
        color: 'blue',
        material: 'shushi',
        widthCm: 4.5,
        sizeCode: 3,
        embroideryEndA: { chars: 5, thread: 'standard' },
      },
      data,
    )
    // 4950 base + 5 × 275 = 6325.
    expect(b.totalJpy).toBe(4950 + 5 * 275)
  })
})

describe('cart', () => {
  it('sums multiple line items', () => {
    const cart: LineItemConfig[] = [
      { kind: 'simple', productId: 1, quantity: 3 }, // 2530 × 3 = 7590
      { kind: 'obi', color: 'black', material: 'silk', widthCm: 4, sizeCode: 8 }, // 10890
    ]
    const result = priceCart(cart, data)
    expect(result.totalJpy).toBe(7590 + 10890)
    expect(result.containsQuote).toBe(false)
  })
})
