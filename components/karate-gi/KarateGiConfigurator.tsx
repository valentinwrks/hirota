"use client";

import { useTranslations } from "next-intl";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import type {
  GiCustomBasePriceRow,
  GiEmbroideryPriceRow,
  GiHemPriceRow,
  GiHighWaistPriceRow,
  GiModelRow,
  GiOptionRow,
  GiStandardPriceRow,
  SizeChartRow,
} from "@/lib/pricing/data";
import type { LabelOption } from "@/lib/obi/queries";
import { GiStandardConfigurator } from "@/components/gi-standard/GiStandardConfigurator";
import { GiCustomConfigurator } from "@/components/gi-custom/GiCustomConfigurator";

// The unified /karate-gi entry point. Renders the "Karate-gi Tailoring" mode
// selector (ready-made vs fully-tailored) and mounts the matching configurator,
// passing the selector down as the form's FIRST field (`headerField`) so it
// lives inside the configurator's left column — and inside the mobile
// "configurator" panel. The two configurators keep their own separate
// localStorage state, so switching modes never loses the other mode's progress.

type TailoringMode = "ready-made" | "fully-tailored";

/** Reference data bundles, mirroring each configurator's own props. */
export interface GiStandardData {
  giModels: GiModelRow[];
  sizeCharts: SizeChartRow[];
  giStandardPrices: GiStandardPriceRow[];
  giOptions: GiOptionRow[];
  giEmbroideryPrices: GiEmbroideryPriceRow[];
}

export interface GiCustomData {
  giModels: GiModelRow[];
  sizeCharts: SizeChartRow[];
  giCustomBasePrices: GiCustomBasePriceRow[];
  giOptions: GiOptionRow[];
  giHemPrices: GiHemPriceRow[];
  giHighWaistPrices: GiHighWaistPriceRow[];
  giEmbroideryPrices: GiEmbroideryPriceRow[];
}

export function KarateGiConfigurator({
  standard,
  custom,
  labels,
}: {
  standard: GiStandardData;
  custom: GiCustomData;
  labels: LabelOption[];
}) {
  const t = useTranslations("KarateGi");

  // Persisted like every other form (default ready-made). A real radio: one
  // mode is ALWAYS active — clicking the selected row is a no-op, never a
  // deselect.
  const [state, setState] = usePersistentState<{ mode: TailoringMode }>(
    "hirota:config:karate-gi",
    { mode: "ready-made" },
  );

  const headerField = (
    <>
      <p className="text-lg font-bold mb-[3px]">{t("orderType")}</p>
      <p className="text-xs text-foreground leading-tight mb-2">
        {t("orderTypeNote")}
      </p>
      <table className="w-full border-collapse text-xs font-bold">
        <tbody>
          <ModeRow
            selected={state.mode === "ready-made"}
            onClick={() => setState({ mode: "ready-made" })}
          >
            {t("readyMade")}
          </ModeRow>
          <ModeRow
            selected={state.mode === "fully-tailored"}
            onClick={() => setState({ mode: "fully-tailored" })}
          >
            {t("fullyTailored")}
          </ModeRow>
        </tbody>
      </table>
    </>
  );

  return state.mode === "ready-made" ? (
    <GiStandardConfigurator
      {...standard}
      labels={labels}
      headerField={headerField}
    />
  ) : (
    <GiCustomConfigurator
      {...custom}
      labels={labels}
      headerField={headerField}
    />
  );
}

// A trimmed copy of the configurators' OptionRow (kept local, matching their
// own duplication pattern): always selectable, so only the selected/selectable
// visual states exist — no blocked/pending/price.
function ModeRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <tr onClick={onClick}>
      <td
        className={
          "group px-2 py-1 border border-double border-border cursor-pointer " +
          (selected
            ? "bg-foreground-selected text-background"
            : "text-foreground hover:bg-foreground-hover")
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span>{children}</span>
          <span
            className={
              "relative w-[8px] h-[8px] rounded-full border flex items-center justify-center " +
              (selected ? "border-background" : "border-foreground")
            }
          >
            {selected ? (
              <span className="w-[4px] h-[4px] rounded-full bg-background" />
            ) : (
              <span className="hidden group-hover:block w-[4px] h-[4px] rounded-full bg-foreground" />
            )}
          </span>
        </div>
      </td>
    </tr>
  );
}
