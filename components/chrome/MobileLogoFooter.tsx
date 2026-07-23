import { HirotaWordmark } from "./HirotaWordmark";

// Decorative HIROTA wordmark heading the about column. Shown on mobile AND on
// the three-column desktop layout (md–2xl); dropped from 2xl up, where the
// dedicated vertical-logo band (LogoColumn, `hidden 2xl:flex`) appears and would
// otherwise double the mark. The mark fills its container (`w-full`) inside the
// same side margins as the column content (`mx-2` = 8px mobile, `md:mx-1.5` =
// 6px desktop), so its edges line up with the text below. Inlined as SVG (not
// <img>) so its outline stays a constant 0.8px stroke across viewports.
export function MobileLogoFooter() {
  return (
    <div className="2xl:hidden pt-2.5 md:pt-2 pb-1 mx-2 md:mx-1.5">
      <HirotaWordmark className="w-full h-auto select-none opacity-50" />
    </div>
  );
}
