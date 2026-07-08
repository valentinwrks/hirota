import type { Json } from "@/lib/database.types";
import type { LocalizedText } from "@/lib/i18n/localized";
import type {
  ConfiguredSnapshot,
  GiCustomConfiguredSnapshot,
  GiStandardConfiguredSnapshot,
  ObiConfiguredSnapshot,
} from "@/lib/cart/types";
import type { PriceBreakdown } from "@/lib/pricing/types";

// Typed view of the frozen `order_items.config` JSONB. This mirrors EXACTLY
// what the checkout action's snapshotFor() wrote (§7): a discriminated union on
// `kind`. The detail screen is pure presentation of this frozen data — nothing
// here is recomputed (character counts, prices, everything comes straight from
// the snapshot / breakdown that the engine produced at purchase time).

/** Simple (Pattern A) snapshot: fixed-price product + chosen cosmetic variant. */
export type SimpleSnapshot = {
  kind: "simple";
  productId: number;
  slug: string;
  name: LocalizedText;
  size: string | null;
  color: string | null;
  breakdown: PriceBreakdown;
};

// Configured snapshots reuse the cart's ConfiguredSnapshot shape verbatim — the
// stored object is `{ ...item.config, breakdown }`, and item.config already IS a
// ConfiguredSnapshot (config + summary + breakdown).
export type OrderItemSnapshot = SimpleSnapshot | ConfiguredSnapshot;

export type {
  ObiConfiguredSnapshot,
  GiStandardConfiguredSnapshot,
  GiCustomConfiguredSnapshot,
};

/**
 * Narrow the raw JSONB to the typed snapshot union. We validate only the
 * discriminant (`kind`); the rest of the shape is guaranteed by the write path
 * (snapshotFor). Returns null for anything unrecognised so a malformed row
 * degrades gracefully instead of throwing in a Server Component.
 */
export function parseSnapshot(config: Json): OrderItemSnapshot | null {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return null;
  }
  const kind = (config as { kind?: unknown }).kind;
  if (
    kind === "simple" ||
    kind === "obi" ||
    kind === "gi_standard" ||
    kind === "gi_custom"
  ) {
    return config as unknown as OrderItemSnapshot;
  }
  return null;
}
