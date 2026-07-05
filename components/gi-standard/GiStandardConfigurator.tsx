"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/lib/cart/CartProvider";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import {
  indexPricingData,
  standardPriceKey,
  type GiEmbroideryPriceRow,
  type GiModelRow,
  type GiOptionRow,
  type GiStandardPriceRow,
  type PricingTables,
  type SizeChartRow,
} from "@/lib/pricing/data";
import { priceLineItem, validateConfig } from "@/lib/pricing/engine";
import type {
  GiEmbroidery,
  GiFit,
  GiStandardConfig,
  MfrLogo,
  Shrinkage,
} from "@/lib/pricing/types";
import {
  GI_THREAD_COLORS,
  giThreadCategory,
  standardModels,
  standardOfferedSizes,
  standardSizeChartRow,
  type GiEmbroideryFieldKey,
  type GiThreadColor,
} from "@/lib/gi-standard/model";
import type { GiEmbroiderySummaryField } from "@/lib/cart/types";
import type { LabelOption } from "@/lib/obi/queries";

// The standard (ready-made) karate-gi configurator (Pattern B1). A client
// component: it runs the PURE pricing engine against the reference data passed
// as props (no Supabase here, no per-keystroke round trip — AGENTS §6). The
// cascade model → fit (only where offered) → size → model-conditional optionals
// reconciles downstream on every upstream change (mirrors the obi configurator).
// All price math + availability rules live in the engine and the typed model
// defs; this only reads the itemized breakdown for the live subtotal (§10).

const Fits: readonly GiFit[] = ["slim", "normal"] as const;
const MfrLogoPlacements: readonly MfrLogo[] = ["neck", "breast_neck"] as const;
const ShrinkageOptions: readonly Shrinkage[] = ["accounted", "to_add"] as const;

// gi_options codes for the priced optionals (mirrors the engine's OPT map; used
// here only to DISPLAY the surcharge next to each choice — never to price).
const OPT_MFR_NECK = "mfr_logo_neck";
const OPT_ADJUST_C = "adjust_sleeve_c";
const OPT_ADJUST_H = "adjust_pant_h";

interface GiState {
  modelSlug?: string;
  fit?: GiFit;
  sizeCode?: string;
  mfrLogo?: MfrLogo;
  /** Global thread color for ALL four embroidery fields (its category drives the
   *  per-character rate). Undefined until the buyer explicitly picks one. */
  threadColor?: GiThreadColor;
  lapelText: string;
  shoulderText: string;
  chestText: string;
  pantsText: string;
  /** Desired shorter sleeve (C) / pant-length (H), as raw input strings. */
  adjustCText: string;
  adjustHText: string;
  shrinkage?: Shrinkage;
  labelId: number;
}

/** Count embroidery characters (code-point aware for kanji/katakana). */
function charCount(text: string): number {
  return [...text.trim()].length;
}

/** Parse a measurement input: undefined (empty), NaN (non-numeric), or a number. */
function parseNum(s: string): number | undefined {
  const t = s.trim();
  if (t === "") return undefined;
  return Number(t); // NaN for garbage; validity handled by the caller.
}

export function GiStandardConfigurator({
  giModels,
  sizeCharts,
  giStandardPrices,
  giOptions,
  giEmbroideryPrices,
  labels,
}: {
  giModels: GiModelRow[];
  sizeCharts: SizeChartRow[];
  giStandardPrices: GiStandardPriceRow[];
  giOptions: GiOptionRow[];
  giEmbroideryPrices: GiEmbroideryPriceRow[];
  labels: LabelOption[];
}) {
  const t = useTranslations("GiStandard");
  const locale = useLocale();
  const { format } = useCurrency();
  const { addItem } = useCart();

  // Rebuild the engine's indexed PricingData once from the raw rows. Only the
  // standard-gi tables are populated; the engine's gi_standard path touches
  // nothing else.
  const data = useMemo(() => {
    const tables: PricingTables = {
      giModels,
      sizeCharts,
      giStandardPrices,
      giCustomBasePrices: [],
      giOptions,
      giHemPrices: [],
      giHighWaistPrices: [],
      giEmbroideryPrices,
      obiSizes: [],
      obiPrices: [],
      obiEmbroideryPrices: [],
      products: [],
    };
    return indexPricingData(tables);
  }, [giModels, sizeCharts, giStandardPrices, giOptions, giEmbroideryPrices]);

  // The five ready-made models (derived from gi_models) + a slug lookup.
  const models = useMemo(() => standardModels(giModels), [giModels]);
  const modelBySlug = useMemo(
    () => new Map(models.map((m) => [m.slug, m])),
    [models],
  );

  const defaultLabelId =
    labels.find((l) => l.name === "Hirota")?.id ?? labels[0]?.id ?? 1;

  const [state, setState] = useState<GiState>({
    lapelText: "",
    shoulderText: "",
    chestText: "",
    pantsText: "",
    adjustCText: "",
    adjustHText: "",
    labelId: defaultLabelId,
  });
  const [justAdded, setJustAdded] = useState(false);

  // Reconcile downstream selections whenever the model (or any upstream axis)
  // changes. Pure over `data`. Reclamps fit/size and DROPS any optional the new
  // model no longer offers — including clearing the raw C/H input strings, so a
  // stale measurement can't reappear when returning to an adjust-capable model.
  const reconcile = useCallback(
    (s: GiState): GiState => {
      const def = s.modelSlug ? modelBySlug.get(s.modelSlug) : undefined;
      let { fit, sizeCode, mfrLogo, adjustCText, adjustHText, shrinkage } = s;

      // Fit: fixed for single-fit models; a real choice only for pinac-kumite.
      if (!def) {
        fit = undefined;
      } else if (def.hasFitChoice) {
        if (fit != null && !def.fits.includes(fit)) fit = undefined;
      } else {
        fit = def.fits[0];
      }

      // Size: must be offered for the resolved (model, fit).
      if (!def || fit == null) {
        sizeCode = undefined;
      } else if (
        sizeCode != null &&
        !standardOfferedSizes(data, def.slug, fit).some(
          (r) => r.size_code === sizeCode,
        )
      ) {
        sizeCode = undefined;
      }

      // Manufacturer's logo: dropped when the new model doesn't offer it.
      if (!def || !def.mfrLogo) mfrLogo = undefined;

      // C/H shortening: when the new model disallows it (mh-12), clear the raw
      // input strings AND the now-orphaned shrinkage selection.
      if (!def || !def.adjustCH) {
        adjustCText = "";
        adjustHText = "";
        shrinkage = undefined;
      }

      return { ...s, fit, sizeCode, mfrLogo, adjustCText, adjustHText, shrinkage };
    },
    [data, modelBySlug],
  );

  const update = useCallback(
    (patch: Partial<GiState>) => setState((s) => reconcile({ ...s, ...patch })),
    [reconcile],
  );

  const modelDef = state.modelSlug ? modelBySlug.get(state.modelSlug) : undefined;
  const modelReady = state.modelSlug != null;

  // The FULL size universe, always rendered (like the obi size table). The
  // `normal` chart is the superset — every `slim` size code also exists in it —
  // so its sort_order gives one canonical ordered list (S5…8). Availability per
  // row is decided against the resolved (model, fit) below; unavailable sizes
  // render blocked, never hidden.
  const allSizes = useMemo(
    () =>
      [...data.sizeCharts.values()]
        .filter((r) => r.chart === "normal")
        .sort((a, b) => a.sort_order - b.sort_order),
    [data],
  );

  // Is a size code offered (has a price row) for the resolved (model, fit)?
  const sizeOffered = (sizeCode: string): boolean =>
    state.modelSlug != null &&
    state.fit != null &&
    data.standardPrices.has(standardPriceKey(state.modelSlug, state.fit, sizeCode));

  // Size-chart row for the resolved (fit, size) — source of the C/H ceilings.
  const chartRow =
    state.fit != null && state.sizeCode != null
      ? standardSizeChartRow(data, state.fit, state.sizeCode)
      : undefined;
  const cCeil = chartRow?.c;
  const hCeil = chartRow?.h;

  // Core = model + fit + size chosen. Optionals stay pending (inert) until then.
  const coreReady =
    state.modelSlug != null && state.fit != null && state.sizeCode != null;

  // Embroidery fields, in the engine's emission order (lapel, shoulder, chest,
  // pants) so the right-panel amounts pair positionally with the breakdown.
  const embFields: {
    key: GiEmbroideryFieldKey;
    text: string;
    set: (v: string) => void;
  }[] = [
    { key: "lapel", text: state.lapelText, set: (v) => update({ lapelText: v }) },
    { key: "shoulder", text: state.shoulderText, set: (v) => update({ shoulderText: v }) },
    { key: "chest", text: state.chestText, set: (v) => update({ chestText: v }) },
    { key: "pants", text: state.pantsText, set: (v) => update({ pantsText: v }) },
  ];

  const thread = state.threadColor != null ? giThreadCategory(state.threadColor) : null;

  // C/H shortening. Each entered value must be a real number, strictly shorter
  // than the size-chart ceiling. It is only folded into the (always-valid)
  // engine config once it's valid AND a shrinkage has been chosen.
  const cVal = parseNum(state.adjustCText);
  const hVal = parseNum(state.adjustHText);
  const cActive = cVal !== undefined;
  const hActive = hVal !== undefined;
  const cValid =
    cActive && cCeil != null && Number.isFinite(cVal) && (cVal as number) > 0 && (cVal as number) < cCeil;
  const hValid =
    hActive && hCeil != null && Number.isFinite(hVal) && (hVal as number) > 0 && (hVal as number) < hCeil;
  const cError = cActive && !cValid;
  const hError = hActive && !hValid;
  const shrinkageRequired = cValid || hValid;
  const includeC = cValid && state.shrinkage != null;
  const includeH = hValid && state.shrinkage != null;

  // Resolved engine config, kept ALWAYS engine-valid (invalid/incomplete C/H are
  // simply omitted); the extra gates below block add-to-cart until they resolve.
  // Memoized so the live-price useMemo doesn't recompute on unrelated renders.
  const config = useMemo<GiStandardConfig | null>(() => {
    if (!state.modelSlug || !state.fit || !state.sizeCode) return null;
    let embroidery: GiEmbroidery | undefined;
    if (thread != null) {
      const e: GiEmbroidery = {};
      if (charCount(state.lapelText) > 0) e.lapel = { chars: charCount(state.lapelText), thread };
      if (charCount(state.shoulderText) > 0) e.shoulder = { chars: charCount(state.shoulderText), thread };
      if (charCount(state.chestText) > 0) e.chest = { chars: charCount(state.chestText), thread };
      if (charCount(state.pantsText) > 0) e.pants = { chars: charCount(state.pantsText), thread };
      embroidery = Object.keys(e).length > 0 ? e : undefined;
    }
    return {
      kind: "gi_standard",
      modelSlug: state.modelSlug,
      fit: state.fit,
      sizeCode: state.sizeCode,
      labelId: state.labelId,
      mfrLogo: state.mfrLogo ?? undefined,
      embroidery,
      sleeveCcm: includeC ? (cVal as number) : undefined,
      pantHcm: includeH ? (hVal as number) : undefined,
      shrinkage: includeC || includeH ? state.shrinkage : undefined,
    };
  }, [
    state.modelSlug,
    state.fit,
    state.sizeCode,
    state.labelId,
    state.mfrLogo,
    thread,
    state.lapelText,
    state.shoulderText,
    state.chestText,
    state.pantsText,
    includeC,
    includeH,
    cVal,
    hVal,
    state.shrinkage,
  ]);

  // Live itemized breakdown from the pure engine (never recomputed in JSX).
  const breakdown = useMemo(() => {
    if (!config) return null;
    if (!validateConfig(config, data).ok) return null;
    return priceLineItem(config, data);
  }, [config, data]);

  // A thread color with no text in any field is a meaningless selection.
  const threadWithoutText =
    state.threadColor != null && embFields.every((f) => charCount(f.text) === 0);

  const canAdd =
    coreReady &&
    config != null &&
    breakdown != null &&
    !breakdown.quote &&
    !cError &&
    !hError &&
    (!shrinkageRequired || state.shrinkage != null) &&
    !threadWithoutText;

  const labelName = labels.find((l) => l.id === state.labelId)?.name ?? "Hirota";
  const modelName = modelDef
    ? locale === "ja"
      ? modelDef.nameJa
      : modelDef.nameEn
    : null;

  const fitLabel = (f: GiFit) => t(`fits.${f}`);
  const threadColorSuffix =
    state.threadColor != null ? `, ${t(`threadColorsShort.${state.threadColor}`)}` : "";

  // Per-size base price (a direct lookup of a stored cell — not math).
  const sizePrice = (sizeCode: string): number | null => {
    if (!state.modelSlug || !state.fit) return null;
    return data.standardPrices.get(standardPriceKey(state.modelSlug, state.fit, sizeCode)) ?? null;
  };

  // Model-conditional optionals stay VISIBLE for every model; when the chosen
  // model excludes one, its rows render `blocked` (not hidden) — e.g. MH-11's
  // manufacturer's logo, or MH-12's C/H adjustment.
  const mfrExcluded = modelReady && !modelDef?.mfrLogo;
  const adjustExcluded = modelReady && !modelDef?.adjustCH;

  const mfrLogoPrice = data.options.get(OPT_MFR_NECK)?.price ?? 0;
  const adjustCPrice = data.options.get(OPT_ADJUST_C)?.price ?? 0;
  const adjustHPrice = data.options.get(OPT_ADJUST_H)?.price ?? 0;
  const embroideryRate = (color: GiThreadColor): number =>
    data.giEmbroidery.get(giThreadCategory(color)) ?? 0;

  // Right-panel "selected features": localized labels paired positionally with
  // the engine's breakdown amounts (base, mfr-logo, embroidery in engine order,
  // then C, then H — matching priceGiStandard's line order).
  const features: { label: string; amountJpy?: number }[] = [];
  if (coreReady && breakdown && state.fit && state.sizeCode) {
    let i = 0;
    features.push({
      label: `${t("giLine").toLowerCase()}: ${fitLabel(state.fit)} · #${state.sizeCode}`,
      amountJpy: breakdown.lines[i++]?.amountJpy,
    });
    if (state.mfrLogo) {
      features.push({
        label: `${t("mfrLogo").toLowerCase()}: ${t(`mfrLogoPlacements.${state.mfrLogo}`)}`,
        amountJpy: breakdown.lines[i++]?.amountJpy,
      });
    }
    for (const f of embFields) {
      if (charCount(f.text) > 0 && thread != null) {
        features.push({
          label: `${t(`embroideryFields.${f.key}`).toLowerCase()}: ${f.text.trim()}${threadColorSuffix}`,
          amountJpy: breakdown.lines[i++]?.amountJpy,
        });
      }
    }
    if (includeC) {
      features.push({
        label: `${t("adjustC").toLowerCase()}: < ${cVal}cm`,
        amountJpy: breakdown.lines[i++]?.amountJpy,
      });
    }
    if (includeH) {
      features.push({
        label: `${t("adjustH").toLowerCase()}: < ${hVal}cm`,
        amountJpy: breakdown.lines[i++]?.amountJpy,
      });
    }
    if (shrinkageRequired && state.shrinkage) {
      features.push({
        label: `${t("shrinkage").toLowerCase()}: ${t(`shrinkageOptions.${state.shrinkage}`)}`,
      });
    }
    features.push({ label: `${t("label").toLowerCase()}: ${labelName}` });
  }

  // Prompt copy narrows to the axes still missing (first unmet one leads).
  const startPromptKey =
    state.modelSlug == null
      ? "startPromptModel"
      : state.fit == null
        ? "startPromptFit"
        : "startPromptSize";

  function handleAdd() {
    if (!canAdd || !config || !breakdown || breakdown.unitSubtotalJpy == null) return;
    const embroidery: GiEmbroiderySummaryField[] = [];
    for (const f of embFields) {
      const chars = charCount(f.text);
      if (chars > 0 && thread != null) {
        embroidery.push({ field: f.key, chars, text: f.text.trim() });
      }
    }
    addItem({
      kind: "configured",
      productId: 0, // configured, not a `products` row; 0 = sentinel.
      name: {
        en: modelDef?.nameEn ?? "Karate-gi",
        ja: modelDef?.nameJa ?? "空手衣",
      },
      unitPriceJpy: breakdown.unitSubtotalJpy,
      config: {
        kind: "gi_standard",
        config,
        breakdown,
        summary: {
          fit: config.fit,
          sizeCode: config.sizeCode,
          mfrLogo: config.mfrLogo ?? undefined,
          threadColorKey: embroidery.length > 0 ? state.threadColor : undefined,
          embroidery,
          sleeveCcm: config.sleeveCcm,
          pantHcm: config.pantHcm,
          shrinkage: config.shrinkage,
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
      {/* LEFT — the cascade + model-conditional optionals                 */}
      {/* ---------------------------------------------------------------- */}
      <div className="basis-[60%] pt-2 px-2.5 pb-10 leading-tight">
        {/* Model — no upstream: always selectable. */}
        <p className="text-lg font-bold mb-1.5">{t("model")}</p>
        <OptionTable>
          {models.map((m) => (
            <OptionRow
              key={m.slug}
              selected={state.modelSlug === m.slug}
              selectable
              onClick={() =>
                update({ modelSlug: state.modelSlug === m.slug ? undefined : m.slug })
              }
            >
              {locale === "ja" ? m.nameJa : m.nameEn}
            </OptionRow>
          ))}
        </OptionTable>

        {/* Fit — always shown (both slim & normal). A model that isn't sold in a
            fit renders it blocked; a single-fit model has its one fit auto-set
            (selected) with the other blocked; only pinac-kumite is a real choice. */}
        <p className="text-lg font-bold pt-5 mb-1.5">{t("fit")}</p>
        <OptionTable>
          {Fits.map((f) => {
            const offered = modelDef?.fits.includes(f) ?? false;
            return (
              <OptionRow
                key={f}
                selected={state.fit === f}
                selectable={offered}
                blocked={modelReady && !offered}
                onClick={() => update({ fit: state.fit === f ? undefined : f })}
              >
                {fitLabel(f)}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* Size — the full universe (S5…8) always shown. Pending until model +
            fit resolve; then sizes offered for that (model, fit) become selectable
            with a price, and the rest render blocked. No runtime size math. */}
        <p className="text-lg font-bold pt-5 mb-1.5">{t("size")}</p>
        <OptionTable>
          {allSizes.map((row) => {
            const offered = sizeOffered(row.size_code);
            const p = offered ? sizePrice(row.size_code) : null;
            return (
              <OptionRow
                key={row.size_code}
                selected={state.sizeCode === row.size_code}
                selectable={offered}
                blocked={state.fit != null && !offered}
                price={p != null ? format(p) : undefined}
                onClick={() =>
                  update({
                    sizeCode: state.sizeCode === row.size_code ? undefined : row.size_code,
                  })
                }
              >
                {row.size_code.startsWith("S")
                  ? row.size_code
                  : t("sizeRow", { code: row.size_code })}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* Manufacturer's logo — always shown. Only tsubasa & pinac-kumite offer
            it; every other model renders both placements blocked. */}
        <p className="text-lg font-bold pt-5 mb-1.5">{t("mfrLogo")}</p>
        <OptionTable>
          {MfrLogoPlacements.map((placement) => (
            <OptionRow
              key={placement}
              selected={state.mfrLogo === placement}
              selectable={coreReady && !mfrExcluded}
              blocked={mfrExcluded}
              price={`+ ${format(mfrLogoPrice)}`}
              onClick={() =>
                update({
                  mfrLogo: state.mfrLogo === placement ? undefined : placement,
                })
              }
            >
              {t(`mfrLogoPlacements.${placement}`)}
            </OptionRow>
          ))}
        </OptionTable>

        {/* Embroidery (optional). One thread color is chosen globally for all
            four fields; the per-character rate follows the thread's category. */}
        <p className="text-lg font-bold pt-5 mb-[3px]">{t("embroidery")}</p>
        <p className="text-xs mb-1 text-ink-50">{t("threadColorTitle")}</p>
        <OptionTable>
          {GI_THREAD_COLORS.map((tc) => (
            <OptionRow
              key={tc}
              selected={state.threadColor === tc}
              selectable={coreReady}
              price={`+ ${format(embroideryRate(tc))} ${t("perChar")}`}
              onClick={() =>
                update({ threadColor: state.threadColor === tc ? undefined : tc })
              }
            >
              {t(`threadColors.${tc}`)}
            </OptionRow>
          ))}
        </OptionTable>

        <p className="text-xs mb-1 text-ink-50 pt-2">{t("embroiderySubtitle")}</p>
        <OptionTable>
          {embFields.map((f) => (
            <TextInputRow
              key={f.key}
              label={t(`embroideryFields.${f.key}`)}
              text={f.text}
              onText={f.set}
              placeholder={t("embroideryPlaceholder")}
              pending={!coreReady || state.threadColor == null}
            />
          ))}
        </OptionTable>
        {threadWithoutText && (
          <p className="text-[11px] italic text-ink-40 mt-1">{t("threadNeedsText")}</p>
        )}

        {/* Adjust C/H — always shown. Sleeve length C and pant-hem length H only
            ever shorten: each entry must be under the size-chart ceiling. mh-12
            renders both inputs blocked; otherwise they stay pending (no ceiling)
            until a size resolves, then show the "< N" ceiling. */}
        <p className="text-lg font-bold pt-5 mb-[3px]">{t("adjust")}</p>
        <p className="text-xs text-ink-50 leading-tight mb-2">{t("adjustNote")}</p>
        <OptionTable>
          <MeasureInputRow
            label={t("adjustC")}
            text={state.adjustCText}
            onText={(v) => update({ adjustCText: v })}
            placeholder={
              coreReady && cCeil != null ? `< ${cCeil}` : t("adjustPendingPlaceholder")
            }
            suffix={`+ ${format(adjustCPrice)}`}
            pending={!coreReady && !adjustExcluded}
            blocked={adjustExcluded}
            error={cError}
          />
          <MeasureInputRow
            label={t("adjustH")}
            text={state.adjustHText}
            onText={(v) => update({ adjustHText: v })}
            placeholder={
              coreReady && hCeil != null ? `< ${hCeil}` : t("adjustPendingPlaceholder")
            }
            suffix={`+ ${format(adjustHPrice)}`}
            pending={!coreReady && !adjustExcluded}
            blocked={adjustExcluded}
            error={hError}
          />
        </OptionTable>
        {(cError || hError) && (
          <p className="text-[11px] italic font-bold text-ink-60 mt-1">
            {t("adjustTooLong")}
          </p>
        )}

        {/* Shrinkage — always shown; mandatory once any C/H value is entered,
            because a new measurement is being requested (§8.2). Blocked on mh-12,
            pending until a C/H value is entered, then selectable. */}
        <p className="text-xs mb-1 text-ink-50 pt-3">{t("shrinkage")}</p>
        <OptionTable>
          {ShrinkageOptions.map((opt) => (
            <OptionRow
              key={opt}
              selected={state.shrinkage === opt}
              selectable={shrinkageRequired}
              blocked={adjustExcluded}
              onClick={() =>
                update({ shrinkage: state.shrinkage === opt ? undefined : opt })
              }
            >
              {t(`shrinkageOptions.${opt}`)}
            </OptionRow>
          ))}
        </OptionTable>
        {shrinkageRequired && state.shrinkage == null && (
          <p className="text-[11px] italic text-ink-40 mt-1">
            {t("shrinkageRequired")}
          </p>
        )}

        {/* Label — free, defaults to Hirota. Selectable once the core resolves. */}
        <p className="text-lg font-bold pt-5 mb-[3px]">{t("label")}</p>
        <p className="text-xs text-ink-50 leading-tight mb-2">{t("labelSpecNote")}</p>
        <OptionTable>
          {labels.map((l) => (
            <OptionRow
              key={l.id}
              selected={coreReady && state.labelId === l.id}
              selectable={coreReady}
              onClick={() => update({ labelId: l.id })}
            >
              {l.name}
            </OptionRow>
          ))}
        </OptionTable>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* RIGHT — figure placeholder, model info, live features + CTA      */}
      {/* ---------------------------------------------------------------- */}
      <div className="basis-[40%] flex flex-col mt-8 mb-5 mx-8 min-w-0">
        {/* Karate-gi figure (mirrors the obi figure). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/karate-gi/karate-gi-vector.svg"
          alt={t("figureAlt")}
          className="w-[73%] mx-auto opacity-50 select-none"
        />

        {/* Model name — appears once a model is chosen. */}
        {modelName && (
          <p className="text-lg font-bold leading-tight mb-1 mt-6">{modelName}</p>
        )}

        {/* Live selected features. The "choose…" prompt stays until the core
            resolves, at which point it's replaced by the subtotal + CTA. */}
        <div className="flex flex-col mt-4 gap-0.5 leading-tight text-[11px] text-ink-40">
          {features.map((f, idx) => (
            <div key={idx} className="flex justify-between gap-2">
              <p className="min-w-0">{f.label}</p>
              {f.amountJpy != null && (
                <p className="whitespace-nowrap">{format(f.amountJpy)}</p>
              )}
            </div>
          ))}
          {!coreReady && (
            <p
              className={
                "italic mt-3.5 " + (state.modelSlug == null ? "text-center" : "")
              }
            >
              {t(startPromptKey)}
            </p>
          )}
        </div>

        {/* Subtotal + CTA — only once fully configured (size chosen). */}
        {coreReady && (
          <>
            <div className="flex justify-between mt-2.5">
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
                "mt-2.5 text-xs font-bold bg-transparent border tracking-wide py-1 " +
                (canAdd
                  ? "text-ink-50 border-line hover:bg-ink-10 cursor-pointer"
                  : "text-ink-25 border-line-soft")
              }
            >
              {justAdded ? t("added") : t("addToCart")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational primitives — the legacy option-table look. Duplicated from the
// obi configurator (kept local so this sprint leaves the obi component
// untouched); identical circle-radio / selected / blocked / pending styling.
// ---------------------------------------------------------------------------

function OptionTable({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse text-xs font-bold">
      <tbody>{children}</tbody>
    </table>
  );
}

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
  const clickable = selectable;
  const pending = !selected && !selectable && !blocked;

  const cellState = selected
    ? "bg-ink-60 text-paper cursor-pointer"
    : blocked
      ? "text-ink-40 cursor-default"
      : selectable
        ? "text-ink-50 hover:bg-ink-10 cursor-pointer"
        : "text-ink-40 cursor-default";

  const borderClass = pending || blocked ? "border-line-pending" : "border-line";

  return (
    <tr onClick={clickable ? onClick : undefined}>
      <td className={"group px-2 py-1 border " + borderClass + " " + cellState}>
        <div className="flex items-center justify-between gap-2">
          <span className={blocked ? "line-through" : ""}>{children}</span>
          <div className="flex items-center gap-2">
            {price && <span>{price}</span>}
            <span
              className={
                "relative w-[8px] h-[8px] rounded-full border flex items-center justify-center " +
                (selected
                  ? "border-paper"
                  : selectable
                    ? "border-ink-50"
                    : "border-ink-40")
              }
            >
              {selected ? (
                <span className="w-[4px] h-[4px] rounded-full bg-paper" />
              ) : blocked ? null : (
                <span
                  className={
                    "hidden group-hover:block w-[4px] h-[4px] rounded-full " +
                    (selectable ? "bg-ink-50" : "bg-ink-40")
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

// A free-text embroidery input row (thread is chosen globally, so no per-input
// selector). Mirrors the obi EmbroideryInputRow.
function TextInputRow({
  label,
  text,
  onText,
  placeholder,
  pending = false,
}: {
  label: string;
  text: string;
  onText: (v: string) => void;
  placeholder: string;
  pending?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const completed = !focused && text.trim().length > 0;
  const cellState = pending
    ? "text-ink-40 cursor-default"
    : completed
      ? "bg-ink-60 text-paper"
      : "hover:bg-ink-10 focus-within:bg-ink-10";
  const borderClass = pending ? "border-line-pending" : "border-line";

  return (
    <tr>
      <td className={"px-2 py-1 border " + borderClass + " " + cellState}>
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <input
            type="text"
            value={text}
            placeholder={placeholder}
            disabled={pending}
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

// A numeric measurement input (C/H shortening). Shows the "< N" ceiling as its
// placeholder once a size resolves; a solid dark border while the entry is
// invalid (not strictly shorter than the ceiling); and a blocked (muted, struck-
// through, inert) look when the model disallows adjustment (mh-12). Mirrors the
// OptionRow's pending/blocked/error states.
function MeasureInputRow({
  label,
  text,
  onText,
  placeholder,
  suffix,
  pending = false,
  blocked = false,
  error = false,
}: {
  label: string;
  text: string;
  onText: (v: string) => void;
  placeholder: string;
  suffix?: string;
  pending?: boolean;
  blocked?: boolean;
  error?: boolean;
}) {
  const inert = pending || blocked;
  const cellState = inert
    ? "text-ink-40 cursor-default"
    : "hover:bg-ink-10 focus-within:bg-ink-10";
  // Error signals with a solid, dark ink border (the palette is monochrome — no
  // red token); pending/blocked soften to the pending tone.
  const borderClass = error
    ? "border-ink-60"
    : inert
      ? "border-line-pending"
      : "border-line";

  return (
    <tr>
      <td className={"px-2 py-1 border " + borderClass + " " + cellState}>
        <div className="flex items-center gap-1.5">
          <span className={blocked ? "line-through" : ""}>{label}</span>
          <input
            type="text"
            inputMode="decimal"
            value={blocked ? "" : text}
            placeholder={blocked ? "" : placeholder}
            disabled={inert}
            onChange={(e) => onText(e.target.value)}
            aria-label={label}
            className="flex-1 min-w-0 text-right bg-transparent focus:outline-none disabled:cursor-default"
          />
          {suffix && !blocked && (
            <span className="whitespace-nowrap text-ink-40">{suffix}</span>
          )}
        </div>
      </td>
    </tr>
  );
}
