"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";

// Duration of the press→"selected" fill. Kept in JS (not just CSS) because the
// button's action is deferred until the fill finishes, so the timer and the
// transition must agree.
const COMMIT_MS = 500;
// Same ease-in curve as the hover `btn-swipe` sweep (easeInQuint): starts slow,
// accelerates to the end — a "loading bar" feel.
const COMMIT_EASE = "cubic-bezier(0.7, 0, 0.84, 0)";

// A CTA button whose *press* fills left-to-right into the "selected" look
// (white text over --foreground-selected) like a loading bar, and only runs its
// action once that fill completes. The hover sweep (subtle --foreground-hover)
// keeps coming from the caller's `btn-swipe` class in `className`.
//
// The fill is a clip-path reveal of a full-size text overlay stacked on the base
// label, so the label recolors in place (dark → white) as the bar passes and
// never shifts. When the timer fires we run `onCommit` and snap the overlay away
// (no reverse animation), handing the visual back to the parent's own state
// (label swap, unmount, sheet open…).
export function CommitButton({
  onCommit,
  children,
  className = "",
  disabled = false,
  type = "button",
  ...rest
}: {
  onCommit: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
} & Omit<ComponentPropsWithoutRef<"button">, "onClick" | "className" | "type" | "children">) {
  const [committing, setCommitting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending timer if the button unmounts mid-fill (e.g. the action
  // already ran and swapped the UI).
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleClick = () => {
    if (disabled || committing) return;

    // Reduced motion: no fill, run immediately.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      onCommit();
      return;
    }

    setCommitting(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      onCommit();
      setCommitting(false);
    }, COMMIT_MS);
  };

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || committing}
      onClick={handleClick}
      className={"relative overflow-hidden " + className}
    >
      {/* Base label — stays visible so the not-yet-revealed part shows the
          normal (dark) text under the sweeping overlay. */}
      {children}
      {/* Overlay label — the "selected" fill, revealed left→right by clip-path. */}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-foreground-selected text-background"
        style={{
          clipPath: committing ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transition: committing ? `clip-path ${COMMIT_MS}ms ${COMMIT_EASE}` : "none",
        }}
      >
        {children}
      </span>
    </button>
  );
}
