"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { updateNews, deleteNews } from "@/lib/admin/news/actions";
import { fieldCls, btnCls } from "./parts";

// One existing news post: read-only by default (date · title · body), with edit
// and delete controls. Editing swaps the row for the same field set as the
// create form; saving/deleting refreshes so the list reflects the change.
export function NewsRowEditor({
  id,
  publishedOn,
  title,
  body,
}: {
  id: number;
  publishedOn: string;
  title: string;
  body: string;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(publishedOn);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftBody, setDraftBody] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const valid =
    date !== "" && draftTitle.trim() !== "" && draftBody.trim() !== "";

  function save() {
    if (!valid) {
      setError(t("news.required"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateNews({
        id,
        publishedOn: date,
        title: draftTitle,
        body: draftBody,
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function remove() {
    if (!window.confirm(t("news.confirmDelete"))) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteNews(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function cancel() {
    setDate(publishedOn);
    setDraftTitle(title);
    setDraftBody(body);
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 border border-foreground p-2.5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={pending}
          className={fieldCls + " w-auto"}
        />
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          disabled={pending}
          className={fieldCls}
        />
        <textarea
          value={draftBody}
          onChange={(e) => setDraftBody(e.target.value)}
          disabled={pending}
          rows={5}
          className={fieldCls + " resize-y leading-tight"}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending || !valid}
            className={btnCls(valid && !pending)}
          >
            {pending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Check size={12} />
            )}
            {t("news.save")}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="inline-flex items-center gap-1 border border-border-blocked px-2 py-0.5 leading-none text-foreground-muted hover:bg-foreground-hover-subtle cursor-pointer"
          >
            <X size={12} /> {t("news.cancel")}
          </button>
          {error ? (
            <span className="text-red-700 text-[11px]">{error}</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border-blocked p-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold tabular-nums text-foreground-muted">
            {publishedOn}
          </p>
          <p className="font-bold">{title}</p>
          <p className="whitespace-pre-line leading-tight mt-1">{body}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={pending}
            aria-label={t("news.edit")}
            className="border border-border-blocked p-1 hover:bg-foreground-hover-subtle cursor-pointer"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label={t("news.delete")}
            className="border border-border-blocked p-1 hover:bg-foreground-hover-subtle cursor-pointer"
          >
            {pending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        </div>
      </div>
      {error ? <p className="text-red-700 text-[11px] mt-1">{error}</p> : null}
    </div>
  );
}
