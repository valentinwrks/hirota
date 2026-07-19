"use client";

import type { ReactNode } from "react";
import { useMobileChrome, type MobileView } from "./MobileChromeProvider";

// Wraps the about / cart columns so they exist ONCE in the tree but render two
// ways: on md+ the wrapper is display:contents (the column stays a direct flex
// child of <main> — desktop untouched); below md it becomes a full-screen
// overlay under the TopBar. The shop column stays mounted underneath, so scroll
// position survives.
//
// The two overlays reveal themselves differently below md:
// - "cart" is a solid-white flap that SLIDES down from behind the TopBar (the
//   same translateY / 300ms material motion as the category menu, see
//   StoreMobileMenu), covering the whole screen edge-to-edge (no rounded bottom).
//   It stays mounted and parked out of view above; opening just drops the
//   transform. Its z sits BELOW the TopBar (z-50) so the opaque bar hides it
//   while parked. Solid white fully obscures the shop grid behind it.
// - "about" IS the `/` landing: it paints the app's animated gradient
//   (`app-gradient`) so it shows the same background the user sees elsewhere
//   while still being OPAQUE — otherwise the shop section bar stacked directly
//   behind it (same 26px strip) bleeds through and the about header's
//   backdrop-blur smears it. It shows/hides instantly (it's the default landing,
//   not a toggled overlay).
// On md+ the wrapper is display:contents, so neither surface paints there (the
// columns sit on the body gradient directly).
export function MobilePanel({
  view,
  children,
}: {
  view: Exclude<MobileView, null>;
  children: ReactNode;
}) {
  const { view: active } = useMobileChrome();
  const open = active === view;

  if (view === "cart") {
    return (
      <div
        aria-hidden={!open}
        inert={!open}
        className={
          "md:contents max-md:fixed max-md:inset-x-0 max-md:top-[26px] max-md:bottom-0 " +
          "max-md:z-[45] max-md:bg-white max-md:transition-all max-md:duration-[450ms] " +
          "max-md:[transition-timing-function:cubic-bezier(0.4,0,0.2,1)] " +
          (open ? "" : "max-md:-translate-y-full max-md:pointer-events-none")
        }
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={
        "md:contents max-md:fixed max-md:inset-x-0 max-md:top-[26px] max-md:bottom-0 max-md:z-40 app-gradient" +
        (open ? "" : " max-md:hidden")
      }
    >
      {children}
    </div>
  );
}
