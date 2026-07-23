"use client";

import { useCallback, type ReactNode } from "react";
import { usePathname } from "@/lib/i18n/navigation";

// Constant reveal SPEED across sections. The `.column-scan` mask sweeps the WHOLE
// content height in one animation, so a FIXED duration makes the scan front move at
// `height / duration` px per second — i.e. a short section (little content) sweeps
// SLOWER than a tall one, which reads as inconsistent speed. To keep the front at a
// constant px/sec we make the duration PROPORTIONAL to the measured content height:
//
//   duration(ms) = clamp(MIN, height_px * MS_PER_PX, MAX)
//
// The store content is typically taller than the viewport and scrolls, so real
// heights run ~850–3050px. MS_PER_PX = 1.4 lands the VISIBLE reveal (the top
// ~viewport of it) at ~0.85s — snappy and identical in every section — while the
// below-fold remainder keeps scanning at that same speed. Clamps only guard
// pathological extremes; they must stay OUTSIDE the real height range or they'd
// squash the proportionality (an earlier 4500ms cap made every section clamp to the
// same duration → speed went non-constant again).
//
// MIN is deliberately LOW so small elements still scan at the same px/sec instead of
// being slowed to a fixed floor: the category nav (~100px) must sweep at the content
// speed (~140ms), not crawl over a full second, or it reads as inconsistent next to
// the taller columns. MIN only guards a genuinely tiny element from a 1–2 frame
// blink; MAX keeps an enormous one from crawling for many seconds.
const MS_PER_PX = 1.4;
const MIN_MS = 140;
const MAX_MS = 6000;

// Wraps a column's content so it reveals top-to-bottom like a scanner (the
// `.column-scan` animation in globals.css: a soft-edged mask that slides down).
// The reveal REPLAYS whenever the wrapper remounts, which we force by changing
// its `key`:
//
//   • Center column (shop): no `revealKey` → keyed by the LOCALE-AGNOSTIC
//     pathname (next-intl's usePathname, without the /en · /ja prefix), so it
//     replays on a fresh mount (F5 / first visit) and a section change (/obi,
//     /equipment, …) but NOT on a locale switch — swapping language just swaps
//     the text, like the currency switch, with no re-scan.
//   • Side columns (about / cart) and the category nav: pass a CONSTANT
//     `revealKey` → they only replay on a fresh mount, never on soft navigation
//     (neither section nor locale change), matching their persistent placement.
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

  // Ref callback (runs on mount during commit, before paint — no SSR issue, no
  // one-frame flash of the fallback duration). Measures the content height and
  // sets --scan-ms so the scan front moves at a constant speed. Re-fires on every
  // remount because the node changes with `key`.
  const setScanDuration = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ms = Math.min(MAX_MS, Math.max(MIN_MS, Math.round(el.offsetHeight * MS_PER_PX)));
    el.style.setProperty("--scan-ms", `${ms}ms`);
  }, []);

  return (
    <div key={key} ref={setScanDuration} className={`column-scan ${className}`}>
      {children}
    </div>
  );
}
