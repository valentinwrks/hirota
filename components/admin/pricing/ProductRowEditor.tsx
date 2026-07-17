"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { updateProduct } from "@/lib/admin/pricing/actions";

// One Pattern A product row: price + stock are the ONLY editable fields (name,
// description, options, image are content, handled by the developer — §2).
// Both fields save together per row; the button arms when either is dirty.
export function ProductRowEditor({
  productId,
  name,
  productType,
  price,
  stock,
}: {
  productId: number;
  name: string;
  productType: string | null;
  price: number;
  stock: number;
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
    <tr className="hover:bg-foreground-hover-subtle align-baseline">
      <td className="px-3 py-1.5 border-b border-border-blocked text-foreground-muted tabular-nums">
        {productId}
      </td>
      <td className="px-3 py-1.5 border-b border-border-blocked text-foreground">
        {name}
      </td>
      <td className="px-3 py-1.5 border-b border-border-blocked text-foreground-muted max-md:hidden">
        {productType ?? "—"}
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
  );
}
