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
  return (
    <div
      aria-hidden
      className={`app-gradient fixed inset-0 z-[200] flex flex-col items-center justify-center transition-opacity duration-500 ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* --pw drives both the logo (w-full) and the bar (w-[85%]) so the whole
          mark scales from one value: 305px on mobile, 418px from md up. */}
      <div className="flex w-[var(--pw)] flex-col items-center gap-3 [--pw:305px] md:[--pw:418px]">
        <HirotaLogo className="w-full text-black" aria-label="HIROTA" />
        <div className="h-[3px] w-[85%] overflow-hidden rounded-full border border-border">
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
