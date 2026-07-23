"use client";

import { useEffect, useState } from "react";

// Pill-shaped toggle switch — the same visual language as the mobile
// "configurator / your product" toggle in ConfiguratorLayout: a rounded track
// (border) with a single fill pill that SLIDES between the two halves. The two
// labels sit above the fill (z-10) and only carry text; the active fill is the
// pill behind them.
//
// The WHOLE control is a single button: tapping anywhere on it (either label or
// the gap) toggles to the other option, and the pointer cursor covers the whole
// area. Two options only — that's all the language / currency switches need.
export type PillOption<T extends string> = { value: T; label: string };

// Proportional sizes. Track and pill are sized INDEPENDENTLY so the track can be
// shorter than two pills — tightening the gap between the two labels while the
// pill keeps its size. The pill sits at the left edge and travels `trackW - pillW`
// to reach the right edge, so each label (a pillW-wide box pinned left / right)
// stays centred over the pill's two rest positions.
// - lg: trackW = 2×pillW and travel = pillW, i.e. the classic "two segments"
//   layout (labels a full pill-width apart).
// - sm (desktop) and xl use a track a touch shorter than 2×pillW to pull the two
//   labels a little closer (same ratio, ~1.9×pillW).
// "lg" is ×1.5 of "sm"; "xl" is the admin mobile menu's larger switch, its 28px
// pill height matching the menu's 28px link type.
export type Size = "sm" | "lg" | "xl";

const SIZE: Record<
  Size,
  { trackH: string; trackW: string; pillH: string; pillW: string; travel: string; text: string }
> = {
  sm: { trackH: "h-[12px]", trackW: "w-[57px]", pillH: "h-[14px]", pillW: "w-[30px]", travel: "translate-x-[27px]", text: "text-[12px]" },
  lg: { trackH: "h-[18px]", trackW: "w-[90px]", pillH: "h-[21px]", pillW: "w-[45px]", travel: "translate-x-[45px]", text: "text-[18px]" },
  xl: { trackH: "h-[24px]", trackW: "w-[103px]", pillH: "h-[28px]", pillW: "w-[54px]", travel: "translate-x-[49px]", text: "text-[24px]" },
};

export function PillSwitch<T extends string>({
  options,
  value,
  onSelect,
  label,
  disabled = false,
  size = "sm",
}: {
  options: [PillOption<T>, PillOption<T>];
  value: T;
  onSelect: (value: T) => void;
  label: string;
  disabled?: boolean;
  size?: Size;
}) {
  const sz = SIZE[size];
  const activeIndex = options.findIndex((o) => o.value === value);

  // Slide only AFTER the first paints have settled. A provider can correct
  // `value` right after mount (e.g. CurrencyProvider restores USD from
  // localStorage in an effect, and a locale switch re-mounts this whole tree),
  // and that settle must SNAP into place, not glide. Enabling the transition two
  // frames later means the mount-time correction lands untransitioned while
  // genuine user toggles (long past mount) animate normally.
  const [slide, setSlide] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setSlide(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  // Tapping anywhere toggles to the OTHER option.
  const toggle = () => onSelect(options[activeIndex === 0 ? 1 : 0].value);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activeIndex === 1}
      aria-label={label}
      onClick={toggle}
      disabled={disabled}
      className={
        "group relative p-0 rounded-full " +
        "bg-[rgba(0,0,0,0.1)] cursor-pointer disabled:cursor-default " +
        sz.trackW + " " + sz.trackH
      }
    >
      {/* Sliding fill: a fixed-width pill parked at the left edge, translated by
          `travel` (= trackW - pillW) to the right edge when the second option is
          active. Taller than the track and vertically centred, so it stands proud
          above and below the thinner background band (sm: 14 vs 12px track). */}
      <span
        aria-hidden="true"
        className={
          "pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 " +
          sz.pillW + " " + sz.pillH +
          " rounded-full bg-foreground-selected " +
          (slide
            ? "transition-transform duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] "
            : "") +
          (activeIndex === 1 ? sz.travel : "translate-x-0")
        }
      />
      {options.map((o, i) => {
        const isActive = o.value === value;
        return (
          <span
            key={o.value}
            className={
              "absolute top-0 z-10 flex h-full items-center justify-center leading-none " +
              (i === 0 ? "left-0 " : "right-0 ") +
              sz.pillW +
              " transition-colors " +
              sz.text +
              (isActive ? " text-white" : " text-foreground")
            }
          >
            {o.label}
          </span>
        );
      })}
    </button>
  );
}
