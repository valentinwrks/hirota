"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { productImage } from "@/lib/catalog/types";
import { updateProduct, updateProductCopy } from "@/lib/admin/pricing/actions";

// One Pattern A product row. Two independent save paths, each with its own grant:
//   - price + stock, edited inline (this row);
//   - name / description / product_type in EN + JA, edited in an expandable
//     panel below the row (bilingual, authored regardless of the admin locale).
// The tiny image is a read-only recognition aid (images are fixed on disk, §2).
export function ProductRowEditor({
  productId,
  name,
  subcategory,
  price,
  stock,
  nameEn,
  nameJa,
  descEn,
  descJa,
  typeEn,
  typeJa,
}: {
  productId: number;
  name: string;
  subcategory: string;
  price: number;
  stock: number;
  nameEn: string;
  nameJa: string;
  descEn: string;
  descJa: string;
  typeEn: string;
  typeJa: string;
}) {
  const router = useRouter();
  const t = useTranslations("Admin");
  // Baselines track the last SAVED values so dirty-detection survives a save
  // without waiting for the server re-render.
  const [basePrice, setBasePrice] = useState(price);
  const [baseStock, setBaseStock] = useState(stock);
  const [priceDraft, setPriceDraft] = useState(String(price));
  const [stockDraft, setStockDraft] = useState(String(stock));
  const [focused, setFocused] = useState<"price" | "stock" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const priceValid = /^\d+$/.test(priceDraft.trim());
  const stockValid = /^\d+$/.test(stockDraft.trim());
  const dirty =
    priceValid && stockValid
      ? Number(priceDraft) !== basePrice || Number(stockDraft) !== baseStock
      : true;

  function save() {
    if (!priceValid || !stockValid) {
      setError(t("pricing.intError"));
      return;
    }
    const nextPrice = Number(priceDraft);
    const nextStock = Number(stockDraft);
    setError(null);
    startTransition(async () => {
      const result = await updateProduct(productId, nextPrice, nextStock);
      if (result.ok) {
        setBasePrice(nextPrice);
        setBaseStock(nextStock);
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  // --- Copy panel (name / description / product_type, EN + JA) ---------------
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState({
    nameEn,
    nameJa,
    descEn,
    descJa,
    typeEn,
    typeJa,
  });
  const [copyBase, setCopyBase] = useState(copy);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyPending, startCopyTransition] = useTransition();

  const copyField = (k: keyof typeof copy) => (v: string) =>
    setCopy((c) => ({ ...c, [k]: v }));
  const copyDirty = (Object.keys(copy) as (keyof typeof copy)[]).some(
    (k) => copy[k] !== copyBase[k],
  );
  const copyValid = copy.nameEn.trim().length > 0;

  function saveCopy() {
    if (!copyValid) {
      setCopyError(t("pricing.nameRequired"));
      return;
    }
    setCopyError(null);
    startCopyTransition(async () => {
      const result = await updateProductCopy(productId, copy);
      if (result.ok) {
        setCopyBase(copy);
        setOpen(false);
        router.refresh();
      } else {
        setCopyError(result.error);
      }
    });
  }

  // Same look as the matrix PriceCells: plain text at rest (transparent, subtle
  // hover), the bordered edit box only while focused. Grouped digits at rest,
  // raw digits while editing.
  const inputCls = (valid: boolean) =>
    "w-16 px-1 py-0 text-right tabular-nums outline-none border cursor-text " +
    (valid
      ? "bg-transparent border-transparent text-foreground hover:bg-foreground-hover-subtle focus:bg-background focus:border-foreground"
      : "bg-background border-red-700 text-red-700");

  const shown = (field: "price" | "stock", draft: string) =>
    focused === field || !/^\d+$/.test(draft.trim())
      ? draft
      : Number(draft).toLocaleString("en-US");

  return (
    <>
      <tr
        className={
          "align-baseline " +
          (open ? "bg-[rgba(0,0,0,0.03)]" : "hover:bg-foreground-hover-subtle")
        }
      >
        <td className="px-3 py-1.5 border-b border-border-blocked text-foreground-muted tabular-nums">
          {productId}
        </td>
        <td className="px-2 py-0 border-b border-border-blocked align-middle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productImage(productId)}
            alt=""
            aria-hidden
            className="block mx-auto w-6 h-6 min-w-6 object-cover object-center bg-background-media opacity-80"
          />
        </td>
        <td className="px-3 py-1.5 border-b border-border-blocked text-foreground whitespace-nowrap">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-left hover:text-foreground-strong cursor-pointer"
          >
            <ChevronRight
              size={12}
              className={
                "shrink-0 transition-transform " + (open ? "rotate-90" : "")
              }
            />
            {name}
          </button>
        </td>
        <td className="px-3 py-1.5 border-b border-border-blocked text-foreground-muted whitespace-nowrap">
          {subcategory}
        </td>
        <td className="px-3 py-1.5 border-b border-border-blocked text-right">
          <input
            value={shown("price", priceDraft)}
            onChange={(e) => setPriceDraft(e.target.value)}
            onFocus={(e) => {
              setFocused("price");
              // Defer past the formatted→raw value swap so select-all survives it.
              const el = e.target;
              setTimeout(() => el.select(), 0);
            }}
            onBlur={() => setFocused(null)}
            disabled={pending}
            inputMode="numeric"
            aria-label={t("pricing.priceAria")}
            className={inputCls(priceValid)}
          />
        </td>
        <td className="px-3 py-1.5 border-b border-border-blocked text-right">
          <input
            value={shown("stock", stockDraft)}
            onChange={(e) => setStockDraft(e.target.value)}
            onFocus={(e) => {
              setFocused("stock");
              const el = e.target;
              setTimeout(() => el.select(), 0);
            }}
            onBlur={() => setFocused(null)}
            disabled={pending}
            inputMode="numeric"
            aria-label={t("pricing.stockAria")}
            className={inputCls(stockValid)}
          />
        </td>
        <td className="px-3 py-1.5 border-b border-border-blocked">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !dirty}
              className={
                "inline-flex items-center gap-1 border px-2 py-0.5 leading-none " +
                (dirty && !pending
                  ? "border-foreground text-foreground-strong hover:bg-foreground-hover-subtle cursor-pointer"
                  : "border-border-blocked text-foreground-blocked cursor-default")
              }
            >
              {pending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              {t("pricing.save")}
            </button>
            {saved ? (
              <span className="inline-flex items-center gap-1 text-foreground-muted text-[11px]">
                <Check size={12} /> {t("pricing.saved")}
              </span>
            ) : null}
            {error ? (
              <span className="text-red-700 text-[11px]">{error}</span>
            ) : null}
          </div>
        </td>
      </tr>
      {/* Panel row stays mounted so height can animate. The grid-rows 0fr→1fr
          trick transitions to height:auto with no JS measuring; the inner
          overflow-hidden wrapper is what collapses. Border/bg/padding live on
          the content div so nothing shows while collapsed. */}
      <tr>
        {/* spacer under ID + IMG so the panel body starts at the Product column.
            Its border/bg apply only while open — the cell isn't animated, so
            keeping them always-on would draw a stray strip under the collapsed
            row. When open, table cells equalise height, so this line/tint lands
            flush with the content cell's. */}
        <td
          colSpan={2}
          className={
            "p-0 " +
            (open ? "border-b border-border-blocked bg-[rgba(0,0,0,0.03)]" : "")
          }
        />
        <td colSpan={5} className="p-0">
          <div
            className={
              "grid transition-[grid-template-rows] duration-200 ease-out " +
              (open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
            }
          >
            <div className="overflow-hidden">
              <div className="pl-6 pr-6 py-3 border-b border-border-blocked bg-[rgba(0,0,0,0.03)]">
                <div className="max-w-[560px] flex flex-col gap-3">
                  <CopyField
                label={t("pricing.copyName")}
                enLabel={t("pricing.langEn")}
                jaLabel={t("pricing.langJa")}
                enValue={copy.nameEn}
                jaValue={copy.nameJa}
                onEn={copyField("nameEn")}
                onJa={copyField("nameJa")}
                enRequired
                disabled={copyPending}
              />
              <CopyField
                label={t("pricing.copyDescription")}
                enLabel={t("pricing.langEn")}
                jaLabel={t("pricing.langJa")}
                enValue={copy.descEn}
                jaValue={copy.descJa}
                onEn={copyField("descEn")}
                onJa={copyField("descJa")}
                disabled={copyPending}
              />
              <CopyField
                label={t("pricing.copyType")}
                enLabel={t("pricing.langEn")}
                jaLabel={t("pricing.langJa")}
                enValue={copy.typeEn}
                jaValue={copy.typeJa}
                onEn={copyField("typeEn")}
                onJa={copyField("typeJa")}
                disabled={copyPending}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveCopy}
                  disabled={copyPending || !copyDirty || !copyValid}
                  className={
                    "inline-flex items-center gap-1 border px-2 py-0.5 leading-none " +
                    (copyDirty && copyValid && !copyPending
                      ? "border-foreground text-foreground-strong hover:bg-background cursor-pointer"
                      : "border-border-blocked text-foreground-blocked cursor-default")
                  }
                >
                  {copyPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  {t("pricing.save")}
                </button>
                {copyError ? (
                  <span className="text-red-700 text-[11px]">{copyError}</span>
                ) : null}
                </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

// One localized attribute: a label with EN and JA text inputs stacked beneath.
function CopyField({
  label,
  enLabel,
  jaLabel,
  enValue,
  jaValue,
  onEn,
  onJa,
  enRequired,
  disabled,
}: {
  label: string;
  enLabel: string;
  jaLabel: string;
  enValue: string;
  jaValue: string;
  onEn: (v: string) => void;
  onJa: (v: string) => void;
  enRequired?: boolean;
  disabled?: boolean;
}) {
  const invalid = enRequired && enValue.trim().length === 0;
  const inputCls =
    "flex-1 min-w-0 px-2 py-1 bg-transparent border outline-none text-foreground " +
    "focus:bg-background focus:border-foreground";
  return (
    <div className="flex flex-col gap-1">
      <span className="font-bold text-foreground">{label}</span>
      <label className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-foreground-muted">{enLabel}</span>
        <input
          value={enValue}
          onChange={(e) => onEn(e.target.value)}
          disabled={disabled}
          className={inputCls + (invalid ? " border-red-700" : " border-border-blocked")}
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-foreground-muted">{jaLabel}</span>
        <input
          value={jaValue}
          onChange={(e) => onJa(e.target.value)}
          disabled={disabled}
          lang="ja"
          className={inputCls + " border-border-blocked"}
        />
      </label>
    </div>
  );
}
