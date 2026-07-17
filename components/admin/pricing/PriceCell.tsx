"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import {
  updatePriceCell,
  type CellTarget,
} from "@/lib/admin/pricing/actions";

// One editable price cell in a lookup matrix (Patterns B/C). Click to edit;
// Enter/blur saves through the registry server action, Esc reverts. 0 is a
// VALID price (offered & free) and renders as "0" — never conflated with NULL
// ("not offered"), which is rendered by the matrices as a static "—", not by
// this component. Feedback: spinner while saving, a brief check on success,
// red border + message on error.
export function PriceCell({
  target,
  pk,
  value,
}: {
  target: CellTarget;
  pk: Record<string, string | number>;
  value: number;
}) {
  const router = useRouter();
  const t = useTranslations("Admin");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function open() {
    setDraft(String(value));
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function commit() {
    const trimmed = draft.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError(t("pricing.cellError"));
      return;
    }
    const next = Number(trimmed);
    if (next === value) {
      cancel();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updatePriceCell(target, pk, next);
      if (result.ok) {
        setEditing(false);
        setSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(false), 1200);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => (pending ? undefined : commit())}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          disabled={pending}
          inputMode="numeric"
          aria-label={t("pricing.priceAria")}
          title={error ?? undefined}
          className={
            "w-16 px-1 py-0 text-right tabular-nums bg-background outline-none border " +
            (error ? "border-red-700 text-red-700" : "border-foreground")
          }
        />
        {pending ? (
          <Loader2 size={12} className="animate-spin text-foreground-muted" />
        ) : error ? (
          <button
            type="button"
            onClick={cancel}
            aria-label={t("pricing.cancel")}
            title={t("pricing.cancel")}
            className="text-red-700"
          >
            <X size={12} />
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      title={t("pricing.clickToEdit")}
      className="inline-flex items-center gap-1 px-1 -mx-1 tabular-nums text-foreground hover:bg-foreground-hover-subtle hover:text-foreground-strong cursor-text"
    >
      {value.toLocaleString("en-US")}
      {saved ? <Check size={12} className="text-foreground-strong" /> : null}
    </button>
  );
}
