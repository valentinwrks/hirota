"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { loadPricingData } from "@/lib/pricing/load-data";
import { priceLineItem, PricingError } from "@/lib/pricing/engine";
import type { CartItem } from "@/lib/cart/types";
import type {
  LineItemConfig,
  PriceBreakdown,
  SimpleConfig,
} from "@/lib/pricing/types";
import type { Currency } from "@/lib/currency/format";
import type { Json } from "@/lib/database.types";

// The checkout server action — the FIRST place the pricing engine runs on the
// server (AGENTS §6). The client submits each line's CONFIGURATION, never its
// price; we re-run the pure engine over FRESH DB data, and the server-computed
// breakdown is what gets frozen into every order_items snapshot. The client's
// own totals are ignored entirely.

export type CheckoutContact = {
  name: string;
  email: string;
  phone?: string;
};

export type CheckoutShipping = {
  recipient: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
};

export type CheckoutInput = {
  items: CartItem[];
  contact: CheckoutContact;
  shipping: CheckoutShipping;
  note?: string;
  // What the buyer SAW, persisted faithfully (§6). The price itself is
  // JPY-authoritative and server-computed, so these are a record, not trusted money.
  displayCurrency: Currency;
  fxRate: number | null; // USD per 1 JPY the buyer was shown; null when JPY.
};

export type CheckoutError =
  | "empty" // nothing in the cart
  | "invalid_input" // missing/bad contact or shipping
  | "invalid_config" // a line's config no longer prices (data changed / tampered)
  | "insufficient_stock" // a simple item ran out at commit time
  | "server_error"; // unexpected DB/engine failure

export type CheckoutResult =
  | { ok: true; orderNumber: number }
  | { ok: false; error: CheckoutError };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimal server-side validation of the buyer form (the UI validates too, this
 *  is defense — never trust the client). */
function validInput(input: CheckoutInput): boolean {
  const c = input.contact;
  const s = input.shipping;
  const nonEmpty = (v: string | undefined) => typeof v === "string" && v.trim().length > 0;
  return (
    nonEmpty(c?.name) &&
    nonEmpty(c?.email) &&
    EMAIL_RE.test(c.email) &&
    nonEmpty(s?.recipient) &&
    nonEmpty(s?.line1) &&
    nonEmpty(s?.city) &&
    nonEmpty(s?.postalCode) &&
    nonEmpty(s?.country)
  );
}

/** Derive the pure-engine LineItemConfig for a cart line. For configured items
 *  the stored `config.config` IS the engine input (ObiConfig / GiStandardConfig /
 *  GiCustomConfig); we only re-stamp the quantity from the cart line. For simple
 *  items we rebuild a SimpleConfig from the id + chosen variant + qty. Prices are
 *  never read from the client line. */
function toEngineConfig(item: CartItem): LineItemConfig {
  if (item.kind === "simple") {
    const cfg: SimpleConfig = {
      kind: "simple",
      productId: item.productId,
      quantity: item.quantity,
    };
    if (item.size) cfg.size = item.size;
    if (item.color) cfg.color = item.color;
    return cfg;
  }
  return { ...item.config.config, quantity: item.quantity };
}

/** A readable snapshot label for quick admin display. */
function titleFor(item: CartItem): string {
  const n = item.name as { en?: string; ja?: string } | null;
  return n?.en ?? n?.ja ?? `Item ${item.productId}`;
}

/** Build the frozen order_items snapshot for a line, embedding the SERVER-computed
 *  breakdown (§7 — store the complete resolved config, not references). */
function snapshotFor(item: CartItem, breakdown: PriceBreakdown) {
  if (item.kind === "simple") {
    return {
      kind: "simple",
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      size: item.size ?? null,
      color: item.color ?? null,
      breakdown,
    };
  }
  // Configured: keep the full engine input + display summary, but swap the
  // client breakdown for the authoritative server one.
  return { ...item.config, breakdown };
}

export async function submitCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  if (!input.items || input.items.length === 0) return { ok: false, error: "empty" };
  if (!validInput(input)) return { ok: false, error: "invalid_input" };

  const supabase = createAdminClient();

  // FRESH reference/pricing data (the load-data pattern). Never the client's.
  let data;
  try {
    data = await loadPricingData(supabase);
  } catch {
    return { ok: false, error: "server_error" };
  }

  // Re-price every line with the pure engine. A line whose config no longer
  // prices (a now-invalid obi combo, a tampered custom config) fails the whole
  // checkout cleanly — we never insert a broken order.
  const itemsPayload: Array<Record<string, unknown>> = [];
  let totalJpy = 0;

  for (const item of input.items) {
    let breakdown: PriceBreakdown;
    try {
      breakdown = priceLineItem(toEngineConfig(item), data);
    } catch (e) {
      if (e instanceof PricingError) return { ok: false, error: "invalid_config" };
      return { ok: false, error: "server_error" };
    }

    // Quote-only lines (custom gi above size 8) must never reach checkout; the
    // cart guard rejects them, but treat as invalid defensively.
    if (breakdown.quote || breakdown.unitSubtotalJpy == null || breakdown.totalJpy == null) {
      return { ok: false, error: "invalid_config" };
    }

    const kind = item.kind === "simple" ? "simple" : item.config.kind;
    itemsPayload.push({
      kind,
      title: titleFor(item),
      quantity: item.quantity,
      unit_price_jpy: breakdown.unitSubtotalJpy,
      line_total_jpy: breakdown.totalJpy,
      config: snapshotFor(item, breakdown),
      // Only simple items decrement stock; product_id drives that guard in the RPC.
      product_id: item.kind === "simple" ? item.productId : null,
    });
    totalJpy += breakdown.totalJpy;
  }

  const orderPayload = {
    customer_name: input.contact.name.trim(),
    customer_email: input.contact.email.trim(),
    customer_phone: input.contact.phone?.trim() || null,
    shipping_address: {
      recipient: input.shipping.recipient.trim(),
      line1: input.shipping.line1.trim(),
      line2: input.shipping.line2?.trim() || null,
      city: input.shipping.city.trim(),
      state: input.shipping.state?.trim() || null,
      postal_code: input.shipping.postalCode.trim(),
      country: input.shipping.country.trim(),
    },
    customer_note: input.note?.trim() || null,
    // Three INDEPENDENT status axes (§8.6). Payment is a simulated success;
    // production + shipping start pending.
    payment_status: "paid",
    production_status: "pending",
    shipping_status: "pending",
    total_jpy: totalJpy, // server-computed sum; the client total is never trusted.
    display_currency: input.displayCurrency,
    fx_rate_usd_jpy: input.displayCurrency === "USD" ? input.fxRate : null,
  };

  // ONE atomic transaction: insert order + items + guarded stock decrement.
  // The payloads are JSON-serializable at runtime; cast to Json at the JSONB
  // boundary (TS can't verify nested config/breakdown objects are Json).
  const { data: rows, error } = await supabase.rpc("create_order", {
    order_data: orderPayload as unknown as Json,
    items_data: itemsPayload as unknown as Json,
  });

  if (error) {
    if (error.message?.includes("insufficient_stock")) {
      return { ok: false, error: "insufficient_stock" };
    }
    return { ok: false, error: "server_error" };
  }

  const row = Array.isArray(rows) ? rows[0] : rows;
  const orderNumber = row?.order_number;
  if (typeof orderNumber !== "number") return { ok: false, error: "server_error" };

  return { ok: true, orderNumber };
}
