"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ColumnReveal } from "@/components/chrome/ColumnReveal";

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

  // The panels' top-edge fade (below md) is applied ONLY once the scroll region
  // has moved off its top. At the very top (scrollTop === 0) the mask is dropped
  // so the first heading renders crisp instead of dissolving into the fade band;
  // the fade returns the moment the content scrolls under the switch.
  const [scrolled, setScrolled] = useState(false);

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
        "relative z-10 flex items-center justify-center px-2 text-xs font-bold tracking-wide " +
        "cursor-pointer rounded-full transition-colors " +
        (panel === value ? "text-background" : "text-foreground")
      }
    >
      {label}
    </button>
  );

  return (
    // Below md the shell becomes a bounded flex column that fills the shop
    // scroll area: a non-scrolling switch header on top, and the active panel
    // scrolling in its OWN region below it. It sizes itself to the viewport
    // (100dvh minus the fixed 32px mobile TopBar it sits directly under —
    // the desktop section bar and category nav above it are max-md:hidden) so
    // it doesn't depend on any ancestor carrying a definite height. From md up
    // it stays a plain full-width block that page-scrolls with both panels side
    // by side.
    <div className="flex flex-col w-full max-md:h-[calc(100dvh-32px)] max-md:min-h-0">
      {/* Mobile-only panel switch. A non-scrolling header pinned above the
          panel's own scroll region (no longer sticky-over-content), so nothing
          scrolls BEHIND it — which lets it sit on a transparent background and
          show the body's animated gradient through, instead of an opaque white
          box. Hidden from md up, where both panels render side by side.
          Rounded-full pill switch in the shared PillSwitch visual language: a
          filled (not bordered) track with a single pill that STANDS PROUD of it
          (taller, vertically centred) and SLIDES between the two halves on
          toggle. */}
      <div className="md:hidden shrink-0 px-2 pt-[15px] pb-2.5">
        <div className="relative grid grid-cols-2 h-[22px] rounded-full bg-[rgba(0,0,0,0.1)]">
          {/* The sliding fill: a half-width pill, TALLER than the track so it
              stands proud above and below the thinner band (matching PillSwitch),
              parked behind the labels at the left edge and translated to the
              right half when "product" is active. */}
          <span
            aria-hidden="true"
            className={
              "pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 w-1/2 h-[26px] " +
              "rounded-full bg-foreground-selected transition-transform duration-300 " +
              "[transition-timing-function:cubic-bezier(0.4,0,0.2,1)] " +
              (panel === "product" ? "translate-x-full" : "translate-x-0")
            }
          />
          {tab("configurator", configuratorLabel)}
          {tab("product", productLabel)}
        </div>
      </div>

      {/* Panels — wrapped in ColumnReveal so the scan-in (page load / section
          change) applies to THIS content only; the switch above stays instant,
          since it now lives OUTSIDE the scan mask. On mobile the reveal is the
          flex-1 scroll frame that holds the active panel; from md up it's a
          plain block that page-scrolls with both panels side by side.
          Below md the panels carry a top-edge mask (once scrolled — see
          `scrolled`) so content dissolves to genuine transparency (revealing the
          body gradient) as it nears the switch — the fade that used to be an
          opaque white scrim. */}
      <ColumnReveal className="max-md:flex-1 max-md:min-h-0 max-md:flex max-md:flex-col">
        <div
          onScroll={(e) => {
            const isScrolled = e.currentTarget.scrollTop > 0;
            setScrolled((prev) => (prev === isScrolled ? prev : isScrolled));
          }}
          className={
            "flex w-full max-md:flex-col max-md:flex-1 max-md:min-h-0 max-md:overflow-y-auto max-md:overscroll-contain max-md:scrollbar-none " +
            (scrolled
              ? "max-md:[mask-image:linear-gradient(to_bottom,transparent,black_1.25rem)] max-md:[-webkit-mask-image:linear-gradient(to_bottom,transparent,black_1.25rem)]"
              : "")
          }
        >
          {/* LEFT — the configuration form. Full width on mobile when active. */}
          <div
            className={
              "basis-[60%] max-md:basis-auto pt-2 px-2.5 max-md:px-2 pb-10 max-md:pb-16 leading-tight " +
              (panel === "configurator" ? "" : "max-md:hidden")
            }
          >
            {left}
          </div>

          {/* RIGHT — figure, model info, live features + CTA. */}
          <div
            className={
              "basis-[40%] max-md:basis-auto flex flex-col mt-8 max-md:mt-4 mb-5 max-md:mb-16 mx-8 max-md:mx-2 min-w-0 " +
              (panel === "product" ? "" : "max-md:hidden")
            }
          >
            {right}
          </div>
        </div>
      </ColumnReveal>
    </div>
  );
}
