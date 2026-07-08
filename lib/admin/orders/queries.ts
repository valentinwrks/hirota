import "server-only";

import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Database } from "@/lib/database.types";
import type {
  PaymentStatus,
  ProductionStatus,
  ShippingStatus,
} from "@/lib/admin/orders/status";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

export type OrderFilters = {
  payment?: PaymentStatus;
  production?: ProductionStatus;
  shipping?: ShippingStatus;
};

export type OrderListRow = OrderRow & { item_count: number };

/**
 * All orders, newest first, with an embedded line-item count. Filters combine as
 * AND — each present axis adds an .eq(). Runs on the SSR AUTH client, so the
 * is_admin() SELECT policy is what authorizes the read (not the secret key).
 */
export async function listOrders(
  filters: OrderFilters,
): Promise<OrderListRow[]> {
  const supabase = await createAuthClient();

  let query = supabase
    .from("orders")
    .select("*, order_items(count)")
    .order("created_at", { ascending: false });

  if (filters.payment) query = query.eq("payment_status", filters.payment);
  if (filters.production) query = query.eq("production_status", filters.production);
  if (filters.shipping) query = query.eq("shipping_status", filters.shipping);

  const { data, error } = await query;
  if (error) throw error;

  // PostgREST returns the embedded aggregate as order_items: [{ count }].
  return (data ?? []).map((row) => {
    const { order_items, ...order } = row as OrderRow & {
      order_items: { count: number }[];
    };
    return { ...order, item_count: order_items[0]?.count ?? 0 };
  });
}

export type OrderDetail = {
  order: OrderRow;
  items: OrderItemRow[];
};

/**
 * One order (by human order_number) plus its line items in insertion order.
 * Returns null when not found (or not visible under RLS). AUTH-client read.
 */
export async function getOrderByNumber(
  orderNumber: number,
): Promise<OrderDetail | null> {
  const supabase = await createAuthClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });
  if (itemsError) throw itemsError;

  return { order, items: items ?? [] };
}
