import type { StatusTone } from "@/lib/admin/orders/status-labels";

// A single status indicator (one axis, one value). The three axes are always
// shown as DISTINCT badges — never merged into one "status" — so the admin reads
// payment / production / shipping independently (§8.6).
const TONE_CLASS: Record<StatusTone, string> = {
  idle: "border-border text-foreground-muted",
  active: "border-foreground text-foreground",
  terminal: "border-foreground text-foreground bg-foreground-hover-subtle",
};

export function StatusBadge({
  label,
  tone,
  prefix,
}: {
  label: string;
  tone: StatusTone;
  prefix?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 leading-none text-[11px] whitespace-nowrap ${TONE_CLASS[tone]}`}
    >
      {prefix ? <span className="text-foreground-muted">{prefix}</span> : null}
      {label}
    </span>
  );
}
