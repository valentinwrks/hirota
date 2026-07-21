// Shared field + button classes for the news editor (create form + row editor),
// matching the pricing editors' bordered, monospaced spreadsheet look. Plain
// module (no "use client") — imported by the client editor components.

// Transparent, bordered field matching the configurator inputs (e.g. the obi
// embroidery text field): the border-border frame is the whole affordance — no
// white fill, so the page background shows through like the store forms.
export const fieldCls =
  "w-full border border-border bg-transparent px-2 py-1 text-[12px] outline-none focus:border-foreground";

/** Primary action button: armed (dark border) when `active`, muted otherwise. */
export function btnCls(active: boolean): string {
  return (
    "inline-flex items-center gap-1 border px-2 py-0.5 leading-none " +
    (active
      ? "border-foreground text-foreground-strong hover:bg-foreground-hover-subtle cursor-pointer"
      : "border-border-blocked text-foreground-blocked cursor-default")
  );
}
