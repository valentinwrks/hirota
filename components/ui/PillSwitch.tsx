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

// Two proportional sizes. "lg" is exactly ×1.5 of "sm" on every dimension —
// track height, the pill's overhang, segment width and text — so the mobile menu
// switch reads as the same control, just bigger. Keep them in lockstep: if one
// value changes, scale its pair by the same factor.
type Size = "sm" | "lg";

const SIZE: Record<Size, { track: string; pill: string; segment: string }> = {
  sm: { track: "h-[12px]", pill: "h-[14px]", segment: "w-7.5 text-[12px]" },
  lg: { track: "h-[18px]", pill: "h-[21px]", segment: "w-[45px] text-[18px]" },
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
        "group relative grid grid-cols-2 p-0 rounded-full " +
        "bg-[rgba(0,0,0,0.1)] cursor-pointer disabled:cursor-default " +
        sz.track
      }
    >
      {/* Sliding fill: a half-width pill parked behind the labels, translated to
          the right half when the second option is active. Taller than the track
          and vertically centred, so it stands proud above and below the thinner
          background band (sm: 14 vs 12px track; lg: 21 vs 18px). */}
      <span
        aria-hidden="true"
        className={
          "pointer-events-none absolute top-1/2 left-0 w-1/2 -translate-y-1/2 " +
          sz.pill +
          " rounded-full bg-foreground-selected " +
          (slide
            ? "transition-transform duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] "
            : "") +
          (activeIndex === 1 ? "translate-x-full" : "translate-x-0")
        }
      />
      {options.map((o) => {
        const isActive = o.value === value;
        return (
          <span
            key={o.value}
            className={
              "relative z-10 flex items-center justify-center leading-none " +
              sz.segment +
              " rounded-full transition-colors " +
              (isActive ? "text-white" : "text-foreground")
            }
          >
            {o.label}
          </span>
        );
      })}
    </button>
  );
}
