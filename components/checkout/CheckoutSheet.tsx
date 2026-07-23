"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCheckout } from "@/lib/checkout/CheckoutProvider";
import { useCart } from "@/lib/cart/CartProvider";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import { CartItemCard } from "@/components/cart/CartItemCard";
import { CommitButton } from "@/components/ui/CommitButton";
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

  // Enter/exit + swap animation. The sheet slides between three vertical
  // positions ("below" / "center" / "above"); `scrimShown` fades the blur:
  //   open    → mount → blur fades in → (blur done) sheet rises below→center
  //   close   → sheet drops center→below → blur fades out → unmount
  //   confirm → form rises center→above → (gone) swap content, jump to below
  //             without animating → confirmation rises below→center
  // `animateSheet` is toggled off for the instant below-jump so the browser
  // doesn't tween the off-screen reposition. Double-rAF lets it paint the
  // off-screen state before we transition from it.
  const [mounted, setMounted] = useState(false);
  const [scrimShown, setScrimShown] = useState(false);
  const [pos, setPos] = useState<"below" | "center" | "above">("below");
  const [animateSheet, setAnimateSheet] = useState(true);
  const [view, setView] = useState<"form" | "confirm">("form");
  // Timers/rAF driving the confirm swap, tracked so a mid-swap close can cancel
  // them (otherwise a stray setPos would fight the close animation).
  const swapRef = useRef<{
    timers: ReturnType<typeof setTimeout>[];
    rafs: number[];
  }>({ timers: [], rafs: [] });

  function clearSwap() {
    swapRef.current.timers.forEach(clearTimeout);
    swapRef.current.rafs.forEach(cancelAnimationFrame);
    swapRef.current = { timers: [], rafs: [] };
  }

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf1 = 0;
    let raf2 = 0;
    if (isOpen) {
      setMounted(true);
      setView("form");
      setAnimateSheet(true);
      setPos("below");
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setScrimShown(true); // stage 1: blur fades in
          timers.push(setTimeout(() => setPos("center"), ANIM_MS)); // stage 2
        });
      });
    } else {
      clearSwap();
      setAnimateSheet(true);
      // The form drops back down; the confirmation continues upward (it already
      // arrived by rising, so it exits the same way it would keep going).
      setPos(view === "confirm" ? "above" : "below"); // stage 1: sheet slides out
      timers.push(setTimeout(() => setScrimShown(false), ANIM_MS)); // stage 2
      timers.push(
        setTimeout(() => {
          setMounted(false);
          // Reset for a fresh reopen (the confirmation content stays visible
          // through the drop, so we only clear it once fully off-screen).
          setView("form");
          setConfirmedNumber(null);
          setError(null);
          setSubmitting(false);
        }, ANIM_MS * 2),
      );
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      timers.forEach(clearTimeout);
    };
    // Runs only on open/close. `view` is read for the exit direction but must
    // NOT be a dep: it flips during the swap while isOpen stays true, and a
    // re-run would reset the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Cancel any in-flight confirm swap, then close(); the effect drives the
    // drop-out and resets transient state once the sheet is off-screen.
    clearSwap();
    close();
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
      setConfirmedNumber(result.orderNumber);
      // Slide the checkout form UP and out, then bring the confirmation in from
      // BELOW (mirrors the open animation, but as a swap). The cart is cleared
      // and the content swapped only once the form is off-screen, so the rising
      // form never flashes an emptied summary.
      setPos("above");
      const t1 = setTimeout(() => {
        clear();
        setView("confirm");
        setAnimateSheet(false); // jump below without tweening
        setPos("below");
        const r1 = requestAnimationFrame(() => {
          const r2 = requestAnimationFrame(() => {
            setAnimateSheet(true);
            setPos("center"); // confirmation rises into place
          });
          swapRef.current.rafs.push(r2);
        });
        swapRef.current.rafs.push(r1);
      }, ANIM_MS);
      swapRef.current.timers.push(t1);
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  }

  // Off-screen positions translate by the VIEWPORT height (100dvh), not the
  // sheet's own height: a sheet shorter than the viewport would only move by its
  // own height with translate-y-full and stay partly visible. 100dvh guarantees
  // it starts/ends fully off-screen at any sheet size or screen size.
  const posClass =
    pos === "center"
      ? "translate-y-0"
      : pos === "above"
        ? "-translate-y-[100dvh]"
        : "translate-y-[100dvh]";

  return (
    <div
      className={
        // The tall form scrolls from the top; the short confirmation sits
        // centered in the viewport.
        "fixed inset-0 z-50 flex justify-center overflow-y-auto scrollbar-none " +
        (view === "confirm" ? "items-center" : "items-start")
      }
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
          between below/center/above for open, close and the confirm swap. */}
      <div
        className={
          "relative w-full max-w-2xl my-8 mx-4 max-md:my-0 max-md:mx-0 max-md:min-h-dvh flex flex-col bg-background text-xs leading-tight shadow-[10px_10px_6px_0_rgb(0_0_0_/_0.2)] motion-reduce:transition-none " +
          // On desktop the form fills to 32px from the bottom (my-8 = 4rem
          // top+bottom) so a short order isn't stranded at the top; the flexible
          // gap below absorbs the slack. The confirmation stays its natural size.
          (view === "form" ? "md:min-h-[calc(100dvh_-_4rem)] " : "") +
          (animateSheet ? "transition-transform duration-500 ease-in-out " : "") +
          posClass
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

        {view === "confirm" ? (
          <Confirmation
            number={confirmedNumber!}
            onContinue={handleClose}
            t={t}
            headingWeight={headingWeight}
          />
        ) : (
          <div className="p-3 pt-2 max-md:px-2 flex-1 flex flex-col">
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

            {/* Gap between the summary and the contact block: 16px normally, but
                on desktop it grows (md:flex-1) so a short sheet reaches the
                bottom margin instead of leaving the slack down there. */}
            <div aria-hidden className="min-h-4 md:flex-1" />

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
            <section className="space-y-2 mt-4">
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
            <section className="space-y-2 mt-4">
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

              <CommitButton
                onCommit={handleSubmit}
                disabled={!isValid || submitting}
                className={
                  "w-full text-xs font-bold uppercase bg-transparent border tracking-wide py-1.5 " +
                  (isValid && !submitting
                    ? "text-foreground border-border btn-swipe cursor-pointer"
                    : "text-foreground-blocked border-border-blocked cursor-default")
                }
              >
                {submitting ? t("processing") : t("pay")}
              </CommitButton>
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
  headingWeight,
}: {
  number: number;
  onContinue: () => void;
  t: ReturnType<typeof useTranslations>;
  headingWeight: string;
}) {
  return (
    <div className="p-4 pt-2 max-md:px-2">
      {/* Title matches the form sheet's section headings. */}
      <h3 className={`text-base ${headingWeight}`}>{t("confirmTitle")}</h3>
      <p className="mt-1.5">{t("confirmBody", { number })}</p>
      {/* Second plain line, same styling; 48px gap before the note. */}
      <p className="mt-1.5 mb-12">{t("confirmUpdates")}</p>
      {/* Same treatment as the form's simulation notice. */}
      <p className="text-[11px] text-foreground-muted border border-border-blocked bg-foreground-hover-subtle px-2 py-1.5">
        {t("emailStub")}
      </p>
      <CommitButton
        onCommit={onContinue}
        className="mt-3 w-full text-xs font-bold uppercase bg-transparent text-foreground border border-border tracking-wide py-1.5 btn-swipe cursor-pointer"
      >
        {t("continue")}
      </CommitButton>
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
