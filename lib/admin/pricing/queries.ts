import "server-only";

import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Database } from "@/lib/database.types";

// Reads for the five editor sections. Same tables the pricing engine reads
// (§10) — the editors have no price source of their own. Reads go through the
// admin's auth client so the whole admin data path is uniform (these tables are
// publicly readable anyway; RLS matters on the write side).

type Tables = Database["public"]["Tables"];
export type ProductRow = Tables["products"]["Row"];
export type ObiPriceRow = Tables["obi_prices"]["Row"];
export type ObiEmbroideryRow = Tables["obi_embroidery_prices"]["Row"];
export type GiStandardPriceRow = Tables["gi_standard_prices"]["Row"];
export type GiCustomBaseRow = Tables["gi_custom_base_prices"]["Row"];
export type GiOptionRow = Tables["gi_options"]["Row"];
export type GiHemRow = Tables["gi_hem_prices"]["Row"];
export type GiHighWaistRow = Tables["gi_high_waist_prices"]["Row"];
export type GiEmbroideryRow = Tables["gi_embroidery_prices"]["Row"];
export type GiModelRow = Tables["gi_models"]["Row"];

export async function listSimpleProducts(
  category: Database["public"]["Enums"]["product_category"],
): Promise<ProductRow[]> {
  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category", category)
    .order("id");
  if (error) throw error;
  return data ?? [];
}

export async function getObiTables(): Promise<{
  prices: ObiPriceRow[];
  embroidery: ObiEmbroideryRow[];
}> {
  const supabase = await createAuthClient();
  const [prices, embroidery] = await Promise.all([
    supabase.from("obi_prices").select("*"),
    supabase.from("obi_embroidery_prices").select("*"),
  ]);
  if (prices.error) throw prices.error;
  if (embroidery.error) throw embroidery.error;
  return { prices: prices.data ?? [], embroidery: embroidery.data ?? [] };
}

export async function getGiStandardTables(): Promise<{
  prices: GiStandardPriceRow[];
  models: GiModelRow[];
  adjustments: GiOptionRow[];
  embroidery: GiEmbroideryRow[];
}> {
  const supabase = await createAuthClient();
  const [prices, models, adjustments, embroidery] = await Promise.all([
    supabase.from("gi_standard_prices").select("*"),
    supabase.from("gi_models").select("*").order("sort_order"),
    // The two standard-only C/H shortenings live in gi_options.
    supabase
      .from("gi_options")
      .select("*")
      .in("code", ["adjust_sleeve_c", "adjust_pant_h"])
      .order("sort_order"),
    supabase.from("gi_embroidery_prices").select("*").order("thread"),
  ]);
  if (prices.error) throw prices.error;
  if (models.error) throw models.error;
  if (adjustments.error) throw adjustments.error;
  if (embroidery.error) throw embroidery.error;
  return {
    prices: prices.data ?? [],
    models: models.data ?? [],
    adjustments: adjustments.data ?? [],
    embroidery: embroidery.data ?? [],
  };
}

export async function getGiCustomTables(): Promise<{
  bands: GiCustomBaseRow[];
  options: GiOptionRow[];
  hems: GiHemRow[];
  highWaist: GiHighWaistRow[];
  embroidery: GiEmbroideryRow[];
}> {
  const supabase = await createAuthClient();
  const [bands, options, hems, highWaist, embroidery] = await Promise.all([
    supabase.from("gi_custom_base_prices").select("*").order("sort_order"),
    // Standard-only C/H shortenings display under Ready-made instead.
    supabase
      .from("gi_options")
      .select("*")
      .not("code", "in", '("adjust_sleeve_c","adjust_pant_h")')
      .order("sort_order"),
    supabase.from("gi_hem_prices").select("*"),
    supabase.from("gi_high_waist_prices").select("*").order("min_cm"),
    supabase.from("gi_embroidery_prices").select("*").order("thread"),
  ]);
  if (bands.error) throw bands.error;
  if (options.error) throw options.error;
  if (hems.error) throw hems.error;
  if (highWaist.error) throw highWaist.error;
  if (embroidery.error) throw embroidery.error;
  return {
    bands: bands.data ?? [],
    options: options.data ?? [],
    hems: hems.data ?? [],
    highWaist: highWaist.data ?? [],
    embroidery: embroidery.data ?? [],
  };
}
