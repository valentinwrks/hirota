import { createPublicClient } from "../supabase/server";
import type { ProductCategory, ProductRow } from "./types";

// Read helpers for simple (Pattern A) products. These run in Server Components
// against the publishable-key client; RLS enforces read-only public access.

/**
 * All simple products, optionally filtered to a single category
 * (`equipment` | `accessories`). Ordered by id for a stable grid.
 */
export async function getSimpleProducts(
  category?: ProductCategory,
): Promise<ProductRow[]> {
  const supabase = createPublicClient();
  let query = supabase.from("products").select("*").order("id");
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw new Error(`failed to load products: ${error.message}`);
  return data ?? [];
}

/** A single simple product by its unique slug, or null if not found. */
export async function getProductBySlug(
  slug: string,
): Promise<ProductRow | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`failed to load product ${slug}: ${error.message}`);
  return data ?? null;
}
