"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { PreloaderView } from "./PreloaderView";

// Marks the document as fully loaded — releases the column "scanner" reveal
// (globals.css gates .column-scan on this attribute). Set once the first intro
// finishes; stays set (later replays don't re-scan the columns, they just play
// the full-screen loader over the reflow / text swap).
function markAppLoaded() {
  document.documentElement.dataset.appLoaded = "true";
}

// Which responsive layout bucket the viewport is in. The design only reflows at
// Tailwind's md (768) and 2xl (1536) — those are the only boundaries whose
// crossing warrants a fresh preloader pass (sm/lg carry a couple of trivial
// tweaks, not layout changes). Three buckets → two trigger boundaries.
function bucketOf(width: number): string {
  if (width >= 1536) return "2xl";
  if (width >= 768) return "md";
  return "base";
}

// Full-screen loading gate: covers everything and fades out once the bar has
// filled. The fill is deliberately staged (fast tramo → hold → next) so the bar
// always reads as "loading" even when there's nothing to wait for. Visual lives
// in PreloaderView.
//
// It (re)plays in three situations, each bumping `runId`:
//   1. First document load (F5 / first visit): the ONLY run that also waits for
//      `window.load`, so the bar can't finish before the page's resources do.
//   2. Locale switch: the loader masks the EN⇄JA text swap.
//   3. Crossing the md / 2xl breakpoint: the loader masks the layout reflow.
// Runs 2 and 3 treat "loaded" as immediately true (resources are already there).
export function Preloader() {
  const locale = useLocale();

  const [runId, setRunId] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false); // fill complete → fade-out starts
  const [visible, setVisible] = useState(true); // overlay mounted

  // The intro sequence. Re-runs whenever runId changes (a fresh trigger).
  useEffect(() => {
    // Reset visuals for this pass.
    setProgress(0);
    setDone(false);
    setVisible(true);

    const isFirst = runId === 0;

    // Staged fill: the bar animates smoothly to each checkpoint (SEG_MS), holds
    // a beat, then jumps to the next. The "hold" is the pause where it sits still.
    const SEG_MS = 220; // smooth-tramo duration (matches duration-[220ms] in the view)
    const STEPS: { to: number; hold: number }[] = [
      { to: 15, hold: 400 },
      { to: 73, hold: 220 },
      { to: 100, hold: 0 },
    ];

    // The fade only starts once BOTH the bar finished filling AND the page is
    // "loaded". On the first run that means waiting for window.load; on a soft
    // replay (locale / breakpoint) the resources are already present.
    let filled = false;
    let loaded = !isFirst || document.readyState === "complete";
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
    if (isFirst && document.readyState !== "complete") {
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
  }, [runId]);

  // Fade → unmount. Opens the column-scan gate the instant we start fading (so a
  // first-load reveal scans in underneath), then unmounts after the fade.
  useEffect(() => {
    if (!done) return;
    markAppLoaded();
    const t = window.setTimeout(() => setVisible(false), 600); // fade duration
    return () => window.clearTimeout(t);
  }, [done]);

  // Trigger 2 — locale switch. Compare against the previous value so the initial
  // render (runId 0 already covers it) doesn't double-fire.
  const prevLocale = useRef(locale);
  useEffect(() => {
    if (prevLocale.current !== locale) {
      prevLocale.current = locale;
      setRunId((n) => n + 1);
    }
  }, [locale]);

  // Trigger 3 — crossing the md / 2xl boundary. matchMedia fires on each
  // boundary; we re-derive the bucket and only replay on a real bucket change.
  useEffect(() => {
    const queries = [
      window.matchMedia("(min-width: 768px)"),
      window.matchMedia("(min-width: 1536px)"),
    ];
    let current = bucketOf(window.innerWidth);
    const onChange = () => {
      const next = bucketOf(window.innerWidth);
      if (next !== current) {
        current = next;
        setRunId((n) => n + 1);
      }
    };
    queries.forEach((q) => q.addEventListener("change", onChange));
    return () => queries.forEach((q) => q.removeEventListener("change", onChange));
  }, []);

  if (!visible) return null;

  return <PreloaderView progress={progress} done={done} />;
}
