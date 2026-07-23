"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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

// Duration of each animation stage (blur fade, sheet slide). Keep in sync with
// the `duration-500` transition classes below.
const ANIM_MS = 500;

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
  // Section headings render at weight 400 in English (sentence case reads better
  // light) but keep 700 in Japanese, where the CJK glyphs need the extra weight.
  const headingWeight = useLocale() === "ja" ? "font-bold" : "font-normal";
  const { isOpen, close } = useCheckout();
  const { items, subtotalJpy, clear } = useCart();
  const { format, currency, rate } = useCurrency();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [confirmedNumber, setConfirmedNumber] = useState<number | null>(null);

  // Enter/exit animation, sequenced in two stages so the scrim and the sheet
  // never move at the same time:
  //   open  → mount → blur fades in → (blur done) sheet slides up
  //   close → sheet slides down → (sheet gone) blur fades out → unmount
  // `mounted` keeps the node in the DOM through the exit; `scrimShown` drives
  // the blur/opacity; `sheetShown` drives the slide. Double-rAF on open lets
  // the browser paint the off-screen state before we transition from it.
  const [mounted, setMounted] = useState(false);
  const [scrimShown, setScrimShown] = useState(false);
  const [sheetShown, setSheetShown] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf1 = 0;
    let raf2 = 0;
    if (isOpen) {
      setMounted(true);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setScrimShown(true); // stage 1: blur fades in
          timers.push(setTimeout(() => setSheetShown(true), ANIM_MS)); // stage 2
        });
      });
    } else {
      setSheetShown(false); // stage 1: sheet slides down
      timers.push(setTimeout(() => setScrimShown(false), ANIM_MS)); // stage 2
      timers.push(setTimeout(() => setMounted(false), ANIM_MS * 2)); // unmount
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      timers.forEach(clearTimeout);
    };
  }, [isOpen]);

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

  if (!mounted) return null;

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
        className={
          "fixed inset-0 bg-black/[12.5%] backdrop-blur-sm cursor-default transition-opacity duration-500 ease-in-out " +
          (scrimShown ? "opacity-100" : "opacity-0")
        }
      />

      {/* White paper sheet — edge-to-edge below md, floating card on md+. Slides
          up into place on open. */}
      <div
        className={
          "relative w-full max-w-2xl my-8 mx-4 max-md:my-0 max-md:mx-0 max-md:min-h-dvh bg-background text-xs leading-tight shadow-[10px_10px_6px_0_rgb(0_0_0_/_0.2)] transition-transform duration-500 ease-in-out motion-reduce:transition-none " +
          (sheetShown ? "translate-y-0" : "translate-y-full")
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 max-md:px-2 h-[36px] bg-background text-foreground text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hirota/logo-footer.svg"
            alt="HIROTA"
            className="h-[27.5px] w-auto object-contain object-center opacity-80"
          />
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("close")}
            className="md:hidden absolute top-2 right-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-foreground hover:bg-foreground-selected text-background text-[13px] cursor-pointer leading-none font-normal"
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
          <div className="p-3 pt-2 max-md:px-2 space-y-4">
            {/* ---- Order summary (read-only) ---- */}
            <section>
              <h3 className={`text-base ${headingWeight} mb-1.5`}>
                {t("summary")}
              </h3>
              <table className="w-full border-separate border-spacing-0 [&_tr:first-child_td]:border-t [&_tr:first-child_td]:border-border-blocked [&_tr:last-child_td]:border-b-0">
                <tbody>
                  {items.map((item) => (
                    <CartItemCard key={item.lineId} item={item} readOnly />
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end gap-[30px] px-1.5 pt-1 mt-[5px] border-t border-border">
                <span className="text-sm font-bold">{t("total")}</span>
                <span className="text-sm font-bold">{format(subtotalJpy)}</span>
              </div>
            </section>

            {/* ---- Contact ---- */}
            <section className="space-y-2">
              <h3 className={`text-base ${headingWeight}`}>
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
              <h3 className={`text-base ${headingWeight}`}>
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
              <h3 className={`text-base ${headingWeight}`}>
                {t("paymentHeading")}
              </h3>
              <p className="text-[11px] text-foreground-muted border border-border-blocked bg-foreground-hover-subtle px-2 py-1.5">
                {t("simulationNotice")}
              </p>

              {error && (
                <p className="text-[11px] text-foreground border border-border px-2 py-1.5">
                  {t(errorKey(error))}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                className={
                  "w-full text-xs font-bold uppercase bg-transparent border tracking-wide py-1.5 " +
                  (isValid && !submitting
                    ? "text-foreground border-border hover:bg-foreground-hover cursor-pointer"
                    : "text-foreground-blocked border-border-blocked cursor-default")
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
    <div className="p-4 max-md:px-2 space-y-3">
      <h3 className="text-base font-bold">{t("confirmTitle")}</h3>
      <p>{t("confirmBody", { number })}</p>
      <p className="text-[11px] italic text-foreground-muted border border-border-blocked bg-foreground-hover-subtle px-2 py-1.5">
        {t("emailStub")}
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="w-full text-xs font-bold bg-transparent text-foreground border border-border tracking-wide py-1.5 hover:bg-foreground-hover cursor-pointer"
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
      <div className="flex items-center gap-1.5 border border-border-pending bg-black/[2%] px-2 py-1">
        <span className="whitespace-nowrap">
          {label}
          <span className="ml-1.5 text-[10px] text-foreground-muted">
            {required ? t("required") : t("optional")}
          </span>
        </span>
        <input
          type={type}
          value={value}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="checkout-input min-w-0 flex-1 text-right bg-transparent focus:outline-none"
        />
      </div>
      {hint && (
        <span className="mt-0.5 block text-[10px] italic text-foreground-muted">
          {hint}
        </span>
      )}
    </label>
  );
}
