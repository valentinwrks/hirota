"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Panel = "configurator" | "product";

// Shared two-column shell for the configurators (custom gi, standard gi, obi).
// On desktop the two panels sit side by side — 60% the configuration form
// (`left`), 40% the live product/price summary (`right`). Below md they no
// longer stack top-to-bottom; instead a segmented switch pinned under the shop
// header toggles which single panel is shown, so the long form and the summary
// each get the full width (mirrors the "configurator / your product" tabs).
export function ConfiguratorLayout({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  const t = useTranslations("Configurator");
  const [panel, setPanel] = useState<Panel>("configurator");

  // Each segment mirrors a form cell exactly: px-2 py-1, text-xs font-bold, the
  // same border tone — so the switch reads as one row of the "spreadsheet".
  const tab = (value: Panel, label: string, divider = false) => (
    <button
      type="button"
      onClick={() => setPanel(value)}
      aria-pressed={panel === value}
      className={
        "px-2 py-1 text-xs font-bold tracking-wide text-center cursor-pointer " +
        (divider ? "border-l border-border " : "") +
        (panel === value
          ? "bg-foreground-selected text-background"
          : "text-foreground hover:bg-foreground-hover")
      }
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col w-full">
      {/* Mobile-only panel switch. Sticky at the top of the shop scroll area
          (right under the TopBar, since the mobile shop section bar is gone) so
          it stays reachable while scrolling a long form. Hidden from md up, where
          both panels render side by side. The px-2.5 inset + full-width bordered
          box match a form cell's edge padding, width and height. */}
      <div className="md:hidden sticky top-0 z-[5] px-2.5 pt-2.5 pb-1 backdrop-blur-md">
        <div className="grid grid-cols-2 border border-border">
          {tab("configurator", t("configurator"))}
          {tab("product", t("yourProduct"), true)}
        </div>
      </div>

      <div className="flex w-full max-md:flex-col">
        {/* LEFT — the configuration form. Full width on mobile when active. */}
        <div
          className={
            "basis-[60%] max-md:basis-auto pt-2 px-2.5 pb-10 max-md:pb-16 leading-tight " +
            (panel === "configurator" ? "" : "max-md:hidden")
          }
        >
          {left}
        </div>

        {/* RIGHT — figure, model info, live features + CTA. */}
        <div
          className={
            "basis-[40%] max-md:basis-auto flex flex-col mt-8 max-md:mt-4 mb-5 max-md:mb-16 mx-8 max-md:mx-2.5 min-w-0 " +
            (panel === "product" ? "" : "max-md:hidden")
          }
        >
          {right}
        </div>
      </div>
    </div>
  );
}
