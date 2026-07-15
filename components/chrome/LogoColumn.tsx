import { HirotaVerticalLogo } from "./HirotaVerticalLogo";

// Far-left decorative column: HIROTA vertical logo band.
// Only shown on very wide screens (2xl+), where the layout expands to the
// four-column arrangement ported from the legacy UI. Hidden below 2xl.
export function LogoColumn() {
  return (
    <section className="hidden 2xl:flex basis-[7.5%] shrink-0 border-r border-border overflow-hidden items-center justify-center">
      {/* Inline (not <img>) so the stroke stays a constant 1px at any height,
          matching the site borders — see HirotaVerticalLogo. */}
      <HirotaVerticalLogo aria-label="HIROTA" className="h-[85vh] text-black select-none" />
    </section>
  );
}
