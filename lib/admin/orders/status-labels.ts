import type {
  PaymentStatus,
  ProductionStatus,
  ShippingStatus,
} from "@/lib/admin/orders/status";

// English labels for the three status axes. Order statuses are admin-only
// concepts (not part of the store's localized catalog), and the admin is
// English-only by decision — so these live here, hardcoded, as the single
// source of truth shared by the list, badges, and status controls.

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const PRODUCTION_LABELS: Record<ProductionStatus, string> = {
  pending: "Pending",
  in_production: "In production",
  ready: "Ready",
};

export const SHIPPING_LABELS: Record<ShippingStatus, string> = {
  pending: "Not shipped",
  shipped: "Shipped",
  delivered: "Delivered",
};

export const AXIS_LABELS = {
  payment: "Payment",
  production: "Production",
  shipping: "Shipping",
} as const;

// "Done-ness" of a value on its axis, for subtle visual emphasis. terminal =
// the axis is complete (paid / ready / delivered); active = in progress;
// idle = nothing done yet (or cancelled, which reads as inert).
export type StatusTone = "idle" | "active" | "terminal";

export const PAYMENT_TONE: Record<PaymentStatus, StatusTone> = {
  pending: "idle",
  paid: "terminal",
  cancelled: "idle",
};
export const PRODUCTION_TONE: Record<ProductionStatus, StatusTone> = {
  pending: "idle",
  in_production: "active",
  ready: "terminal",
};
export const SHIPPING_TONE: Record<ShippingStatus, StatusTone> = {
  pending: "idle",
  shipped: "active",
  delivered: "terminal",
};
