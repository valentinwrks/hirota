"use client";

import { useEffect } from "react";

// Site-wide deterrent against casually saving imagery. Cancels the context
// menu (right-click → "Save image as…", "Open image in new tab") whenever it
// is opened over an <img> or any element inside an <svg>. Dragging and text
// selection on images are blocked via CSS in globals.css.
//
// This is intentionally a light deterrent only: anyone with DevTools or the
// Network tab can still fetch the asset. There is no way to truly prevent that
// on the web. Mounted once in the root layout so it covers storefront + admin.
export function ImageGuard() {
  useEffect(() => {
    function onContextMenu(event: MouseEvent) {
      const target = event.target as Element | null;
      if (target?.closest("img, svg")) {
        event.preventDefault();
      }
    }
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  return null;
}
