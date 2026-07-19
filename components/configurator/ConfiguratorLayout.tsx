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
  variant,
  left,
  right,
}: {
  // Drives the two switch labels: gi (custom + standard) reads "dogi", obi
  // reads "obi". The Panel VALUES stay "configurator"/"product" regardless.
  variant: "dogi" | "obi";
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  const t = useTranslations("Configurator");
  const [panel, setPanel] = useState<Panel>("configurator");

  const configuratorLabel =
    variant === "obi" ? t("obiConfigurator") : t("dogiConfigurator");
  const productLabel = variant === "obi" ? t("yourObi") : t("yourDogi");

  // Segments sit ABOVE the sliding pill (z-10) and carry only text — the active
  // fill is the pill behind them, not each button's own background. Keeps the
  // spreadsheet type scale (text-xs font-bold, px-2 py-1) but pill-shaped.
  const tab = (value: Panel, label: string) => (
    <button
      type="button"
      onClick={() => setPanel(value)}
      aria-pressed={panel === value}
      className={
        "relative z-10 px-2 py-px text-xs font-bold tracking-wide text-center " +
        "cursor-pointer rounded-full transition-colors " +
        (panel === value
          ? "text-background"
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
          both panels render side by side. Rounded-full pill switch: the track
          (border) and the active fill are both fully rounded, and the fill is a
          single pill that SLIDES between the two halves on toggle.
          The switch rides on a solid background box (10px inset all round); a
          fade scrim beneath it dissolves the scrolling form content into that
          background as it rises toward the switch — replaces the former
          glassmorphism (backdrop blur). */}
      <div className="md:hidden sticky top-0 z-[5]">
        <div className="px-2.5 py-2.5 bg-background">
          <div className="relative grid grid-cols-2 rounded-full border border-border">
            {/* The sliding fill: a half-width pill filling one cell edge-to-edge
                (no inset), parked behind the labels and translated to the right
                half when "product" is active. */}
            <span
              aria-hidden="true"
              className={
                "pointer-events-none absolute inset-y-0 left-0 w-1/2 " +
                "rounded-full bg-foreground-selected transition-all duration-300 " +
                "[transition-timing-function:cubic-bezier(0.4,0,0.2,1)] " +
                (panel === "product" ? "translate-x-full" : "translate-x-0")
              }
            />
            {tab("configurator", configuratorLabel)}
            {tab("product", productLabel)}
          </div>
        </div>
        {/* Fade scrim: content scrolling up behind the switch fades to zero as it
            nears the switch, dissolving into the background (h-6 fade distance). */}
        <div
          aria-hidden="true"
          className="pointer-events-none h-6 [background:linear-gradient(to_bottom,var(--background),transparent)]"
        />
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
