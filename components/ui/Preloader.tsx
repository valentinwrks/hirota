"use client";

import { useEffect, useState } from "react";
import { PreloaderView } from "./PreloaderView";

// Marks the document as fully loaded once — releases the column "scanner" reveal
// (globals.css gates .column-scan on this attribute) and lets later mounts of the
// Preloader know the intro already played.
function markAppLoaded() {
  document.documentElement.dataset.appLoaded = "true";
}

// Full-screen loading gate: covers everything from the first paint and fades out
// once the bar has filled AND `window.load` has fired (all resources loaded).
// The fill is deliberately staged (fast tramo → hold → next) so the bar always
// reads as "loading" even when the page is instant. Visual lives in PreloaderView.
//
// Only shown on a genuine document load (first visit / F5). On soft client
// navigations that remount this component — notably a locale switch, which
// re-navigates via router.replace — <html data-app-loaded> is already set, so we
// skip the whole intro and let the columns scan in on their own (they key off the
// locale). A real reload ships a fresh <html> without the flag, so it plays again.
export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false); // load complete → fade-out starts
  const [hidden, setHidden] = useState(false); // fade finished → unmount
  // Captured once on mount: has the intro already played in THIS document?
  const [skip] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.appLoaded === "true",
  );

  // Soft re-nav (e.g. locale switch): no intro, but make sure the reveal gate is
  // open so the freshly-keyed columns scan in immediately.
  useEffect(() => {
    if (skip) markAppLoaded();
  }, [skip]);

  useEffect(() => {
    if (skip) return; // intro already played — nothing to run

    // Staged fill: the bar animates smoothly to each checkpoint (SEG_MS), holds
    // a beat, then jumps to the next. The "hold" is the pause where it sits still.
    const SEG_MS = 220; // smooth-tramo duration (matches duration-[220ms] in the view)
    const STEPS: { to: number; hold: number }[] = [
      { to: 15, hold: 400 },
      { to: 73, hold: 220 },
      { to: 100, hold: 0 },
    ];

    // The fade only starts once BOTH conditions hold: the bar finished filling AND
    // the page loaded. So even an instant load still shows the bar fill first.
    let filled = false;
    let loaded = false;
    const maybeReveal = () => {
      if (filled && loaded) setDone(true);
    };

    const timers: number[] = [];
    let i = 0;
    const runStep = () => {
      const step = STEPS[i];
      setProgress(step.to);
      i += 1;
      if (i < STEPS.length) {
        timers.push(window.setTimeout(runStep, SEG_MS + step.hold));
      } else {
        // Last tramo: the bar is full when its animation ends.
        timers.push(
          window.setTimeout(() => {
            filled = true;
            maybeReveal();
          }, SEG_MS),
        );
      }
    };
    const start = requestAnimationFrame(runStep);

    const onLoad = () => {
      loaded = true;
      maybeReveal();
    };
    if (document.readyState === "complete") {
      loaded = true;
    } else {
      window.addEventListener("load", onLoad);
    }

    // Fallback: never trap the screen if `load` never fires.
    const fallback = window.setTimeout(() => {
      filled = true;
      loaded = true;
      setDone(true);
    }, 6000);

    return () => {
      cancelAnimationFrame(start);
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(fallback);
      window.removeEventListener("load", onLoad);
    };
  }, [skip]);

  useEffect(() => {
    if (!done) return;
    // Open the reveal gate the instant we start fading out, so the columns scan
    // in underneath the disappearing preloader (a soft crossfade) rather than
    // finishing hidden behind it.
    markAppLoaded();
    const t = window.setTimeout(() => setHidden(true), 600); // fade duration
    return () => window.clearTimeout(t);
  }, [done]);

  if (skip || hidden) return null;

  return <PreloaderView progress={progress} done={done} />;
}
