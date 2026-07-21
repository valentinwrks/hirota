"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PreloaderView } from "./PreloaderView";

// Standalone styling preview for the preloader (route: /preloader). Renders the
// real PreloaderView but PERSISTENT — done stays false, so it never fades out —
// so it can be inspected and restyled at leisure. A "replay" control re-runs the
// staged bar fill so the motion is visible on demand; the progress readout helps
// while tweaking. This page reuses the exact PreloaderView the app ships, so
// whatever looks right here is what users get.
export function PreloaderPreview() {
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  // Schedules the staged fill via timeouts only (no synchronous state writes),
  // so it is safe to kick off from an effect. First step fires after a short
  // delay, letting a preceding reset-to-0 paint.
  const scheduleFill = useCallback(() => {
    const SEG_MS = 220; // matches the bar's width transition
    const STEPS: { to: number; hold: number }[] = [
      { to: 15, hold: 400 },
      { to: 73, hold: 220 },
      { to: 100, hold: 0 },
    ];
    let i = 0;
    const run = () => {
      setProgress(STEPS[i].to);
      i += 1;
      if (i < STEPS.length) {
        timers.current.push(window.setTimeout(run, SEG_MS + STEPS[i - 1].hold));
      }
    };
    timers.current.push(window.setTimeout(run, 80));
  }, []);

  const replay = useCallback(() => {
    clearTimers();
    setProgress(0);
    scheduleFill();
  }, [clearTimers, scheduleFill]);

  useEffect(() => {
    scheduleFill();
    return clearTimers;
  }, [scheduleFill, clearTimers]);

  return (
    <>
      <PreloaderView progress={progress} done={false} />

      {/* Dev control bar — sits above the overlay (z over the preloader). */}
      <div className="fixed inset-x-0 bottom-5 z-[210] flex items-center justify-center gap-3 text-xs">
        <span className="tabular-nums text-foreground-muted select-none">
          {progress}%
        </span>
        <button
          type="button"
          onClick={replay}
          className="border border-border bg-white/60 px-3 py-1 font-bold tracking-wide text-foreground hover:bg-foreground-hover cursor-pointer"
        >
          replay
        </button>
      </div>
    </>
  );
}
