"use client";

import type { ReactNode } from "react";
import { useMobileChrome, type MobileView } from "./MobileChromeProvider";

// Wraps the about / cart columns so they exist ONCE in the tree but render two
// ways: on md+ the wrapper is display:contents (the column stays a direct flex
// child of <main> — desktop untouched); below md it becomes a full-screen
// frosted overlay under the TopBar, shown only while its view is active. The
// shop column stays mounted underneath, so scroll position survives.
export function MobilePanel({
  view,
  children,
}: {
  view: Exclude<MobileView, null>;
  children: ReactNode;
}) {
  const { view: active } = useMobileChrome();
  const open = active === view;

  return (
    <div
      className={
        "md:contents max-md:fixed max-md:inset-x-0 max-md:top-[26px] max-md:bottom-0 max-md:z-40 max-md:bg-white/80 max-md:backdrop-blur-md" +
        (open ? "" : " max-md:hidden")
      }
    >
      {children}
    </div>
  );
}
