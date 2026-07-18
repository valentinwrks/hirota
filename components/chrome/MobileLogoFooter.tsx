// Decorative HIROTA wordmark closing off mobile views (md:hidden — desktop keeps
// its three-column chrome, no footer). Rendered at the very bottom of every
// mobile section EXCEPT the "Your product" panel of the configurators and the
// cart view. Spans 95% of the viewport width, centred. `max-w-full` keeps it
// from overflowing its padded container on the narrowest phones.
export function MobileLogoFooter() {
  return (
    <div className="md:hidden pb-5 flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hirota/logo-unflavored.svg"
        alt=""
        aria-hidden="true"
        className="w-[96vw] max-w-full select-none opacity-45"
      />
    </div>
  );
}
