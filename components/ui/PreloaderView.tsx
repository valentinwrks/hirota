import { HirotaLogo } from "@/components/chrome/HirotaLogo";

// Visual half of the preloader (no loading logic). Poster composition: the
// inline HIROTA "unflavored" wordmark centred, with the loading bar directly
// below it — both share the container width (--pw) so they scale together.
// Background is the site's animated gradient (app-gradient) so the reveal into
// the real page is seamless.
export function PreloaderView({
  progress,
  done,
}: {
  progress: number;
  done: boolean;
}) {
  // The wordmark's stroke opacity sweeps left-to-right with the bar: everything
  // left of the progress edge sits at END_OPACITY (0.5 = the resting border
  // opacity, matching --svg-opacity), everything right of it at START_OPACITY.
  // Hard edge, only two values — no opacity fade.
  const START_OPACITY = 0.1;
  const END_OPACITY = 0.5;

  return (
    <div
      aria-hidden
      className={`app-gradient fixed inset-0 z-[200] flex flex-col items-center justify-center transition-opacity duration-500 ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* --pw drives both the logo (w-full) and the bar (w-full) so the whole
          mark scales from one value: 264px on mobile, 418px from md up. */}
      <div className="flex w-[var(--pw)] flex-col items-center gap-3 [--pw:264px] md:[--pw:418px]">
        {/* Two copies of the wordmark, one at each opacity, clipped to
            complementary halves of the width so they never overlap (no alpha
            accumulation). The clip edge sits at `progress` and transitions on the
            same 220ms ease-out staging as the bar, so the stroke "fills in" from
            the left in lockstep with it. */}
        <div className="relative w-full">
          {/* Reached: final opacity, left of the edge. */}
          <div
            className="w-full transition-[clip-path] duration-[220ms] ease-out"
            style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
          >
            <HirotaLogo
              className="w-full text-black"
              opacity={END_OPACITY}
              aria-label="HIROTA"
            />
          </div>
          {/* Pending: low opacity, right of the edge. */}
          <div
            aria-hidden
            className="absolute inset-0 w-full transition-[clip-path] duration-[220ms] ease-out"
            style={{ clipPath: `inset(0 0 0 ${progress}%)` }}
          >
            <HirotaLogo className="w-full text-black" opacity={START_OPACITY} />
          </div>
        </div>
        <div className="h-[3px] w-full overflow-hidden border border-border">
          <div
            // duration-[220ms] must match SEG_MS in Preloader.tsx.
            className="h-full bg-foreground-strong transition-[width] duration-[220ms] ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
