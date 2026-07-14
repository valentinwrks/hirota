import type { StatusTone } from "@/lib/admin/orders/status-labels";

// A single status indicator (one axis, one value). The three axes are always
// shown as DISTINCT badges — never merged into one "status" — so the admin reads
// payment / production / shipping independently (§8.6).
const TONE_CLASS: Record<StatusTone, string> = {
  idle: "border-border text-ink-40",
  active: "border-ink-50 text-ink-70",
  terminal: "border-ink-70 text-ink-70 bg-ink-04",
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
      {prefix ? <span className="text-ink-35">{prefix}</span> : null}
      {label}
    </span>
  );
}
