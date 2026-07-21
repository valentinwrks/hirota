"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Plus } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { createNews } from "@/lib/admin/news/actions";
import { fieldCls, btnCls } from "./parts";

/** Today as an ISO calendar date (YYYY-MM-DD) for the date input's default. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Create form for a news post: date (defaults to today), title, body. On save it
// clears back to a blank post and refreshes so the new row appears in the list.
export function NewsCreateForm() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const valid = date !== "" && title.trim() !== "" && body.trim() !== "";

  function submit() {
    if (!valid) {
      setError(t("news.required"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createNews({ publishedOn: date, title, body });
      if (res.ok) {
        setTitle("");
        setBody("");
        setDate(today());
        setSaved(true);
        setTimeout(() => setSaved(false), 1400);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-border p-2.5 max-w-[520px]">
      <label className="flex flex-col gap-1">
        <span className="text-foreground-muted">{t("news.date")}</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={pending}
          className={fieldCls + " w-auto"}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-foreground-muted">{t("news.headline")}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={pending}
          placeholder={t("news.titlePlaceholder")}
          className={fieldCls}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-foreground-muted">{t("news.body")}</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={pending}
          rows={5}
          className={fieldCls + " resize-y leading-tight"}
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !valid}
          className={btnCls(valid && !pending)}
        >
          {pending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Plus size={12} />
          )}
          {t("news.add")}
        </button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-foreground-muted text-[11px]">
            <Check size={12} /> {t("news.saved")}
          </span>
        ) : null}
        {error ? <span className="text-red-700 text-[11px]">{error}</span> : null}
      </div>
    </div>
  );
}
