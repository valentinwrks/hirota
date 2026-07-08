"use server";

import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Database } from "@/lib/database.types";
import {
  asPayment,
  asProduction,
  asShipping,
} from "@/lib/admin/orders/status";

type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

export type StatusAxis = "payment" | "production" | "shipping";

export type UpdateStatusResult = { ok: true } | { ok: false; error: string };

/**
 * Build the (validated) partial update for one axis. Returns null for an
 * unknown axis / invalid value. Each branch produces a concretely-typed,
 * single-column patch — the ONLY columns the admin may write (§7); the
 * column-level GRANT + is_admin() UPDATE policy back-stop this server-side.
 */
function patchFor(axis: StatusAxis, value: string): OrderUpdate | null {
  switch (axis) {
    case "payment": {
      const v = asPayment(value);
      return v ? { payment_status: v } : null;
    }
    case "production": {
      const v = asProduction(value);
      return v ? { production_status: v } : null;
    }
    case "shipping": {
      const v = asShipping(value);
      return v ? { shipping_status: v } : null;
    }
    default:
      return null;
  }
}

/**
 * Advance one status axis on an order. Runs on the SSR AUTH client, so the
 * is_admin() UPDATE policy + column grant enforce that only the admin, and only
 * these columns, can change. Revalidates the list + detail so the change shows
 * immediately.
 */
export async function updateOrderStatus(
  locale: string,
  orderNumber: number,
  axis: StatusAxis,
  value: string,
): Promise<UpdateStatusResult> {
  const patch = patchFor(axis, value);
  if (!patch) return { ok: false, error: "Invalid status value." };

  const supabase = await createAuthClient();
  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("order_number", orderNumber);

  if (error) return { ok: false, error: "Could not update status." };

  revalidatePath(`/${locale}/admin/orders`);
  revalidatePath(`/${locale}/admin/orders/${orderNumber}`);
  return { ok: true };
}
