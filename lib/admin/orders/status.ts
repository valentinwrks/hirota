import { Constants, type Database } from "@/lib/database.types";

// Status vocabulary shared by BOTH server and client code (queries, actions,
// filters, controls). Kept free of `server-only` imports so client components
// can use it. The enum arrays come straight from the generated types, so the
// three axes can never drift from the schema (§ adjustment 2).

type Enums = Database["public"]["Enums"];
export type PaymentStatus = Enums["order_payment_status"];
export type ProductionStatus = Enums["order_production_status"];
export type ShippingStatus = Enums["order_shipping_status"];

export const PAYMENT_STATUSES = Constants.public.Enums.order_payment_status;
export const PRODUCTION_STATUSES = Constants.public.Enums.order_production_status;
export const SHIPPING_STATUSES = Constants.public.Enums.order_shipping_status;

/** Narrow an arbitrary string (URL param / form value) to a valid enum value. */
export function asPayment(v?: string): PaymentStatus | undefined {
  return PAYMENT_STATUSES.includes(v as PaymentStatus)
    ? (v as PaymentStatus)
    : undefined;
}
export function asProduction(v?: string): ProductionStatus | undefined {
  return PRODUCTION_STATUSES.includes(v as ProductionStatus)
    ? (v as ProductionStatus)
    : undefined;
}
export function asShipping(v?: string): ShippingStatus | undefined {
  return SHIPPING_STATUSES.includes(v as ShippingStatus)
    ? (v as ShippingStatus)
    : undefined;
}
