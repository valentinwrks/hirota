import type { ReactNode } from "react";

// Shared presentational primitives for the order detail "fax sheet". Same
// design language as the pricing editors: transparent surfaces, framed
// content-width tables, bold 12px row headers, faint row separators.

export function Section({
  title,
  children,
  tinted = false,
}: {
  title: string;
  children: ReactNode;
  /** Subtle fill for non-spec blocks (the price breakdown) to set them apart. */
  tinted?: boolean;
}) {
  return (
    <section
      className={
        "border-t border-border" +
        (tinted ? " bg-foreground-hover-subtle" : "")
      }
    >
      {/* Styled like a table header row (bold, 12px) — the panel's inner th. */}
      <h4 className="px-3 py-1.5 text-[12px] font-bold text-foreground leading-none">
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

const isEmpty = (value: ReactNode) =>
  value == null || value === "" || value === false;

/** One label/value pair. `value` renders "—" when empty/absent. */
export function Field({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-blocked py-0.5">
      <dt className="text-foreground-muted whitespace-nowrap">{label}</dt>
      <dd className="text-foreground text-right tabular-nums">
        {isEmpty(value) ? <span className="text-foreground-blocked">—</span> : value}
      </dd>
    </div>
  );
}

/**
 * A framed label/value table (order meta, customer, address): the same
 * 4-sided-border, content-width treatment as the pricing tables, with the
 * last row dropping its faint border-b so the frame's bottom edge stays strong.
 */
export function KvTable({
  rows,
}: {
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="text-[12px] border-collapse border border-border [&_tbody_tr:last-child>td]:border-b-0">
        <tbody>
          {rows.map(({ label, value }) => (
            <tr key={label} className="hover:bg-foreground-hover-subtle">
              <td className="px-3 py-1.5 border-b border-border-blocked text-foreground-muted whitespace-nowrap">
                {label}
              </td>
              <td className="px-3 py-1.5 border-b border-border-blocked text-foreground tabular-nums min-w-[12rem]">
                {isEmpty(value) ? (
                  <span className="text-foreground-blocked">—</span>
                ) : (
                  value
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
