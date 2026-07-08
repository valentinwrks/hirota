"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCheckout } from "@/lib/checkout/CheckoutProvider";
import { useCart } from "@/lib/cart/CartProvider";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import { CartItemCard } from "@/components/cart/CartItemCard";
import {
  submitCheckout,
  type CheckoutError,
  type CheckoutResult,
} from "@/lib/checkout/actions";

// Guest checkout sheet — a full-screen overlay (blurred dark scrim) over a white
// "paper" sheet evoking HIROTA's fax order forms. One scrollable column: a
// read-only order summary (the shared CartItemCard in readOnly mode), the buyer
// contact + shipping form, and a clearly-SIMULATED payment action. No card
// fields, no real payment (AGENTS §2). On success it swaps to a confirmation and
// clears the cart; on failure the cart stays intact and the buyer can retry.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = {
  name: string;
  email: string;
  phone: string;
  recipient: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  recipient: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  note: "",
};

export function CheckoutSheet() {
  const t = useTranslations("Checkout");
  const { isOpen, close } = useCheckout();
  const { items, subtotalJpy, clear } = useCart();
  const { format, currency, rate } = useCurrency();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [confirmedNumber, setConfirmedNumber] = useState<number | null>(null);

  // Close on Escape (unless mid-submit).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, submitting]);

  if (!isOpen) return null;

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleClose() {
    close();
    // Reset transient state so a later reopen starts fresh (after a successful
    // order the cart is already cleared, so the trigger button is gone anyway).
    setError(null);
    setConfirmedNumber(null);
    setSubmitting(false);
  }

  const emailValid = EMAIL_RE.test(form.email.trim());
  const isValid =
    form.name.trim().length > 0 &&
    emailValid &&
    form.recipient.trim().length > 0 &&
    form.line1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.postalCode.trim().length > 0 &&
    form.country.trim().length > 0;

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    const result: CheckoutResult = await submitCheckout({
      items,
      contact: { name: form.name, email: form.email, phone: form.phone || undefined },
      shipping: {
        recipient: form.recipient,
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        state: form.state || undefined,
        postalCode: form.postalCode,
        country: form.country,
      },
      note: form.note || undefined,
      displayCurrency: currency,
      // Persist the exact rate the buyer was shown when viewing USD (§6).
      fxRate: currency === "USD" ? rate : null,
    });

    if (result.ok) {
      // Show confirmation from the returned number, THEN clear the cart (the
      // confirmation view no longer depends on cart items).
      setConfirmedNumber(result.orderNumber);
      clear();
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  }

  const confirmed = confirmedNumber !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto scrollbar-none"
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      {/* Blurred, darkened scrim — click to close. */}
      <button
        type="button"
        aria-label={t("close")}
        onClick={handleClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm cursor-default"
      />

      {/* White paper sheet. */}
      <div className="relative w-full max-w-lg my-8 mx-4 bg-paper border border-line text-xs leading-tight">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-3 h-[26px] border-b border-line bg-paper text-sm">
          <span>{t("title")}</span>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("close")}
            className="text-ink-40 hover:text-ink-70 cursor-pointer leading-none"
          >
            ✕
          </button>
        </div>

        {confirmed ? (
          <Confirmation
            number={confirmedNumber!}
            onContinue={handleClose}
            t={t}
          />
        ) : (
          <div className="p-3 space-y-4">
            {/* ---- Order summary (read-only) ---- */}
            <section>
              <h3 className="text-ink-40 uppercase tracking-wide mb-1.5">
                {t("summary")}
              </h3>
              <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2.5 -mt-2.5 -mb-2.5">
                <tbody>
                  {items.map((item) => (
                    <CartItemCard key={item.lineId} item={item} readOnly />
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between pt-2.5 mt-2.5 border-t border-line-soft">
                <span className="text-base font-bold">{t("total")}</span>
                <span className="text-base font-bold">{format(subtotalJpy)}</span>
              </div>
            </section>

            {/* ---- Contact ---- */}
            <section className="space-y-2">
              <h3 className="text-ink-40 uppercase tracking-wide">
                {t("contactHeading")}
              </h3>
              <Field
                label={t("name")}
                required
                value={form.name}
                onChange={(v) => set("name", v)}
                autoComplete="name"
              />
              <Field
                label={t("email")}
                required
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
                autoComplete="email"
                hint={
                  form.email.length > 0 && !emailValid
                    ? t("invalidEmail")
                    : undefined
                }
              />
              <Field
                label={t("phone")}
                value={form.phone}
                onChange={(v) => set("phone", v)}
                autoComplete="tel"
              />
            </section>

            {/* ---- Shipping ---- */}
            <section className="space-y-2">
              <h3 className="text-ink-40 uppercase tracking-wide">
                {t("shippingHeading")}
              </h3>
              <Field
                label={t("recipient")}
                required
                value={form.recipient}
                onChange={(v) => set("recipient", v)}
                autoComplete="name"
              />
              <Field
                label={t("line1")}
                required
                value={form.line1}
                onChange={(v) => set("line1", v)}
                autoComplete="address-line1"
              />
              <Field
                label={t("line2")}
                value={form.line2}
                onChange={(v) => set("line2", v)}
                autoComplete="address-line2"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field
                    label={t("city")}
                    required
                    value={form.city}
                    onChange={(v) => set("city", v)}
                    autoComplete="address-level2"
                  />
                </div>
                <div className="flex-1">
                  <Field
                    label={t("state")}
                    value={form.state}
                    onChange={(v) => set("state", v)}
                    autoComplete="address-level1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field
                    label={t("postalCode")}
                    required
                    value={form.postalCode}
                    onChange={(v) => set("postalCode", v)}
                    autoComplete="postal-code"
                  />
                </div>
                <div className="flex-1">
                  <Field
                    label={t("country")}
                    required
                    value={form.country}
                    onChange={(v) => set("country", v)}
                    autoComplete="country-name"
                  />
                </div>
              </div>
              <Field
                label={t("note")}
                value={form.note}
                onChange={(v) => set("note", v)}
                placeholder={t("notePlaceholder")}
              />
            </section>

            {/* ---- Simulated payment ---- */}
            <section className="space-y-2">
              <h3 className="text-ink-40 uppercase tracking-wide">
                {t("paymentHeading")}
              </h3>
              <p className="text-[11px] italic text-ink-40 border border-line-soft bg-ink-04 px-2 py-1.5">
                {t("simulationNotice")}
              </p>

              {error && (
                <p className="text-[11px] text-ink-70 border border-line px-2 py-1.5">
                  {t(errorKey(error))}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                className={
                  "w-full text-xs font-bold bg-transparent border tracking-wide py-1.5 " +
                  (isValid && !submitting
                    ? "text-ink-50 border-line hover:bg-ink-10 cursor-pointer"
                    : "text-ink-25 border-line-soft cursor-default")
                }
              >
                {submitting ? t("processing") : t("pay")}
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/** Map a server error code to its message key. */
function errorKey(error: CheckoutError): string {
  switch (error) {
    case "empty":
      return "errorEmpty";
    case "invalid_input":
      return "errorInvalidInput";
    case "invalid_config":
      return "errorInvalidConfig";
    case "insufficient_stock":
      return "errorInsufficientStock";
    default:
      return "errorGeneric";
  }
}

function Confirmation({
  number,
  onContinue,
  t,
}: {
  number: number;
  onContinue: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-base font-bold">{t("confirmTitle")}</h3>
      <p>{t("confirmBody", { number })}</p>
      <p className="text-[11px] italic text-ink-40 border border-line-soft bg-ink-04 px-2 py-1.5">
        {t("emailStub")}
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="w-full text-xs font-bold bg-transparent text-ink-50 border border-line tracking-wide py-1.5 hover:bg-ink-10 cursor-pointer"
      >
        {t("continue")}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  autoComplete,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
}) {
  const t = useTranslations("Checkout");
  return (
    <label className="block">
      <span className="flex items-baseline gap-1.5 mb-0.5">
        <span className="text-ink-50">{label}</span>
        {required && <span className="text-[10px] text-ink-35">{t("required")}</span>}
        {hint && <span className="text-[10px] italic text-ink-40">{hint}</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-line bg-paper px-2 py-1 text-xs outline-none focus:border-ink-50"
      />
    </label>
  );
}
