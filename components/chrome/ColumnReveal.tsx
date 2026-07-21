"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Wraps a column's content so it reveals top-to-bottom like a scanner (the
// `.column-scan` animation in globals.css: a soft-edged mask that slides down).
// The reveal REPLAYS whenever the wrapper remounts, which we force by changing
// its `key`:
//
//   • Center column (shop): no `revealKey` → keyed by the full pathname, so it
//     replays on a fresh mount (F5 / first visit), a locale switch AND a section
//     change (/obi, /equipment, …).
//   • Side columns (about / cart): `revealKey={locale}` → keyed by locale only,
//     so they replay on mount and on a locale switch, but stay STATIC when the
//     user just navigates between sections (the store layout doesn't re-render
//     those columns on a section change anyway; keying by locale makes the intent
//     explicit and guards against future remounts).
//
// `className` is merged so callers can make the wrapper participate in the parent
// flex layout (the cart body needs `flex-1 min-h-0 flex flex-col` to keep its
// footer pinned).
export function ColumnReveal({
  children,
  revealKey,
  className = "",
}: {
  children: ReactNode;
  revealKey?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const key = revealKey ?? pathname;
  return (
    <div key={key} className={`column-scan ${className}`}>
      {children}
    </div>
  );
}
