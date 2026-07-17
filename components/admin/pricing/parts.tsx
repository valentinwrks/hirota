import type { ReactNode } from "react";

// Shared presentational bits for the pricing editors: a titled table block and
// consistent th/td classes, matching the Orders tables' spreadsheet look.

export function TableBlock({
  title,
  note,
  children,
}: {
  title: string;
  /** Optional caption, e.g. the shared-table warning or "JPY, tax incl.". */
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="p-3">
      {/* Same style as the configurator section titles (text-lg = 18px, bold). */}
      <h3 className="text-lg font-bold leading-tight mb-[3px]">{title}</h3>
      {note ? (
        <p className="text-[11px] text-foreground-muted mb-2">{note}</p>
      ) : null}
      <div className="overflow-x-auto scrollbar-thin">
        {/* Framed on all 4 sides. The last row drops its own faint border-b so
            the frame's bottom edge stays as strong as the other three (in
            border-collapse, a cell border outranks the table border). */}
        <table className="text-[12px] border-collapse border border-border [&_tbody_tr:last-child>td]:border-b-0">
          {children}
        </table>
      </div>
    </section>
  );
}

export const TH = "px-3 py-1.5 border-b border-border font-bold text-left whitespace-nowrap";
export const TH_NUM = "px-3 py-1.5 border-b border-border font-bold text-right whitespace-nowrap";
export const TD = "px-3 py-1.5 border-b border-border-blocked whitespace-nowrap";
export const TD_NUM = "px-3 py-1.5 border-b border-border-blocked text-right tabular-nums whitespace-nowrap";

/** A "not offered" cell: NULL price or absent row. Static, never editable. */
export function NotOffered() {
  return <span className="text-foreground-blocked">—</span>;
}
