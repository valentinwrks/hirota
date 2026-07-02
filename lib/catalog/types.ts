import type { Database } from "../database.types";

// The raw DB row for a simple (Pattern A) product.
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];

export type ProductCategory =
  Database["public"]["Enums"]["product_category"];

// The top-level nav categories. The two `karate-gi-*` lines and `obi` are
// configurator lines (no simple products); only `equipment` and `accessories`
// have a functional product grid. karate-gi is split into the fully-tailored
// (custom, Pattern C) and ready-made (standard, Pattern B1) configurators.
export const NAV_CATEGORIES = [
  "karate-gi-custom",
  "karate-gi-standard",
  "obi",
  "equipment",
  "accessories",
] as const;
export type NavCategory = (typeof NAV_CATEGORIES)[number];

/** The nav categories that map to simple products in the `products` table. */
export const SIMPLE_CATEGORIES: ProductCategory[] = ["equipment", "accessories"];

export function isNavCategory(value: string): value is NavCategory {
  return (NAV_CATEGORIES as readonly string[]).includes(value);
}

export function isSimpleCategory(value: NavCategory): value is ProductCategory {
  return value === "equipment" || value === "accessories";
}

// Cosmetic variant options parsed from the `options` JSONB. Size and color are
// display-only; per AGENTS §8.1 they never change price.
export type ProductOptions = { size?: string[]; color?: string[] };

export function parseOptions(options: unknown): ProductOptions {
  if (!options || typeof options !== "object") return {};
  const o = options as Record<string, unknown>;
  const asStrings = (v: unknown): string[] | undefined =>
    Array.isArray(v) && v.every((x) => typeof x === "string")
      ? (v as string[])
      : undefined;
  return { size: asStrings(o.size), color: asStrings(o.color) };
}

/** Public path to a product image. Files live at public/products/product-<id>.jpg. */
export function productImage(id: number): string {
  return `/products/product-${id}.jpg`;
}
