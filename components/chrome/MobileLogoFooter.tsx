import { HirotaWordmark } from "./HirotaWordmark";

// Decorative HIROTA wordmark heading the about column. Shown on mobile AND on
// the three-column desktop layout (md–2xl); dropped from 2xl up, where the
// dedicated vertical-logo band (LogoColumn, `hidden 2xl:flex`) appears and would
// otherwise double the mark. Spans 96vw on mobile; on the narrow desktop about
// column `max-w-full` clamps it to the column width, with a 6px side gutter
// (md:px-1.5) matching the column content. Inlined as SVG (not <img>) so its
// outline stays a constant 0.8px stroke across viewports.
export function MobileLogoFooter() {
  return (
    <div className="2xl:hidden pt-[15px] pb-[10px] md:px-1.5 flex justify-center">
      <HirotaWordmark className="w-[96vw] max-w-full h-auto select-none opacity-50" />
    </div>
  );
}
