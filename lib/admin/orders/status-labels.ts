import type {
  PaymentStatus,
  ProductionStatus,
  ShippingStatus,
} from "@/lib/admin/orders/status";

// Labels for the three status axes now live in i18n (the Admin.status / Admin.axis
// namespaces, EN/JA) and are resolved at each call site with useTranslations /
// getTranslations. This module keeps only the language-agnostic VISUAL tone of
// each value, shared by the list, badges, and status controls.

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
