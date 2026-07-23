// Floating copyright footer, pinned to the bottom-left corner of the viewport.
// Desktop-only (md and up); the mobile shell has its own chrome. Natural width,
// single line (whitespace-nowrap), 12px, foreground colour, over a glassmorphism
// surface (translucent white + backdrop blur) matching the sticky headers.
export function DesktopFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="hidden md:block fixed bottom-0 left-0 z-40 whitespace-nowrap backdrop-blur-md py-[2px] px-[4px] text-[10.5px] 2xl:text-[11.5px] leading-none text-foreground select-none">
      {year} © HIROTA CO., LTD. All Rights Reserved.
    </footer>
  );
}
