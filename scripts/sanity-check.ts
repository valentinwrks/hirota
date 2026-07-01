/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Data sanity check for the HIROTA Supabase database.
 *
 * Standalone script (run via `pnpm sanity`). Connects with the SECRET key so it
 * bypasses RLS and can also count the orders tables. This is intentionally NOT
 * the app's Supabase client architecture — that comes later. Env is loaded by
 * tsx via `--env-file=.env.local`.
 *
 * It runs a data-driven list of checks (row counts, integrity, spot values),
 * prints PASS/FAIL for each, and exits(1) if any check fails.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

if (!url || !secretKey) {
  console.error(
    'Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set ' +
      '(run via `pnpm sanity`, which loads .env.local).',
  )
  process.exit(1)
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false },
})

// A single check produces a pass/fail plus a human-readable detail line.
type CheckResult = { label: string; ok: boolean; detail: string }
type Check = () => Promise<CheckResult>

// Narrow builder alias for the .in()/.not()/.eq() filter callbacks below.
type Query = any

/** Exact row count, optionally scoped by a filter callback. */
function count(
  label: string,
  table: string,
  expected: number,
  filter?: (q: Query) => Query,
): Check {
  return async () => {
    let query: Query = supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    if (filter) query = filter(query)
    const { count: got, error } = await query
    if (error) return { label, ok: false, detail: `query error: ${error.message}` }
    return {
      label,
      ok: got === expected,
      detail: `expected ${expected}, got ${got}`,
    }
  }
}

/** Fetch a single row via filters and assert one or more of its columns. */
function value(
  label: string,
  table: string,
  filter: (q: Query) => Query,
  select: string,
  expected: Record<string, unknown>,
): Check {
  return async () => {
    const { data, error } = await filter(supabase.from(table).select(select))
      .limit(1)
      .maybeSingle()
    if (error) return { label, ok: false, detail: `query error: ${error.message}` }
    if (!data) return { label, ok: false, detail: 'no matching row' }
    const mismatches: string[] = []
    for (const [k, exp] of Object.entries(expected)) {
      const actual = (data as Record<string, unknown>)[k]
      // Loose equality so numeric(2,1) 4.0 vs 4 etc. compare cleanly.
      if (actual != exp) mismatches.push(`${k}: expected ${exp}, got ${actual}`)
    }
    return {
      label,
      ok: mismatches.length === 0,
      detail: mismatches.length ? mismatches.join('; ') : 'ok',
    }
  }
}

const checks: Check[] = [
  // ── Row counts (exact) ──
  count('labels = 15', 'labels', 15),
  count('gi_models = 8', 'gi_models', 8),
  count('size_charts = 32', 'size_charts', 32),
  count('size_charts normal = 20', 'size_charts', 20, (q) => q.eq('chart', 'normal')),
  count('size_charts slim = 12', 'size_charts', 12, (q) => q.eq('chart', 'slim')),
  count('gi_standard_prices = 91', 'gi_standard_prices', 91),
  count('gi_custom_base_prices = 4', 'gi_custom_base_prices', 4),
  count('gi_options = 9', 'gi_options', 9),
  count('gi_hem_prices = 12', 'gi_hem_prices', 12),
  count('gi_high_waist_prices = 4', 'gi_high_waist_prices', 4),
  count('gi_embroidery_prices = 2', 'gi_embroidery_prices', 2),
  count('obi_sizes = 14', 'obi_sizes', 14),
  count('obi_prices = 322', 'obi_prices', 322),
  count('obi_prices non-null = 267', 'obi_prices', 267, (q) => q.not('price', 'is', null)),
  count('obi_embroidery_prices = 4', 'obi_embroidery_prices', 4),
  count('products = 32', 'products', 32),
  count('orders = 0', 'orders', 0),
  count('order_items = 0', 'order_items', 0),

  // ── Integrity: special (4.5cm) belts must not exist in sizes 0–2 ──
  count(
    'obi_prices 4.5cm sizes 0–2 all NULL price',
    'obi_prices',
    0,
    (q) => q.eq('width_cm', 4.5).in('size_code', [0, 1, 2]).not('price', 'is', null),
  ),

  // ── Spot values ──
  value(
    'gi_standard_prices tsubasa/slim/7 → 22330',
    'gi_standard_prices',
    (q) => q.eq('model_slug', 'tsubasa').eq('fit', 'slim').eq('size_code', '7'),
    'price',
    { price: 22330 },
  ),
  value(
    'gi_custom_base_prices 6_to_8 → 35200 / top 8',
    'gi_custom_base_prices',
    (q) => q.eq('band_code', '6_to_8'),
    'base_price, top_size_code',
    { base_price: 35200, top_size_code: '8' },
  ),
  value(
    'gi_hem_prices pants/4/thick → 550',
    'gi_hem_prices',
    (q) => q.eq('part', 'pants').eq('width_cm', 4).eq('thickness', 'thick'),
    'price',
    { price: 550 },
  ),
  value(
    'gi_high_waist_prices 11–13 → 4400',
    'gi_high_waist_prices',
    (q) => q.eq('min_cm', 11).eq('max_cm', 13),
    'price',
    { price: 4400 },
  ),
  value(
    'obi_prices black/silk/4.0/8 → 10890',
    'obi_prices',
    (q) => q.eq('color', 'black').eq('material', 'silk').eq('width_cm', 4.0).eq('size_code', 8),
    'price',
    { price: 10890 },
  ),
  value(
    'obi_prices black/silk/4.5/13 → 15125',
    'obi_prices',
    (q) => q.eq('color', 'black').eq('material', 'silk').eq('width_cm', 4.5).eq('size_code', 13),
    'price',
    { price: 15125 },
  ),
  value(
    'products id=1 → Seiken Supporter / 2530',
    'products',
    (q) => q.eq('id', 1),
    'name, price',
    { price: 2530 },
    // name->>'en' asserted below via a dedicated JSONB check.
  ),
  value(
    'products id=32 → 880',
    'products',
    (q) => q.eq('id', 32),
    'price',
    { price: 880 },
  ),
]

// The products id=1 name->>'en' assertion needs JSONB extraction, so run it
// separately rather than shoe-horning it into the flat value() comparator.
const jsonbChecks: Check[] = [
  async () => {
    const label = "products id=1 name->>'en' = 'Seiken Supporter'"
    const { data, error } = await supabase
      .from('products')
      .select('name')
      .eq('id', 1)
      .maybeSingle()
    if (error) return { label, ok: false, detail: `query error: ${error.message}` }
    const en = (data?.name as { en?: string } | undefined)?.en
    return { label, ok: en === 'Seiken Supporter', detail: `got ${JSON.stringify(en)}` }
  },
]

async function main() {
  console.log('HIROTA data sanity check\n' + '='.repeat(40))
  let failures = 0
  for (const check of [...checks, ...jsonbChecks]) {
    const result = await check()
    if (!result.ok) failures++
    const tag = result.ok ? 'PASS' : 'FAIL'
    console.log(`[${tag}] ${result.label}` + (result.ok ? '' : `  — ${result.detail}`))
  }
  console.log('='.repeat(40))
  if (failures) {
    console.log(`${failures} check(s) FAILED.`)
    process.exit(1)
  }
  console.log('All checks passed.')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
