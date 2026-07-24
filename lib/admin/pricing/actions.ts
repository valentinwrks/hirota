"use server";

import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { Constants } from "@/lib/database.types";

// Sprint C save path. One action per editor type:
//   - updatePriceCell: a single lookup-table cell (Patterns B/C), dispatched
//     through a FIXED target registry — the client names a registry key, never
//     a table or column, and each branch extracts + validates its exact pk
//     fields (client input is never spread into a query).
//   - updateProduct: a Pattern A row (price + stock together).
//
// Security is layered: these validations are the polite front door; the real
// guard is RLS (is_admin() UPDATE policies) + column grants + the NULL-cell
// USING guards from the migration. `.select()` after update detects a write
// the DB refused (not admin / NULL cell / missing row) — zero rows = error,
// never a silent no-op.
//
// §7: nothing here touches orders. Edits flow to the storefront and FUTURE
// orders only; placed orders render their frozen snapshots.

export type CellTarget =
  | "gi_standard_price"
  | "gi_custom_base"
  | "gi_option"
  | "gi_hem"
  | "gi_high_waist"
  | "gi_embroidery"
  | "obi_price"
  | "obi_embroidery";

export type SaveResult = { ok: true } | { ok: false; error: string };

type Pk = Record<string, string | number>;

/** Non-negative integer JPY (0 is VALID — offered & free; distinct from NULL). */
function asMoney(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function str(v: string | number | undefined): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function num(v: string | number | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function oneOf<T extends string>(
  v: string | number | undefined,
  values: readonly T[],
): T | null {
  return typeof v === "string" && values.includes(v as T) ? (v as T) : null;
}

const E = Constants.public.Enums;

// The storefront catalog/configurator pages are SSG (1h revalidate) with prices
// embedded at render time; the engine reads the DB per calculation. Flushing
// the whole route cache makes the LIVE configurator price and the catalog pick
// up the change on the next request — no stale price is served for up to an
// hour. Price edits are rare; a full flush is cheap and simple.
function revalidateStore(): void {
  revalidatePath("/", "layout");
}

export async function updatePriceCell(
  target: CellTarget,
  pk: Pk,
  value: number,
): Promise<SaveResult> {
  const price = asMoney(value);
  if (price === null) {
    return { ok: false, error: "Price must be a non-negative integer (JPY)." };
  }

  const supabase = await createAuthClient();

  // Each branch: extract EXACT pk fields, validate, run a fully-typed update.
  // `updated` collects the rows the DB actually wrote.
  let updated: unknown[] | null = null;

  switch (target) {
    case "gi_standard_price": {
      const model_slug = str(pk.model_slug);
      const fit = oneOf(pk.fit, E.gi_size_chart);
      const size_code = str(pk.size_code);
      if (!model_slug || !fit || !size_code) break;
      const { data, error } = await supabase
        .from("gi_standard_prices")
        .update({ price })
        .match({ model_slug, fit, size_code })
        .select("price");
      if (error) return { ok: false, error: "Could not save." };
      updated = data;
      break;
    }
    case "gi_custom_base": {
      const band_code = str(pk.band_code);
      if (!band_code) break;
      const { data, error } = await supabase
        .from("gi_custom_base_prices")
        .update({ base_price: price })
        .match({ band_code })
        .select("base_price");
      if (error) return { ok: false, error: "Could not save." };
      updated = data;
      break;
    }
    case "gi_option": {
      const code = str(pk.code);
      if (!code) break;
      const { data, error } = await supabase
        .from("gi_options")
        .update({ price })
        .match({ code })
        .select("price");
      if (error) return { ok: false, error: "Could not save." };
      updated = data;
      break;
    }
    case "gi_hem": {
      const part = oneOf(pk.part, E.gi_part);
      const width_cm = num(pk.width_cm);
      const thickness = oneOf(pk.thickness, E.gi_hem_thickness);
      if (!part || width_cm === null || !thickness) break;
      const { data, error } = await supabase
        .from("gi_hem_prices")
        .update({ price })
        .match({ part, width_cm, thickness })
        .select("price");
      if (error) return { ok: false, error: "Could not save." };
      updated = data;
      break;
    }
    case "gi_high_waist": {
      const min_cm = num(pk.min_cm);
      const max_cm = num(pk.max_cm);
      if (min_cm === null || max_cm === null) break;
      const { data, error } = await supabase
        .from("gi_high_waist_prices")
        .update({ price })
        .match({ min_cm, max_cm })
        .select("price");
      if (error) return { ok: false, error: "Could not save." };
      updated = data;
      break;
    }
    case "gi_embroidery": {
      const thread = oneOf(pk.thread, E.gi_thread);
      if (!thread) break;
      const { data, error } = await supabase
        .from("gi_embroidery_prices")
        .update({ price_per_char: price })
        .match({ thread })
        .select("price_per_char");
      if (error) return { ok: false, error: "Could not save." };
      updated = data;
      break;
    }
    case "obi_price": {
      const color = oneOf(pk.color, E.obi_color);
      const material = oneOf(pk.material, E.obi_material);
      const width_cm = num(pk.width_cm);
      const size_code = num(pk.size_code);
      if (!color || !material || width_cm === null || size_code === null) break;
      const { data, error } = await supabase
        .from("obi_prices")
        .update({ price })
        .match({ color, material, width_cm, size_code })
        .select("price");
      if (error) return { ok: false, error: "Could not save." };
      updated = data;
      break;
    }
    case "obi_embroidery": {
      const width_cm = num(pk.width_cm);
      const thread = oneOf(pk.thread, E.gi_thread);
      if (width_cm === null || !thread) break;
      const { data, error } = await supabase
        .from("obi_embroidery_prices")
        .update({ price_per_char: price })
        .match({ width_cm, thread })
        .select("price_per_char");
      if (error) return { ok: false, error: "Could not save." };
      updated = data;
      break;
    }
  }

  if (updated === null) return { ok: false, error: "Invalid cell reference." };
  if (updated.length === 0) {
    // RLS refused (not admin, or a NULL "not offered" cell) or the row vanished.
    return { ok: false, error: "Not saved — cell is not editable." };
  }

  revalidateStore();
  return { ok: true };
}

/**
 * Pattern A copy save: the localized copy columns (name / description /
 * product_type) in BOTH languages, authored together regardless of the admin's
 * current locale. Each column is JSONB {en, ja}; we write only the non-empty
 * keys (an empty JA leaves the object EN-only, matching localize()'s fallback).
 * name.en is required (the column is NOT NULL and every catalog card needs a
 * fallback); description/product_type may be dropped to NULL entirely.
 * Price + stock are untouched here — a separate grant, a separate save.
 */
export type ProductCopyInput = {
  nameEn: string;
  nameJa: string;
  descEn: string;
  descJa: string;
  typeEn: string;
  typeJa: string;
};

/** Build a JSONB {en?, ja?} from a field pair, dropping blanks; null if empty. */
function localizedFrom(
  en: string,
  ja: string,
): { en?: string; ja?: string } | null {
  const out: { en?: string; ja?: string } = {};
  const e = en.trim();
  const j = ja.trim();
  if (e) out.en = e;
  if (j) out.ja = j;
  return out.en || out.ja ? out : null;
}

export async function updateProductCopy(
  productId: number,
  input: ProductCopyInput,
): Promise<SaveResult> {
  if (!Number.isInteger(productId)) {
    return { ok: false, error: "Invalid product." };
  }
  const name = localizedFrom(input.nameEn, input.nameJa);
  if (!name?.en) {
    return { ok: false, error: "Name (English) is required." };
  }
  const description = localizedFrom(input.descEn, input.descJa);
  const product_type = localizedFrom(input.typeEn, input.typeJa);

  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("products")
    .update({ name, description, product_type })
    .eq("id", productId)
    .select("id");

  if (error) return { ok: false, error: "Could not save." };
  if (!data || data.length === 0) {
    return { ok: false, error: "Not saved — product is not editable." };
  }

  revalidateStore();
  return { ok: true };
}

/** Pattern A row save: price + stock together. Everything else is immutable. */
export async function updateProduct(
  productId: number,
  priceValue: number,
  stockValue: number,
): Promise<SaveResult> {
  const price = asMoney(priceValue);
  const stock = asMoney(stockValue);
  if (price === null || stock === null) {
    return {
      ok: false,
      error: "Price and stock must be non-negative integers.",
    };
  }
  if (!Number.isInteger(productId)) {
    return { ok: false, error: "Invalid product." };
  }

  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("products")
    .update({ price, stock })
    .eq("id", productId)
    .select("id");

  if (error) return { ok: false, error: "Could not save." };
  if (!data || data.length === 0) {
    return { ok: false, error: "Not saved — product is not editable." };
  }

  revalidateStore();
  return { ok: true };
}
