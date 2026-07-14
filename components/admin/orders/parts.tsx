import type { ReactNode } from "react";

// Shared presentational primitives for the order detail "fax sheet". Dense,
// tabular, monospaced — a label/value grid that reads like HIROTA's paper order
// form. Purely presentational; every value passed in is already resolved from
// the frozen snapshot (no computation here).

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border">
      <h4 className="px-3 py-1 text-[11px] uppercase tracking-wide text-foreground-muted leading-none">
        {title}
      </h4>
      <div className="px-3 pb-2">{children}</div>
    </section>
  );
}

/** A responsive label/value grid. `cols` sets the max columns on wide screens. */
export function Grid({
  children,
  cols = 2,
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3;
}) {
  const colClass =
    cols === 3
      ? "sm:grid-cols-3"
      : cols === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-1";
  return <dl className={`grid grid-cols-1 ${colClass} gap-x-6 gap-y-1`}>{children}</dl>;
}

/** One label/value pair. `value` renders "—" when empty/absent. */
export function Field({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  const empty =
    value == null || value === "" || value === false;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-blocked py-0.5">
      <dt className="text-foreground-muted whitespace-nowrap">{label}</dt>
      <dd className="text-foreground-input text-right tabular-nums">
        {empty ? <span className="text-foreground-disabled">—</span> : value}
      </dd>
    </div>
  );
}
