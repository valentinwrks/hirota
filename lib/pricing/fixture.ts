// A hardcoded PricingData fixture built from REAL HIROTA values (a subset of the
// seed migrations), so the engine's unit tests run with no database. If a test
// needs the DB, the engine design is wrong — extend this fixture instead.

import { indexPricingData, type PricingData, type PricingTables } from './data'

const tables: PricingTables = {
  giModels: [
    { slug: 'tsubasa', name_en: 'Tsubasa', name_ja: 'ツバサ', class: 'kumite', material: '', available_custom: true, available_standard_slim: true, available_standard_normal: false, sort_order: 1 },
    { slug: 'kuu', name_en: 'Kū', name_ja: 'クウ', class: 'kumite', material: '', available_custom: true, available_standard_slim: false, available_standard_normal: false, sort_order: 2 },
    { slug: 'pinac-kumite', name_en: 'Pinac Kumite', name_ja: 'ピナック組手用', class: 'kumite', material: '', available_custom: true, available_standard_slim: true, available_standard_normal: true, sort_order: 3 },
    { slug: 'takumi', name_en: 'Takumi', name_ja: 'タクミ', class: 'kata', material: '', available_custom: true, available_standard_slim: false, available_standard_normal: false, sort_order: 4 },
    { slug: 'mh-10', name_en: 'MH-10', name_ja: 'MH-10', class: 'kata', material: '', available_custom: true, available_standard_slim: false, available_standard_normal: true, sort_order: 6 },
    { slug: 'mh-11', name_en: 'MH-11', name_ja: 'MH-11', class: 'kata', material: '', available_custom: true, available_standard_slim: false, available_standard_normal: true, sort_order: 7 },
    { slug: 'mh-12', name_en: 'MH-12', name_ja: 'MH-12', class: null, material: '', available_custom: false, available_standard_slim: false, available_standard_normal: true, sort_order: 8 },
  ],
  sizeCharts: [
    // normal chart rows used for custom band-fit validation.
    { chart: 'normal', size_code: '2.5', sort_order: 9, a: 72, b: 54, c: 38.5, d: 16, e: 25.5, f: 23, g: 27.5, h: 85, i: 23.5, j: 21.5 },
    { chart: 'normal', size_code: '5.5', sort_order: 15, a: 88, b: 64, c: 48, d: 18.5, e: 30.5, f: 26, g: 32.5, h: 103, i: 27, j: 24.5 },
    { chart: 'normal', size_code: '8', sort_order: 20, a: 103, b: 72, c: 55.5, d: 21.5, e: 33.5, f: 31, g: 37.5, h: 118, i: 30.5, j: 29.5 },
    { chart: 'slim', size_code: '7', sort_order: 12, a: 100, b: 67, c: 53.5, d: 19.5, e: 28, f: 35, g: 34, h: 119, i: 26, j: 30 },
  ],
  giStandardPrices: [
    { model_slug: 'tsubasa', fit: 'slim', size_code: '7', price: 22330 },
    { model_slug: 'mh-10', fit: 'normal', size_code: '0', price: 17710 },
    { model_slug: 'mh-12', fit: 'normal', size_code: '0', price: 9130 },
    { model_slug: 'pinac-kumite', fit: 'normal', size_code: '5', price: 19030 },
  ],
  giCustomBasePrices: [
    { band_code: 'up_to_2_5', label_en: 'Up to 2½', top_size_code: '2.5', base_price: 29700, sort_order: 1 },
    { band_code: '3_to_5_5', label_en: '3 to 5½', top_size_code: '5.5', base_price: 31900, sort_order: 2 },
    { band_code: '6_to_8', label_en: '6 to 8', top_size_code: '8', base_price: 35200, sort_order: 3 },
    { band_code: 'above_8', label_en: 'Above 8 (quote on request)', top_size_code: null, base_price: null, sort_order: 4 },
  ],
  giOptions: [
    { code: 'collar_thick', name_en: 'Thick collar', name_ja: null, part: 'jacket', price: 550, kata_only: true, restrict_model_slug: null, sort_order: 1 },
    { code: 'collar_extra_thick', name_en: 'Extra-thick collar', name_ja: null, part: 'jacket', price: 1100, kata_only: true, restrict_model_slug: null, sort_order: 2 },
    { code: 'side_ties', name_en: 'Side ties (waki)', name_ja: null, part: 'jacket', price: 0, kata_only: false, restrict_model_slug: null, sort_order: 3 },
    { code: 'chest_ties', name_en: 'Chest ties (mune)', name_ja: null, part: 'jacket', price: 0, kata_only: false, restrict_model_slug: null, sort_order: 4 },
    { code: 'elastic_waist', name_en: 'Elastic waist', name_ja: null, part: 'pants', price: 550, kata_only: false, restrict_model_slug: 'tsubasa', sort_order: 5 },
    { code: 'mfr_logo_neck', name_en: 'Manufacturer logo — neck only', name_ja: null, part: 'jacket', price: 1100, kata_only: false, restrict_model_slug: null, sort_order: 6 },
    { code: 'mfr_logo_breast_neck', name_en: 'Manufacturer logo — right breast & neck', name_ja: null, part: 'jacket', price: 1100, kata_only: false, restrict_model_slug: null, sort_order: 7 },
    { code: 'adjust_sleeve_c', name_en: 'Sleeve shortening (C, standard)', name_ja: null, part: 'jacket', price: 1100, kata_only: false, restrict_model_slug: null, sort_order: 8 },
    { code: 'adjust_pant_h', name_en: 'Pant-length shortening (H, standard)', name_ja: null, part: 'pants', price: 1100, kata_only: false, restrict_model_slug: null, sort_order: 9 },
  ],
  giHemPrices: [
    { part: 'jacket', width_cm: 4, thickness: 'normal', price: 0, kata_only: false },
    { part: 'jacket', width_cm: 4, thickness: 'thick', price: 1100, kata_only: true },
    { part: 'jacket', width_cm: 4, thickness: 'ultra', price: 2200, kata_only: true },
    { part: 'jacket', width_cm: 5, thickness: 'normal', price: 1100, kata_only: false },
    { part: 'jacket', width_cm: 5, thickness: 'thick', price: 2200, kata_only: true },
    { part: 'jacket', width_cm: 5, thickness: 'ultra', price: 2200, kata_only: true },
    { part: 'pants', width_cm: 4, thickness: 'normal', price: 0, kata_only: false },
    { part: 'pants', width_cm: 4, thickness: 'thick', price: 550, kata_only: true },
    { part: 'pants', width_cm: 4, thickness: 'ultra', price: 1100, kata_only: true },
    { part: 'pants', width_cm: 5, thickness: 'normal', price: 550, kata_only: false },
    { part: 'pants', width_cm: 5, thickness: 'thick', price: 1100, kata_only: true },
    { part: 'pants', width_cm: 5, thickness: 'ultra', price: 1100, kata_only: true },
  ],
  giHighWaistPrices: [
    { min_cm: 1, max_cm: 4, price: 2200 },
    { min_cm: 5, max_cm: 7, price: 3300 },
    { min_cm: 8, max_cm: 10, price: 3850 },
    { min_cm: 11, max_cm: 13, price: 4400 },
  ],
  giEmbroideryPrices: [
    { thread: 'standard', price_per_char: 220 },
    { thread: 'metallic', price_per_char: 275 },
  ],
  obiSizes: [
    { size_code: 0, length_cm: 205 },
    { size_code: 3, length_cm: 250 },
    { size_code: 8, length_cm: 325 },
    { size_code: 9, length_cm: 340 },
  ],
  obiPrices: [
    { color: 'black', material: 'silk', width_cm: 4.0, size_code: 8, price: 10890 },
    { color: 'black', material: 'nami', width_cm: 4.0, size_code: 0, price: 2310 },
    { color: 'white', material: 'nami', width_cm: 4.0, size_code: 9, price: null },
    { color: 'blue', material: 'shushi', width_cm: 4.5, size_code: 3, price: 4950 },
  ],
  obiEmbroideryPrices: [
    { width_cm: 4.0, thread: 'standard', price_per_char: 220 },
    { width_cm: 4.0, thread: 'metallic', price_per_char: 275 },
    { width_cm: 4.5, thread: 'standard', price_per_char: 275 },
    { width_cm: 4.5, thread: 'metallic', price_per_char: 330 },
  ],
  products: [
    { id: 1, name: { en: 'Seiken Supporter' }, description: { en: 'HIROTA logo' }, product_type: null, category: 'equipment', subcategory: 'competition-equipment', price: 2530, options: null, stock: 100 },
    { id: 3, name: { en: 'Red Fist Supporter' }, description: null, product_type: null, category: 'equipment', subcategory: 'competition-equipment', price: 3960, options: { size: ['XS', 'S', 'M', 'L'] }, stock: 100 },
  ],
}

export const fixtureData: PricingData = indexPricingData(tables)
