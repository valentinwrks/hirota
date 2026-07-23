// Presentational two-bar hamburger that morphs into an ✕ when `open`: each bar is
// absolutely positioned so it can animate both its vertical offset and its ±45°
// rotation about the box centre. Pure — no state — so both mobile menu triggers
// share it: the store's (MobileMenuButton) and the admin's (AdminMobileNav), each
// owning its own open flag. Inherits colour via `bg-current`.
export function HamburgerIcon({ open }: { open: boolean }) {
  const bar =
    "absolute left-0 right-0 h-[2px] bg-current transition-all duration-300 ease-in-out";
  return (
    <span className="relative block w-[25px] h-[25px]" aria-hidden="true">
      <span
        className={
          bar + (open ? " top-1/2 -translate-y-1/2 rotate-45" : " top-[7px]")
        }
      />
      <span
        className={
          bar + (open ? " top-1/2 -translate-y-1/2 -rotate-45" : " top-[13px]")
        }
      />
    </span>
  );
}
