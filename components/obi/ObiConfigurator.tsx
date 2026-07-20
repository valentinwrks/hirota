"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import { useCart } from "@/lib/cart/CartProvider";
import { displayLabelName } from "@/lib/cart/format";
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
import { ConfiguratorLayout } from "@/components/configurator/ConfiguratorLayout";

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
  labelId?: number;
}

/** Count embroidery characters (code-point aware for kanji/katakana). */
function charCount(text: string): number {
  return [...text.trim()].length;
}

// Ideograms + romaji for the obi title below the figure. The kanji obi name
// (材質+色+帯, e.g. 並黒帯) is identical in both locales; the romaji feeds only
// the EN title. Structural naming data, not localized copy.
const OBI_COLOR_KANJI: Record<ObiColor, string> = {
  black: "黒",
  blue: "青",
  red: "赤",
  white: "白",
  green: "緑",
  yellow: "黄",
  purple: "紫",
  orange: "橙",
  brown: "茶",
};
const OBI_MATERIAL_KANJI: Record<ObiMaterial, string> = {
  nami: "並",
  shushi: "朱子",
  yohachi: "洋八",
  silk: "本絹",
};
const OBI_COLOR_ROMAJI: Record<ObiColor, string> = {
  black: "Kuro",
  blue: "Ao",
  red: "Aka",
  white: "Shiro",
  green: "Midori",
  yellow: "Ki",
  purple: "Murasaki",
  orange: "Daidai",
  brown: "Cha",
};
const OBI_MATERIAL_ROMAJI: Record<ObiMaterial, string> = {
  nami: "Nami",
  shushi: "Shushi",
  yohachi: "Yōhachi",
  silk: "Silk",
};

// Builds the obi product name for a given locale: kanji name (material + color
// + 帯), plus the romaji reading in EN. Needs at least a color. Width and size
// are intentionally NOT part of the name — they live in the feature description
// and the cart line. Shared by the live panel title and the cart card name.
function buildObiTitle(
  loc: string,
  color: ObiColor | undefined,
  material: ObiMaterial | undefined,
): string | null {
  if (color == null) return null;
  const kanjiName =
    (material != null ? OBI_MATERIAL_KANJI[material] : "") +
    OBI_COLOR_KANJI[color] +
    "帯";
  if (loc === "ja") return kanjiName;
  const romaji =
    (material != null ? OBI_MATERIAL_ROMAJI[material] + " " : "") +
    OBI_COLOR_ROMAJI[color] +
    " Obi";
  // Romaji first, the kanji name trailing in parentheses (e.g. "Nami Kuro Obi (並黒帯)").
  return `${romaji} (${kanjiName})`;
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
  const locale = useLocale();
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

  const [state, setState] = usePersistentState<ObiState>(
    // v2: label is no longer defaulted to Hirota — bumped so pre-existing saved
    // payloads (which still carry the old default labelId) are dropped instead of
    // shallow-merged back in and resurfacing as a selected label.
    "hirota:config:obi:v2",
    {
      endAText: "",
      endBText: "",
      // Label is a required, un-defaulted choice — the buyer must pick one.
    },
  );
  const [justAdded, setJustAdded] = useState(false);

  // Reconcile downstream axes + threads whenever an upstream axis changes. Pure
  // over `data`; nulls out any selection no longer offered by its parent.
  const reconcile = useCallback(
    (s: ObiState): ObiState => {
      const { color } = s;
      let { material, widthCm, sizeCode, threadColor, endAText, endBText, labelId } = s;

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

      // The thread-color table is priced off the width and only offered on
      // non-"Other" belts. Drop the thread selection whenever that table is
      // pending (no width yet) or blocked (a colored belt) — a pending/blocked
      // table must never keep a stale selection (§8.3).
      if (widthCm == null || (color != null && isOtherColor(color))) {
        threadColor = undefined;
      }
      // The end inputs stay pending until a thread color is chosen; with no
      // thread (never chosen, or just cleared above) their text is cleared too,
      // so a pending ends table keeps nothing either.
      if (threadColor == null) {
        endAText = "";
        endBText = "";
      }

      // Label is gated on the width (top-to-bottom UX flow); with no width its
      // table is pending, so drop the selection like every other pending table.
      if (widthCm == null) {
        labelId = undefined;
      }

      return { ...s, color, material, widthCm, sizeCode, threadColor, endAText, endBText, labelId };
    },
    [data],
  );

  const update = useCallback(
    (patch: Partial<ObiState>) => setState((s) => reconcile({ ...s, ...patch })),
    [reconcile, setState],
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
  // Label doesn't depend on width logically, but we gate it on width so the form
  // reads strictly top-to-bottom (UX flow), keeping Label pending until then.
  const labelReady = state.widthCm != null;

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
  // The end inputs stay pending (inert) until a thread color is chosen — you pick
  // the thread first, then type the text it will be stitched in.
  const embroideryPending = embroideryAllowed && state.threadColor == null;

  // Section-header pending: a section's title (and its description, if any) render
  // in the pending tint whenever that section's options are still inert — its
  // upstream axis isn't chosen yet — mirroring the table right below it. The
  // colored-belt embroidery case is instead a *blocked* state (embroideryBlocked
  // below), tinting its headers blocked rather than pending.
  const materialPending = !colorReady;
  const widthPending = !materialReady;
  const sizePending = !sizeUpstreamReady;
  const embroideryHeaderPending = embroideryAllowed && state.widthCm == null;
  const labelPending = !labelReady;
  // A colored ("Other") belt blocks the whole embroidery section (cells + inputs
  // render blocked); its headers/descriptions follow, tinting blocked too.
  const embroideryBlocked = !embroideryAllowed;

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

  // A thread color with nothing written in either end is a meaningless selection
  // (a thread with no embroidery to apply). Require at least one end to have text.
  const threadWithoutText =
    state.threadColor != null && endAChars === 0 && endBChars === 0;

  // Label is required — no default; the buyer must pick one like any other
  // section.
  const labelChosen = state.labelId != null;

  const canAdd =
    config != null &&
    breakdown != null &&
    !breakdown.quote &&
    labelChosen &&
    !threadWithoutText;

  const labelName = labels.find((l) => l.id === state.labelId)?.name ?? "Hirota";
  const colorName = (c: ObiColor) => t(`colors.${c}`);
  const materialName = (m: ObiMaterial) => t(`materials.${m}`);
  const widthLabel = (w: ObiWidth) => (w === 4 ? t("widthNormal") : t("widthSpecial"));
  // Compact forms for the right-panel summary (the table copies are too long).
  const colorShort = (c: ObiColor) => t(`colorsShort.${c}`);
  const materialShort = (m: ObiMaterial) => t(`materialsShort.${m}`);
  const widthShort = (w: ObiWidth) =>
    w === 4 ? t("widthShortNormal") : t("widthShortSpecial");

  // Obi title below the figure: kanji product name (+ romaji in EN) only.
  // Width and size are deliberately omitted here — they're already spelled out
  // in the feature description right below, so repeating them is redundant.
  // Present as soon as a color is chosen.
  const obiTitle = buildObiTitle(locale, state.color, state.material);

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
  const configured =
    state.color != null &&
    state.material != null &&
    state.widthCm != null &&
    state.sizeCode != null;

  // Prompt copy narrows to the axes still missing (first unmet one leads).
  const startPromptKey =
    state.color == null
      ? "startPromptColor"
      : state.material == null
        ? "startPromptMaterial"
        : state.widthCm == null
          ? "startPromptWidth"
          : "startPromptSize";

  // First line builds up progressively as each axis is chosen (color → +material
  // → +width → +size). The base price attaches only once size — and thus a valid
  // breakdown — exists.
  if (state.color != null) {
    const parts = [colorShort(state.color)];
    if (state.material != null) parts.push(materialShort(state.material));
    if (state.widthCm != null) parts.push(widthShort(state.widthCm));
    if (state.sizeCode != null) parts.push(`#${state.sizeCode}`);
    features.push({
      label: parts.join(" · "),
      amountJpy: breakdown?.lines[0]?.amountJpy,
    });
  }

  // Embroidery + label lines appear once fully configured (their amounts follow
  // the base positionally in the breakdown: lines[0] is the base, shown above).
  if (breakdown && configured) {
    let i = 1;
    // "end X embr = <text> (<thread color>)". Thread is always set when an end
    // has text.
    const threadSuffix =
      state.threadColor != null ? ` (${t(`threadColorsShort.${state.threadColor}`)})` : "";
    if (endAChars > 0) {
      features.push({
        label: `${t("endAShort")} = ${state.endAText.trim()}${threadSuffix}`,
        amountJpy: breakdown.lines[i++]?.amountJpy,
      });
    }
    if (endBChars > 0) {
      features.push({
        label: `${t("endBShort")} = ${state.endBText.trim()}${threadSuffix}`,
        amountJpy: breakdown.lines[i++]?.amountJpy,
      });
    }
    if (labelChosen) {
      features.push({ label: t("labelLine", { name: displayLabelName(labelName) }) });
    }
  }

  function handleAdd() {
    if (!canAdd || !config || !breakdown || breakdown.unitSubtotalJpy == null) return;
    addItem({
      kind: "configured",
      productId: 0, // obi is configured, not a `products` row; 0 = sentinel.
      // Cart card title: color + material only (width & size are already named in
      // the summary lines below, so we don't repeat them here).
      name: {
        en: buildObiTitle("en", state.color, state.material) ?? "Obi",
        ja: buildObiTitle("ja", state.color, state.material) ?? "帯",
      },
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
          endAText: endAChars > 0 ? state.endAText.trim() : undefined,
          endBText: endBChars > 0 ? state.endBText.trim() : undefined,
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
    <ConfiguratorLayout
      variant="obi"
      left={
        <>
        {/* Color — no upstream: always selectable. Grouped by grade/use, each
            group captioned like the legacy "jacket/pants measurements" subtitles. */}
        <p className="text-lg font-bold mb-1.5">{t("color")}</p>
        {OBI_COLOR_GROUPS.map((group, gi) => (
          <div key={group.colors[0]}>
            {group.titleKey && (
              <p className={"text-xs mb-1 text-foreground " + (gi === 0 ? "" : "pt-2")}>
                {t(`colorGroups.${group.titleKey}`)}
              </p>
            )}
            <OptionTable>
              {group.colors.map((c) => (
                <OptionRow
                  key={c}
                  selected={state.color === c}
                  selectable
                  onClick={() => update({ color: state.color === c ? undefined : c })}
                >
                  {colorName(c)}
                </OptionRow>
              ))}
            </OptionTable>
          </div>
        ))}

        {/* Material — depends on color; incompatible materials mute once a
            color is chosen. */}
        <p className={"text-lg font-bold pt-5 mb-1.5" + (materialPending ? " text-foreground-pending" : "")}>{t("material")}</p>
        <OptionTable>
          {OBI_MATERIALS.map((m) => {
            const valid = colorReady && COLOR_MATERIALS[state.color!].includes(m);
            return (
              <OptionRow
                key={m}
                selected={state.material === m}
                selectable={valid}
                blocked={colorReady && !valid}
                onClick={() => update({ material: state.material === m ? undefined : m })}
              >
                {materialName(m)}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* Width — depends on material; e.g. Nami mutes 4.5cm. */}
        <p className={"text-lg font-bold pt-5 mb-1.5" + (widthPending ? " text-foreground-pending" : "")}>{t("width")}</p>
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
                onClick={() => update({ widthCm: state.widthCm === w ? undefined : w })}
              >
                {widthLabel(w)}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* Size — all #0–#13 with cm always shown. Not selectable until color +
            material + width are set; then prices appear, unavailable sizes mute. */}
        <p className={"text-lg font-bold pt-5 mb-1.5" + (sizePending ? " text-foreground-pending" : "")}>{t("size")}</p>
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
                onClick={() => update({ sizeCode: state.sizeCode === code ? undefined : code })}
              >
                {t("sizeRow", { code, length: lengthCm })}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* Embroidery (optional). One thread color is chosen globally for both
            ends; metallic mutes until an eligible belt is picked. Colored belts
            (white–brown) cannot be embroidered — the whole section blocks. */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (embroideryBlocked ? " text-foreground-blocked" : embroideryHeaderPending ? " text-foreground-pending" : "")}>{t("embroidery")}</p>

        {/* thread color (single table, prices per character). Every option stays
            pending until a width sets the per-character price; then standard
            colors are selectable and metallic ones mute unless the belt allows
            them. Colored belts block the whole table. */}
        <p className={"text-xs mb-1 " + (embroideryBlocked ? "text-foreground-blocked" : embroideryHeaderPending ? "text-foreground-pending" : "text-foreground")}>{t("threadColorTitle")}</p>
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
                onClick={() => update({ threadColor: state.threadColor === tc ? undefined : tc })}
              >
                {t(`threadColors.${tc}`)}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* the two embroidery ends, flush in one table (no per-input thread). */}
        <p className={"text-xs mb-1 pt-2 " + (embroideryBlocked ? "text-foreground-blocked" : embroideryPending ? "text-foreground-pending" : "text-foreground")}>{t("embroiderySubtitle")}</p>
        <OptionTable>
          <EmbroideryInputRow
            label={t("endA")}
            text={state.endAText}
            onText={(v) => update({ endAText: v })}
            placeholder={t("endAPlaceholder")}
            disabled={!embroideryAllowed}
            pending={embroideryPending}
          />
          <EmbroideryInputRow
            label={t("endB")}
            text={state.endBText}
            onText={(v) => update({ endBText: v })}
            placeholder={t("endBPlaceholder")}
            disabled={!embroideryAllowed}
            pending={embroideryPending}
          />
        </OptionTable>

        {/* Label — free, required (no default). Selectable once the width
            resolves; a required single choice like the other sections. HIROTA's
            standard label-specification note sits under the heading (localized). */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (labelPending ? " text-foreground-pending" : "")}>{t("label")}</p>
        <p className={"text-xs leading-tight mb-2 " + (labelPending ? "text-foreground-pending" : "text-foreground")}>{t("labelSpecNote")}</p>
        <OptionTable>
          {labels.map((l) => (
            <OptionRow
              key={l.id}
              selected={labelReady && state.labelId === l.id}
              selectable={labelReady}
              onClick={() =>
                update({ labelId: state.labelId === l.id ? undefined : l.id })
              }
            >
              {l.name}
            </OptionRow>
          ))}
        </OptionTable>
        </>
      }
      right={
        <>
        {/* Obi figure (mirrors the karate-gi figure in the legacy UI). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/obi/vector.svg"
          alt={t("figureAlt")}
          className="w-[82.5%] max-md:w-[65%] mx-auto opacity-50 select-none"
        />

        {/* Obi title — appears with the first select (color) and grows with each
            axis. Legacy "gi-model" name styling. */}
        {obiTitle && (
          <p className="text-lg font-bold leading-tight mb-1.5 mt-6">{obiTitle}</p>
        )}

        {/* Type + description for the selected material and width (legacy
            "gi-model" info styling). The material block shows on material alone;
            the width block once width is chosen. */}
        {state.material && (
          <div className={obiTitle ? "" : "mt-6"}>
            {/* grouped per axis: material (type + description), then width
                (type + description). Width block appears once width is chosen.
                Each type carries the legacy mb-1.5 gap before its description. */}
            <p className="text-[11px] italic leading-tight mb-0.5 text-foreground-muted">
              {t(`materialType.${state.material}`)}
            </p>
            <p className="text-xs leading-tight">
              {t(`materialDescription.${state.material}`)}
            </p>
            {state.widthCm != null && (
              <>
                <p className="text-[11px] italic leading-tight mb-0.5 mt-2 text-foreground-muted">
                  {t(`widthType.${state.widthCm === 4 ? "normal" : "special"}`)}
                </p>
                <p className="text-xs leading-tight">
                  {t(`widthDescription.${state.widthCm === 4 ? "normal" : "special"}`)}
                </p>
              </>
            )}
          </div>
        )}

        {/* Live selected features. The config builds up progressively; the
            "choose…" prompt stays until size resolves the panel, at which point
            it's replaced by the subtotal + CTA (§ render timing). */}
        <div className="flex flex-col mt-3 gap-0.5 leading-tight text-[11px] text-foreground-muted">
          {features.map((f, idx) => (
            <div key={idx} className="flex justify-between gap-2">
              <p className="min-w-0">{f.label}</p>
              {f.amountJpy != null && (
                <p className="whitespace-nowrap">{format(f.amountJpy)}</p>
              )}
            </div>
          ))}
          {/* mt-2.5 + the container's gap-0.5 (2px) = 12px, matching the mt-3
              that separates this block from the description above it. */}
          {/* Suppress the initial nothing-selected prompt; only the
              progressive prompts (after a color is chosen) are shown. */}
          {!configured && state.color != null && (
            <p className="italic mt-2.5">{t(startPromptKey)}</p>
          )}
        </div>

        {/* Subtotal + CTA — only once fully configured (size chosen). */}
        {configured && (
          <>
            <div className="flex justify-between mt-3">
              <p className="text-base font-bold leading-tight">{t("subtotal")}</p>
              <p className="text-base font-bold leading-tight">
                {breakdown?.unitSubtotalJpy != null
                  ? format(breakdown.unitSubtotalJpy)
                  : "—"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className={
                "mt-2.5 text-xs font-bold border tracking-wide py-1 " +
                // While showing "ADDED", hold the selected fill; it reverts when
                // the label goes back to "ADD TO CART".
                (justAdded
                  ? "bg-foreground-selected text-background border-border cursor-pointer"
                  : canAdd
                    ? "bg-transparent text-foreground border-border hover:bg-foreground-hover active:bg-foreground-selected active:text-background cursor-pointer"
                    : "bg-transparent text-foreground-blocked border-border-blocked")
              }
            >
              {justAdded ? t("added") : t("addToCart")}
            </button>

            {/* What's still missing to enable the button — surfaced here rather
                than inline in the form (mirrors the gi-standard configurator). */}
            {(threadWithoutText || !labelChosen) && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {!labelChosen && (
                  <p className="text-[11px] italic leading-tight text-foreground-muted">
                    {t("labelRequired")}
                  </p>
                )}
                {threadWithoutText && (
                  <p className="text-[11px] italic leading-tight text-foreground-muted">
                    {t("threadNeedsText")}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        </>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Presentational primitives — the legacy option-table look (circle radios,
// selected = bg-foreground-selected text-background, hover = bg-foreground-hover).
// ---------------------------------------------------------------------------

function OptionTable({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse text-xs font-bold">
      <tbody>{children}</tbody>
    </table>
  );
}

// One option row. Visual states:
//   • selected  — highlighted (bg-foreground-selected text-background).
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
  // A selected row stays clickable so tapping it again toggles the option off
  // (the only way to clear an optional selection). Blocked/pending rows are inert.
  const clickable = selectable;
  const pending = !selected && !selectable && !blocked;

  const cellState = selected
    ? "bg-foreground-selected text-background cursor-pointer"
    : blocked
      ? "text-foreground-blocked cursor-default" // strike-through + no dot added below
      : selectable
        ? "text-foreground hover:bg-foreground-hover cursor-pointer"
        : "text-foreground-pending cursor-default"; // pending

  // Borders track state too: each inert state uses its own tunable border tone
  // (--border-blocked / --border-pending in globals.css) to match its dim text.
  const borderClass = blocked
    ? "border-border-blocked"
    : pending
      ? "border-border-pending"
      : "border-border";

  return (
    <tr onClick={clickable ? onClick : undefined}>
      <td
        className={
          // Selectable/selected cells use border-style: double — it renders as a
          // 1px solid line but OUTRANKS the neighbours' solid borders in the
          // border-collapse conflict order (double > solid). So a selectable row
          // keeps its own (darker) border on every side — including the top edge
          // it shares with a blocked/pending row above — instead of inheriting
          // that row's lighter border. Inert rows stay solid.
          "group px-2 py-1 border " +
          (selected || selectable ? "border-double " : "") +
          borderClass +
          " " +
          cellState
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className={blocked ? "line-through" : ""}>{children}</span>
          <div className="flex items-center gap-2">
            {price && <span>{price}</span>}
            <span
              className={
                "relative w-[8px] h-[8px] rounded-full border flex items-center justify-center " +
                // Radio border tracks the row's text tone: selectable at --foreground,
                // pending/blocked use their own --foreground-pending / --foreground-blocked.
                (selected
                  ? "border-background"
                  : selectable
                    ? "border-foreground"
                    : blocked
                      ? "border-foreground-blocked"
                      : "border-foreground-pending")
              }
            >
              {selected ? (
                <span className="w-[4px] h-[4px] rounded-full bg-background" />
              ) : blocked ? null : (
                // Hovering previews the inner dot (legacy behaviour), dimmed to
                // match the row's text: selectable at --foreground, pending at
                // --foreground-pending. Pending previews the dot WITHOUT the
                // selectable background tint.
                <span
                  className={
                    "hidden group-hover:block w-[4px] h-[4px] rounded-full " +
                    (selectable ? "bg-foreground" : "bg-foreground-pending")
                  }
                />
              )}
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}

// One embroidery end as a table row (thread is chosen globally, so no per-input
// selector). Visual states mirror the legacy input rows:
//   • completed (has text) → bg-foreground-selected with white text.
//   • otherwise            → hover / focus-within tints bg-foreground-hover.
//   • disabled (colored belt) → full blocked look (matches the thread-color
//     rows above: blocked text + border + strike-through) + not editable.
function EmbroideryInputRow({
  label,
  text,
  onText,
  placeholder,
  disabled = false,
  pending = false,
}: {
  label: string;
  text: string;
  onText: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  /** Inert-but-not-excluded: no thread color chosen yet (mirrors OptionRow's
   *  pending look). Not editable, dimmed neutral rather than heavily muted. */
  pending?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  // "completed" only after the buyer leaves the field (blur), not mid-typing.
  const completed = !focused && text.trim().length > 0;
  const inert = disabled || pending;
  const cellState = disabled
    ? "text-foreground-blocked cursor-default"
    : pending
      ? "text-foreground-pending cursor-default"
      : completed
        ? "bg-foreground-selected text-background"
        : "hover:bg-foreground-hover focus-within:bg-foreground-hover";
  // Match OptionRow: blocked rows use the blocked border, pending rows the
  // softer pending border.
  const borderClass = disabled
    ? "border-border-blocked"
    : pending
      ? "border-border-pending"
      : "border-border";

  return (
    <tr>
      <td className={"px-2 py-1 border " + borderClass + " " + cellState}>
        <div className="flex items-center gap-1.5">
          <span className={disabled ? "line-through" : ""}>{label}</span>
          <input
            type="text"
            value={text}
            placeholder={disabled ? "" : placeholder}
            disabled={inert}
            onChange={(e) => onText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label={label}
            className="flex-1 text-right bg-transparent focus:outline-none disabled:cursor-default"
          />
        </div>
      </td>
    </tr>
  );
}
