"use client";

import type { ReactNode } from "react";
import { useMobileChrome, type MobileView } from "./MobileChromeProvider";

// Wraps the about / cart columns so they exist ONCE in the tree but render two
// ways: on md+ the wrapper is display:contents (the column stays a direct flex
// child of <main> — desktop untouched); below md it becomes a full-screen
// overlay under the TopBar, shown only while its view is active. The shop column
// stays mounted underneath, so scroll position survives.
//
// The cart overlay opens OVER shop content, so it gets a frosted white backdrop
// to obscure the grid behind it. The about overlay IS the `/` landing: it paints
// the app's animated gradient (`app-gradient`) so it shows the same background
// the user sees elsewhere while still being OPAQUE — otherwise the shop section
// bar stacked directly behind it (same 26px strip) bleeds through and the about
// header's backdrop-blur smears it. On md+ the wrapper is display:contents, so
// neither surface paints there (the columns sit on the body gradient directly).
export function MobilePanel({
  view,
  children,
}: {
  view: Exclude<MobileView, null>;
  children: ReactNode;
}) {
  const { view: active } = useMobileChrome();
  const open = active === view;
  const surface =
    view === "cart" ? " max-md:bg-white/80 max-md:backdrop-blur-md" : " app-gradient";

  return (
    <div
      className={
        "md:contents max-md:fixed max-md:inset-x-0 max-md:top-[26px] max-md:bottom-0 max-md:z-40" +
        surface +
        (open ? "" : " max-md:hidden")
      }
    >
      {children}
    </div>
  );
}
