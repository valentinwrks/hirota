// Stroke-based inline icons for the mobile chrome. Drawn with currentColor so
// they follow the host button's text-color states (foreground / -strong), and
// thin strokes to sit with the site's 1px-border spreadsheet look.

type IconProps = { className?: string };

// Minimalist bag: a sharp-cornered trapezoidal body (23 wide at the base, 19 at
// the top, 16 tall) with a handle made of two short vertical legs (3px) rising off
// the top edge into a semicircle (r 4.5) that floats 3px clear of the body.
// currentColor stroke, miter joins for crisp corners. The viewBox is sized so the
// artwork's proportions render true; the body's bottom-right corner sits near the
// box corner — where the count badge anchors (see StoreMobileNav).
export function ShoppingBagIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 26 26"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 8.5H22.5L24.5 24.5H1.5Z" />
      <path d="M8.5 8.5V5.5a4.5 4.5 0 0 1 9 0V8.5" />
    </svg>
  );
}

// Hamburger — flat (butt) line caps, per design.
export function MenuIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function CloseIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// Caret for custom dropdown triggers (the native <select> arrow's replacement).
export function ChevronDownIcon({ className = "w-3 h-3" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
