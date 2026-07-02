"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart/CartProvider";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import {
  indexPricingData,
  obiEmbroideryKey,
  obiPriceKey,
  type ObiEmbroideryPriceRow,
  type ObiPriceRow,
  type ObiSizeRow,
  type PricingTables,
} from "@/lib/pricing/data";
import { priceLineItem, validateConfig } from "@/lib/pricing/engine";
import type { ObiColor, ObiConfig, ObiMaterial, ObiWidth, Thread } from "@/lib/pricing/types";
import {
  COLOR_MATERIALS,
  MATERIAL_WIDTHS,
  OBI_COLOR_GROUPS,
  OBI_MATERIALS,
  OBI_THREAD_COLORS,
  OBI_WIDTHS,
  isOtherColor,
  metallicAllowed,
  offeredSizes,
  threadCategory,
  type ObiThreadColor,
} from "@/lib/obi/model";
import type { LabelOption } from "@/lib/obi/queries";

// The obi configurator (Pattern B2). A client component: it runs the PURE
// pricing engine against the reference data passed as props (no Supabase here,
// no per-keystroke round trip — AGENTS §6). The dependency chain color →
// material → width → size cascades; changing any upstream axis reconciles every
// downstream selection. All price math lives in the engine; this only reads its
// itemized breakdown for the live subtotal (§10).

interface ObiState {
  color?: ObiColor;
  material?: ObiMaterial;
  widthCm?: ObiWidth;
  sizeCode?: number;
  endAText: string;
  endBText: string;
  /** Global thread color for BOTH ends (its category drives embroidery pricing).
   *  Undefined until the buyer explicitly picks one (no default selection). */
  threadColor?: ObiThreadColor;
  labelId: number;
}

/** Count embroidery characters (code-point aware for kanji/katakana). */
function charCount(text: string): number {
  return [...text.trim()].length;
}

export function ObiConfigurator({
  obiSizes,
  obiPrices,
  obiEmbroideryPrices,
  labels,
}: {
  obiSizes: ObiSizeRow[];
  obiPrices: ObiPriceRow[];
  obiEmbroideryPrices: ObiEmbroideryPriceRow[];
  labels: LabelOption[];
}) {
  const t = useTranslations("Obi");
  const { format } = useCurrency();
  const { addItem } = useCart();

  // Rebuild the engine's indexed PricingData once from the raw rows. Only the
  // obi tables are populated; the engine's obi path touches nothing else.
  const data = useMemo(() => {
    const tables: PricingTables = {
      giModels: [],
      sizeCharts: [],
      giStandardPrices: [],
      giCustomBasePrices: [],
      giOptions: [],
      giHemPrices: [],
      giHighWaistPrices: [],
      giEmbroideryPrices: [],
      obiSizes,
      obiPrices,
      obiEmbroideryPrices,
      products: [],
    };
    return indexPricingData(tables);
  }, [obiSizes, obiPrices, obiEmbroideryPrices]);

  const defaultLabelId = labels.find((l) => l.name === "Hirota")?.id ?? labels[0]?.id ?? 1;

  const [state, setState] = useState<ObiState>({
    endAText: "",
    endBText: "",
    labelId: defaultLabelId,
  });
  const [justAdded, setJustAdded] = useState(false);

  // Reconcile downstream axes + threads whenever an upstream axis changes. Pure
  // over `data`; nulls out any selection no longer offered by its parent.
  const reconcile = useCallback(
    (s: ObiState): ObiState => {
      const { color } = s;
      let { material, widthCm, sizeCode, threadColor, endAText, endBText } = s;

      if (color == null) {
        material = undefined;
      } else if (material != null && !COLOR_MATERIALS[color].includes(material)) {
        material = undefined;
      }

      if (material == null) {
        widthCm = undefined;
      } else if (widthCm != null && !MATERIAL_WIDTHS[material].includes(widthCm)) {
        widthCm = undefined;
      }

      if (color == null || material == null || widthCm == null) {
        sizeCode = undefined;
      } else if (
        sizeCode != null &&
        !offeredSizes(data, color, material, widthCm).includes(sizeCode)
      ) {
        sizeCode = undefined;
      }

      // Colored ("Other") belts cannot be embroidered at all — clear any text
      // and drop the thread selection (§8.3).
      if (color != null && isOtherColor(color)) {
        endAText = "";
        endBText = "";
        threadColor = undefined;
      }

      return { ...s, color, material, widthCm, sizeCode, threadColor, endAText, endBText };
    },
    [data],
  );

  const update = useCallback(
    (patch: Partial<ObiState>) => setState((s) => reconcile({ ...s, ...patch })),
    [reconcile],
  );

  // Every table is rendered in full from the start; options become muted +
  // blocked as upstream selections exclude them (rather than appearing/hiding).
  // "Ready" = the axis an option depends on has been chosen. An option is
  // selectable only when its upstream is ready AND it is valid; excluded when
  // upstream is ready but it is invalid; otherwise pending (neutral, inert).
  const colorReady = state.color != null;
  const materialReady = state.material != null;
  const sizeUpstreamReady =
    state.color != null && state.material != null && state.widthCm != null;

  const availableSizes = useMemo(
    () =>
      sizeUpstreamReady
        ? new Set(offeredSizes(data, state.color!, state.material!, state.widthCm!))
        : new Set<number>(),
    [data, sizeUpstreamReady, state.color, state.material, state.widthCm],
  );

  // All 14 sizes (#0–#13) with their cm length, always shown, sorted.
  const allSizes = useMemo(
    () => [...data.obiSizes.entries()].sort((a, b) => a[0] - b[0]),
    [data],
  );

  // Widths still reachable given the current upstream. A color can already block
  // a width before a material is chosen: every "Other" color (white–brown) is
  // Nami-only, so 4.5cm (special) is excluded the moment such a color is picked.
  // black/blue/red keep both widths possible until a material narrows them.
  const possibleWidths = useMemo<Set<ObiWidth>>(() => {
    if (state.material != null) return new Set(MATERIAL_WIDTHS[state.material]);
    if (state.color != null) {
      const set = new Set<ObiWidth>();
      for (const m of COLOR_MATERIALS[state.color]) {
        for (const w of MATERIAL_WIDTHS[m]) set.add(w);
      }
      return set;
    }
    return new Set(OBI_WIDTHS);
  }, [state.color, state.material]);

  const metallicOn = state.color != null && metallicAllowed(state.color);
  // Colored belts (white–brown) cannot be embroidered; allowed otherwise.
  const embroideryAllowed = !(state.color != null && isOtherColor(state.color));

  // Per-character embroidery rate for a thread category at the chosen width.
  // Null until a width is picked (like Size, prices appear once width is set).
  const embroideryRate = (category: Thread): number | null => {
    if (state.widthCm == null) return null;
    return data.obiEmbroidery.get(obiEmbroideryKey(state.widthCm, category)) ?? null;
  };

  // Thread pricing category, or null until a thread color is chosen.
  const thread = state.threadColor != null ? threadCategory(state.threadColor) : null;
  const endAChars = charCount(state.endAText);
  const endBChars = charCount(state.endBText);

  // Build the resolved engine config once every axis is chosen. Memoized so the
  // live-price useMemo below doesn't recompute on unrelated renders.
  const config: ObiConfig | null = useMemo(
    () =>
      state.color && state.material && state.widthCm != null && state.sizeCode != null
        ? {
            kind: "obi",
            color: state.color,
            material: state.material,
            widthCm: state.widthCm,
            sizeCode: state.sizeCode,
            // An end is only priced once it has text AND a thread is chosen.
            embroideryEndA:
              endAChars > 0 && thread != null ? { chars: endAChars, thread } : undefined,
            embroideryEndB:
              endBChars > 0 && thread != null ? { chars: endBChars, thread } : undefined,
          }
        : null,
    [
      state.color,
      state.material,
      state.widthCm,
      state.sizeCode,
      thread,
      endAChars,
      endBChars,
    ],
  );

  // Live itemized breakdown from the pure engine (never recomputed in JSX).
  const breakdown = useMemo(() => {
    if (!config) return null;
    if (!validateConfig(config, data).ok) return null;
    return priceLineItem(config, data);
  }, [config, data]);

  const canAdd = config != null && breakdown != null && !breakdown.quote;

  const labelName = labels.find((l) => l.id === state.labelId)?.name ?? "Hirota";
  const colorName = (c: ObiColor) => t(`colors.${c}`);
  const materialName = (m: ObiMaterial) => t(`materials.${m}`);
  const widthLabel = (w: ObiWidth) => (w === 4 ? t("widthNormal") : t("widthSpecial"));

  // Per-size price for display (a direct lookup of a stored cell — not math).
  const sizePrice = (sizeCode: number): number | null => {
    if (!state.color || !state.material || state.widthCm == null) return null;
    return (
      data.obiPrices.get(
        obiPriceKey(state.color, state.material, state.widthCm, sizeCode),
      ) ?? null
    );
  };

  // Right-panel "selected features": localized labels paired positionally with
  // the engine's breakdown amounts (base, then present ends — matching priceObi).
  const features: { label: string; amountJpy?: number }[] = [];
  if (breakdown && state.color && state.material && state.widthCm != null && state.sizeCode != null) {
    let i = 0;
    features.push({
      label: `${colorName(state.color)} · ${materialName(state.material)} · ${widthLabel(state.widthCm)} · #${state.sizeCode}`,
      amountJpy: breakdown.lines[i++]?.amountJpy,
    });
    if (endAChars > 0) {
      features.push({
        label: `${t("endA")}: ${state.endAText.trim()} (${endAChars} ${t("chars")})`,
        amountJpy: breakdown.lines[i++]?.amountJpy,
      });
    }
    if (endBChars > 0) {
      features.push({
        label: `${t("endB")}: ${state.endBText.trim()} (${endBChars} ${t("chars")})`,
        amountJpy: breakdown.lines[i++]?.amountJpy,
      });
    }
    features.push({ label: `${t("label")}: ${labelName}` });
  }

  function handleAdd() {
    if (!config || !breakdown || breakdown.quote || breakdown.unitSubtotalJpy == null) return;
    addItem({
      kind: "configured",
      productId: 0, // obi is configured, not a `products` row; 0 = sentinel.
      name: { en: "Obi", ja: "帯" },
      unitPriceJpy: breakdown.unitSubtotalJpy,
      config: {
        kind: "obi",
        config,
        breakdown,
        summary: {
          colorKey: config.color,
          materialKey: config.material,
          widthCm: config.widthCm,
          sizeCode: config.sizeCode,
          endAChars,
          endBChars,
          // Thread color only matters for fulfilment when something is embroidered.
          threadColorKey: endAChars > 0 || endBChars > 0 ? state.threadColor : undefined,
          labelName,
        },
      },
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div className="flex w-full">
      {/* ---------------------------------------------------------------- */}
      {/* LEFT — the dependency chain + options                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="basis-[55%] pt-2 px-2.5 pb-5 leading-tight">
        {/* Color — no upstream: always selectable. Grouped by grade/use, each
            group captioned like the legacy "jacket/pants measurements" subtitles. */}
        <p className="text-lg font-bold mb-1">{t("color")}</p>
        {OBI_COLOR_GROUPS.map((group, gi) => (
          <div key={group.titleKey}>
            <p className={"text-xs mb-1 text-ink/50 " + (gi === 0 ? "" : "pt-2")}>
              {t(`colorGroups.${group.titleKey}`)}
            </p>
            <OptionTable>
              {group.colors.map((c) => (
                <OptionRow
                  key={c}
                  selected={state.color === c}
                  selectable
                  onClick={() => update({ color: c })}
                >
                  {colorName(c)}
                </OptionRow>
              ))}
            </OptionTable>
          </div>
        ))}

        {/* Material — depends on color; incompatible materials mute once a
            color is chosen. */}
        <p className="text-lg font-bold pt-5 mb-2">{t("material")}</p>
        <OptionTable>
          {OBI_MATERIALS.map((m) => {
            const valid = colorReady && COLOR_MATERIALS[state.color!].includes(m);
            return (
              <OptionRow
                key={m}
                selected={state.material === m}
                selectable={valid}
                blocked={colorReady && !valid}
                onClick={() => update({ material: m })}
              >
                {materialName(m)}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* Width — depends on material; e.g. Nami mutes 4.5cm. */}
        <p className="text-lg font-bold pt-5 mb-2">{t("width")}</p>
        <OptionTable>
          {OBI_WIDTHS.map((w) => {
            const valid = materialReady && MATERIAL_WIDTHS[state.material!].includes(w);
            // A color alone can already exclude a width (Other → no 4.5cm).
            const blocked = colorReady && !possibleWidths.has(w);
            return (
              <OptionRow
                key={w}
                selected={state.widthCm === w}
                selectable={valid}
                blocked={blocked}
                onClick={() => update({ widthCm: w })}
              >
                {widthLabel(w)}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* Size — all #0–#13 with cm always shown. Not selectable until color +
            material + width are set; then prices appear, unavailable sizes mute. */}
        <p className="text-lg font-bold pt-5 mb-2">{t("size")}</p>
        <OptionTable>
          {allSizes.map(([code, lengthCm]) => {
            const valid = availableSizes.has(code);
            const p = valid ? sizePrice(code) : null;
            return (
              <OptionRow
                key={code}
                selected={state.sizeCode === code}
                selectable={valid}
                blocked={sizeUpstreamReady && !valid}
                price={p != null ? format(p) : undefined}
                onClick={() => update({ sizeCode: code })}
              >
                {t("sizeRow", { code, length: lengthCm })}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* Embroidery (optional). One thread color is chosen globally for both
            ends; metallic mutes until an eligible belt is picked. Colored belts
            (white–brown) cannot be embroidered — the whole section blocks. */}
        <p className="text-lg font-bold pt-5 mb-1">{t("embroidery")}</p>
        {!embroideryAllowed && (
          <p className="text-[11px] italic text-ink/40 mb-1">{t("noEmbroideryNote")}</p>
        )}

        {/* thread color (single table, prices per character). Every option stays
            pending until a width sets the per-character price; then standard
            colors are selectable and metallic ones mute unless the belt allows
            them. Colored belts block the whole table. */}
        <p className="text-xs mb-1 text-ink/50">{t("threadColorTitle")}</p>
        <OptionTable>
          {OBI_THREAD_COLORS.map((tc) => {
            const isMetallic = threadCategory(tc) === "metallic";
            const rate = embroideryRate(threadCategory(tc));
            // Blocked on a colored belt, or a metallic thread the belt can't use.
            const blocked =
              !embroideryAllowed || (rate != null && isMetallic && !metallicOn);
            // Selectable only once a price exists (width chosen) and not blocked.
            const selectable = embroideryAllowed && rate != null && !blocked;
            return (
              <OptionRow
                key={tc}
                selected={embroideryAllowed && state.threadColor === tc}
                selectable={selectable}
                blocked={blocked}
                price={rate != null ? `+ ${format(rate)} ${t("perChar")}` : undefined}
                onClick={() => update({ threadColor: tc })}
              >
                {t(`threadColors.${tc}`)}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* the two embroidery ends, flush in one table (no per-input thread). */}
        <p className="text-xs mb-1 text-ink/50 pt-2">{t("embroiderySubtitle")}</p>
        <OptionTable>
          <EmbroideryInputRow
            label={t("endA")}
            text={state.endAText}
            onText={(v) => update({ endAText: v })}
            placeholder={t("embroideryPlaceholder")}
            disabled={!embroideryAllowed}
          />
          <EmbroideryInputRow
            label={t("endB")}
            text={state.endBText}
            onText={(v) => update({ endBText: v })}
            placeholder={t("embroideryPlaceholder")}
            disabled={!embroideryAllowed}
          />
        </OptionTable>

        {/* Label — free, defaults to Hirota. Always available. */}
        <p className="text-lg font-bold pt-5 mb-2">{t("label")}</p>
        <OptionTable>
          {labels.map((l) => (
            <OptionRow
              key={l.id}
              selected={state.labelId === l.id}
              selectable
              onClick={() => update({ labelId: l.id })}
            >
              {l.name}
            </OptionRow>
          ))}
        </OptionTable>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* RIGHT — figure placeholder, material blurb, live features + CTA  */}
      {/* ---------------------------------------------------------------- */}
      <div className="basis-[45%] flex flex-col mt-8 mb-5 mx-8 min-w-0">
        {/* Obi figure placeholder (no art yet). */}
        <div className="border border-line aspect-[3/1] flex items-center justify-center text-ink/25 text-xs uppercase tracking-widest select-none">
          {t("figurePlaceholder")}
        </div>

        {/* Chosen material blurb. */}
        {state.material && (
          <div className="mt-6">
            <p className="text-lg font-bold leading-tight mb-1">{materialName(state.material)}</p>
            <p className="text-xs leading-tight text-ink/50">
              {t(`materialDesc.${state.material}`)}
            </p>
          </div>
        )}

        {/* Live selected features. */}
        <div className="flex flex-col mt-4 gap-0.5 leading-tight text-[11px] text-ink/40">
          {features.length === 0 ? (
            <p className="italic">{t("startPrompt")}</p>
          ) : (
            features.map((f, idx) => (
              <div key={idx} className="flex justify-between gap-2">
                <p className="min-w-0">{f.label}</p>
                {f.amountJpy != null && (
                  <p className="whitespace-nowrap">{format(f.amountJpy)}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Subtotal. */}
        <div className="flex justify-between mt-2.5">
          <p className="text-lg font-bold leading-tight">{t("subtotal")}</p>
          <p className="text-lg font-bold leading-tight">
            {breakdown?.unitSubtotalJpy != null ? format(breakdown.unitSubtotalJpy) : "—"}
          </p>
        </div>

        {/* Add to cart. */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className={
            "mt-2.5 text-xs font-bold bg-transparent border tracking-wide py-1 " +
            (canAdd
              ? "text-ink/50 border-line hover:bg-ink/10 cursor-pointer"
              : "text-ink/25 border-line-soft cursor-not-allowed")
          }
        >
          {justAdded ? t("added") : t("addToCart")}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational primitives — the legacy option-table look (circle radios,
// selected = bg-ink/60 text-paper, hover = bg-ink/10).
// ---------------------------------------------------------------------------

function OptionTable({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse text-xs font-bold">
      <tbody>{children}</tbody>
    </table>
  );
}

// One option row. Visual states:
//   • selected  — highlighted (bg-ink/60 text-paper).
//   • blocked   — excluded by an upstream choice: muted + struck through, inert.
//   • selectable— upstream ready and valid: neutral, hover, clickable.
//   • pending   — upstream not chosen yet: neutral-dim, inert (no muting).
// Only a selectable, non-selected row responds to clicks.
function OptionRow({
  selected,
  selectable = false,
  blocked = false,
  onClick,
  price,
  children,
}: {
  selected: boolean;
  selectable?: boolean;
  blocked?: boolean;
  onClick: () => void;
  price?: string;
  children: React.ReactNode;
}) {
  const clickable = selectable && !selected;

  const cellState = selected
    ? "bg-ink/60 text-paper"
    : blocked
      ? "text-ink/20 cursor-not-allowed"
      : selectable
        ? "text-ink/50 hover:bg-ink/10 cursor-pointer"
        : "text-ink/40 cursor-default"; // pending

  return (
    <tr onClick={clickable ? onClick : undefined}>
      <td className={"px-2 py-1 border border-line " + cellState}>
        <div className="flex items-center justify-between gap-2">
          <span className={blocked ? "line-through" : ""}>{children}</span>
          <div className="flex items-center gap-2">
            {price && <span>{price}</span>}
            <span
              className={
                "relative w-[8px] h-[8px] rounded-full border flex items-center justify-center " +
                (selected ? "border-paper" : blocked ? "border-ink/20" : "border-ink/50")
              }
            >
              {selected && <span className="w-[4px] h-[4px] rounded-full bg-paper" />}
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}

// One embroidery end as a table row (thread is chosen globally, so no per-input
// selector). Visual states mirror the legacy input rows:
//   • completed (has text) → bg-ink/60 with white text.
//   • otherwise            → hover / focus-within tints bg-ink/10.
//   • disabled (colored belt) → muted + not editable.
function EmbroideryInputRow({
  label,
  text,
  onText,
  placeholder,
  disabled = false,
}: {
  label: string;
  text: string;
  onText: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  // "completed" only after the buyer leaves the field (blur), not mid-typing.
  const completed = !focused && text.trim().length > 0;
  const cellState = disabled
    ? "text-ink/20 cursor-not-allowed"
    : completed
      ? "bg-ink/60 text-paper"
      : "hover:bg-ink/10 focus-within:bg-ink/10";

  return (
    <tr>
      <td className={"px-2 py-1 border border-line " + cellState}>
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <input
            type="text"
            value={text}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => onText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label={label}
            className="flex-1 text-right bg-transparent focus:outline-none disabled:cursor-not-allowed"
          />
        </div>
      </td>
    </tr>
  );
}
