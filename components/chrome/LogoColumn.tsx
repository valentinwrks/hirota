// Far-left decorative column: HIROTA vertical logo band.
// Only shown on very wide screens (2xl+), where the layout expands to the
// four-column arrangement ported from the legacy UI. Hidden below 2xl.
export function LogoColumn() {
  return (
    <section className="hidden 2xl:flex basis-[7.5%] shrink-0 border-r border-border overflow-hidden items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hirota/logo-unflavored-vertical.svg"
        alt="HIROTA"
        className="h-[85vh] opacity-50"
      />
    </section>
  );
}
