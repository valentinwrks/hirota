"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
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
import { displayLabelName } from "@/lib/cart/format";
import type { LabelOption } from "@/lib/obi/queries";
import { KarateGiVector } from "@/components/karate-gi/KarateGiVector";
import { ConfiguratorLayout } from "@/components/configurator/ConfiguratorLayout";

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
  /** Whether the sleeve (C) / pant-length (H) adjustment radio is toggled on.
   *  The radio carries the price; the input below it holds the new length. */
  adjustCOn: boolean;
  adjustHOn: boolean;
  /** Desired shorter sleeve (C) / pant-length (H) final length, as raw strings. */
  adjustCText: string;
  adjustHText: string;
  shrinkage?: Shrinkage;
  labelId?: number;
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
  headerField,
}: {
  giModels: GiModelRow[];
  sizeCharts: SizeChartRow[];
  giStandardPrices: GiStandardPriceRow[];
  giOptions: GiOptionRow[];
  giEmbroideryPrices: GiEmbroideryPriceRow[];
  labels: LabelOption[];
  /** Optional node rendered as the form's FIRST field (the /karate-gi
   *  tailoring-mode radio lives here, above "Karate-gi model"). */
  headerField?: React.ReactNode;
}) {
  const t = useTranslations("GiStandard");
  // Thread colours are shared with the fully-tailored gi (one palette, §8.4).
  const tThread = useTranslations("GiThread");
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

  const [state, setState] = usePersistentState<GiState>(
    // v2: label is no longer defaulted to Hirota — bumped so pre-existing saved
    // payloads (which still carry the old default labelId) are dropped instead of
    // shallow-merged back in and resurfacing as a selected label.
    "hirota:config:gi-standard:v2",
    {
      lapelText: "",
      shoulderText: "",
      chestText: "",
      pantsText: "",
      adjustCOn: false,
      adjustHOn: false,
      adjustCText: "",
      adjustHText: "",
      // Label is a required, un-defaulted choice — the buyer must pick one.
    },
  );
  const [justAdded, setJustAdded] = useState(false);

  // Reconcile downstream selections whenever the model (or any upstream axis)
  // changes. Pure over `data`. Reclamps fit/size and DROPS any optional the new
  // model no longer offers — including clearing the raw C/H input strings, so a
  // stale measurement can't reappear when returning to an adjust-capable model.
  const reconcile = useCallback(
    (s: GiState): GiState => {
      const def = s.modelSlug ? modelBySlug.get(s.modelSlug) : undefined;
      let {
        fit,
        sizeCode,
        mfrLogo,
        threadColor,
        lapelText,
        shoulderText,
        chestText,
        pantsText,
        adjustCOn,
        adjustHOn,
        adjustCText,
        adjustHText,
        shrinkage,
        labelId,
      } = s;

      // Fit: never auto-selected — the user must click it (even single-fit
      // models). Only clear a fit the new model doesn't offer.
      if (!def || (fit != null && !def.fits.includes(fit))) {
        fit = undefined;
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

      // C/H shortening depends on both the model allowing it (not mh-12) AND a
      // resolved size (the ceiling comes from the size chart). If either is
      // missing, reset the toggles, their raw inputs AND the orphaned shrinkage.
      if (!def || !def.adjustCH || sizeCode == null) {
        adjustCOn = false;
        adjustHOn = false;
        adjustCText = "";
        adjustHText = "";
        shrinkage = undefined;
      }

      // Shrinkage and the C/H adjustments go hand in hand: with no adjustment
      // active there can be no shrinkage selection, so clear it (e.g. the user
      // unchecks the last adjustment that was still on).
      if (!adjustCOn && !adjustHOn) shrinkage = undefined;

      // The whole lower form (embroidery, manufacturer's logo, label — the C/H
      // cut + shrinkage were already reset above) is gated on a resolved core
      // (model + fit + size). With no size it's all pending, so drop those
      // selections: they must be completed again, not linger selected-but-inert.
      if (sizeCode == null) {
        mfrLogo = undefined;
        threadColor = undefined;
        lapelText = "";
        shoulderText = "";
        chestText = "";
        pantsText = "";
        labelId = undefined;
      }

      return {
        ...s,
        fit,
        sizeCode,
        mfrLogo,
        threadColor,
        lapelText,
        shoulderText,
        chestText,
        pantsText,
        adjustCOn,
        adjustHOn,
        adjustCText,
        adjustHText,
        shrinkage,
        labelId,
      };
    },
    [data, modelBySlug],
  );

  const update = useCallback(
    (patch: Partial<GiState>) => setState((s) => reconcile({ ...s, ...patch })),
    [reconcile, setState],
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
  // Size label for messages, matching the size table: numeric sizes get a "#",
  // the small "S" sizes (S5–S7) are shown as-is.
  const sizeLabel =
    state.sizeCode == null || state.sizeCode.startsWith("S")
      ? (state.sizeCode ?? "")
      : `#${state.sizeCode}`;

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

  // C/H shortening. The radio (adjustCOn/adjustHOn) is the intent; the length is
  // typed in the input below it. A typed value must be a real number, strictly
  // shorter than the size-chart ceiling. It is folded into the (always-valid)
  // engine config only once it's valid AND a shrinkage has been chosen.
  const cVal = parseNum(state.adjustCText);
  const hVal = parseNum(state.adjustHText);
  const cEntered = state.adjustCOn && state.adjustCText.trim() !== "";
  const hEntered = state.adjustHOn && state.adjustHText.trim() !== "";
  const cValid =
    cEntered && cCeil != null && Number.isFinite(cVal) && (cVal as number) > 0 && (cVal as number) < cCeil;
  const hValid =
    hEntered && hCeil != null && Number.isFinite(hVal) && (hVal as number) > 0 && (hVal as number) < hCeil;
  // A typed-but-invalid length shows the "too long" hint; a toggled-on adjustment
  // that isn't yet valid (empty or invalid) blocks add-to-cart.
  const cError = cEntered && !cValid;
  const hError = hEntered && !hValid;
  const cNeedsValue = state.adjustCOn && !cValid;
  const hNeedsValue = state.adjustHOn && !hValid;
  // Shrinkage is enabled/required only once a VALID length is actually entered —
  // not merely when an adjustment radio is toggled on. The two go hand in hand,
  // but a checked adjustment with no measurement yet doesn't unlock shrinkage.
  const shrinkageRequired = cValid || hValid;
  const includeC = cValid && state.shrinkage != null;
  const includeH = hValid && state.shrinkage != null;

  // Resolved engine config, kept ALWAYS engine-valid (invalid/incomplete C/H are
  // simply omitted); the extra gates below block add-to-cart until they resolve.
  // Resolved engine config. Kept a plain computed value (not a manual useMemo):
  // the React Compiler memoizes it automatically, and its inputs include the
  // parsed C/H values which the compiler can't accept in a manual dep array.
  const config: GiStandardConfig | null = ((): GiStandardConfig | null => {
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
  })();

  // Live itemized breakdown from the pure engine (never recomputed in JSX; the
  // React Compiler memoizes this too).
  const breakdown =
    config && validateConfig(config, data).ok ? priceLineItem(config, data) : null;

  // A thread color with no text in any field is a meaningless selection.
  const threadWithoutText =
    state.threadColor != null && embFields.every((f) => charCount(f.text) === 0);

  // Label is required — no default; the buyer must pick one like any other
  // section.
  const labelChosen = state.labelId != null;

  const canAdd =
    coreReady &&
    config != null &&
    breakdown != null &&
    !breakdown.quote &&
    !cNeedsValue &&
    !hNeedsValue &&
    (!shrinkageRequired || state.shrinkage != null) &&
    labelChosen &&
    !threadWithoutText;

  // Hints explaining what's still missing to enable add-to-cart. Surfaced BELOW
  // the button rather than inline in the form. Only meaningful once the core is
  // configured (the button itself only renders then).
  const blockingHints: string[] = [];
  if (coreReady) {
    if (threadWithoutText) blockingHints.push(t("threadNeedsText"));
    // Adjustment toggled on but no length typed yet (per part).
    if (state.adjustCOn && !cEntered) blockingHints.push(t("sleeveNeedsLength"));
    if (state.adjustHOn && !hEntered) blockingHints.push(t("pantsNeedsLength"));
    if (shrinkageRequired && state.shrinkage == null) {
      blockingHints.push(t("shrinkageRequired"));
    }
    if (!labelChosen) blockingHints.push(t("labelRequired"));
  }

  const labelName = labels.find((l) => l.id === state.labelId)?.name ?? "Hirota";
  // The bilingual model label (e.g. "ツバサ Tsubasa"), shared by the model cell
  // and the right-panel title so they always read identically.
  const modelName = modelDef ? t(`modelNames.${modelDef.slug}`) : null;

  const fitLabel = (f: GiFit) => t(`fits.${f}`);
  const threadColorSuffix =
    state.threadColor != null ? ` (${tThread(`threadColorsShort.${state.threadColor}`)})` : "";

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

  // Section-header tint: each section's title (and its description) mirrors the
  // state of the options right below it — `pending` while its upstream axis is
  // unresolved, `blocked` for a decided model-rule exclusion (mh-12 C/H, models
  // without the mfr logo). blocked wins over pending; sections that can't be
  // blocked carry only the pending flag. Mirrors the obi configurator.
  const fitPending = !modelReady;
  const sizePending = state.fit == null;
  const embroideryPending = !coreReady; // thread-color table
  const embroideryEndsPending = !coreReady || state.threadColor == null; // ends
  const adjustPending = !coreReady && !adjustExcluded;
  const shrinkagePending = !shrinkageRequired && !adjustExcluded;
  const mfrPending = !coreReady && !mfrExcluded;
  const labelPending = !coreReady;

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
    // Amounts are read in the ENGINE's emission order (base, mfr-logo, embroidery
    // lapel/shoulder/chest/pants, then C, then H — see priceGiStandard) so we can
    // display them in a DIFFERENT order below (the logo after the cut).
    let i = 0;
    const baseAmt = breakdown.lines[i++]?.amountJpy;
    const logoAmt = state.mfrLogo ? breakdown.lines[i++]?.amountJpy : undefined;
    const embAmt: Partial<Record<GiEmbroideryFieldKey, number | undefined>> = {};
    for (const f of embFields) {
      if (charCount(f.text) > 0 && thread != null) {
        embAmt[f.key] = breakdown.lines[i++]?.amountJpy;
      }
    }
    const cAmt = includeC ? breakdown.lines[i++]?.amountJpy : undefined;
    const hAmt = includeH ? breakdown.lines[i++]?.amountJpy : undefined;

    // Display order mirrors the form: base, label, embroidery, sleeve & pants
    // cut (C, H, shrinkage), manufacturer's logo. The model itself lives in the
    // panel title (and the cart-line name), so the base line reads
    // "ready-made · slim cut · #7".
    features.push({
      label: `${t("giLine")} · ${t(`fitsShort.${state.fit}`)} · ${sizeLabel}`,
      amountJpy: baseAmt,
    });
    // Label leads the optional lines (it sits right after Size in the form). It
    // carries no amount, so its position doesn't disturb the positional cursor.
    if (labelChosen) {
      features.push({ label: t("labelLine", { name: displayLabelName(labelName) }) });
    }
    for (const f of embFields) {
      if (charCount(f.text) > 0 && thread != null) {
        features.push({
          label: `${t(`embroideryFieldsShort.${f.key}`)} = ${f.text.trim()}${threadColorSuffix}`,
          amountJpy: embAmt[f.key],
        });
      }
    }
    // The adjustment appears in the config as soon as its radio is toggled on
    // ("new C = ?"), before any measurement or shrinkage. The "?" becomes
    // the entered number once typed; the +price only lands (via cAmt/hAmt) once
    // the value is valid AND shrinkage is chosen (that's when the engine prices
    // it into the subtotal).
    if (state.adjustCOn) {
      features.push({
        label: `${t("adjustCShort")} = ${Number.isFinite(cVal) ? cVal : "?"}`,
        amountJpy: cAmt,
      });
    }
    if (state.adjustHOn) {
      features.push({
        label: `${t("adjustHShort")} = ${Number.isFinite(hVal) ? hVal : "?"}`,
        amountJpy: hAmt,
      });
    }
    if (shrinkageRequired && state.shrinkage) {
      features.push({ label: t(`shrinkageShort.${state.shrinkage}`) });
    }
    if (state.mfrLogo) {
      features.push({
        label: t(`mfrLogoShort.${state.mfrLogo}`),
        amountJpy: logoAmt,
      });
    }
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
      // Cart title = the same bilingual model label as `modelNames` (e.g. EN
      // "ピナック組手用 Pinac Kumite", JA "ピナック組手用"), so it re-localizes on
      // the currency/locale toggle. Rebuilt from the DB names: kanji + romaji,
      // collapsed to one when they match (the MH-* codes).
      name: modelDef
        ? {
            en:
              modelDef.nameJa === modelDef.nameEn
                ? modelDef.nameEn
                : `${modelDef.nameEn} (${modelDef.nameJa})`,
            ja: modelDef.nameJa,
          }
        : { en: "Karate-gi", ja: "空手衣" },
      unitPriceJpy: breakdown.unitSubtotalJpy,
      config: {
        kind: "gi_standard",
        config,
        breakdown,
        summary: {
          modelSlug: config.modelSlug,
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
    <ConfiguratorLayout
      variant="dogi"
      left={
        <>
        {headerField}
        {/* Model — no upstream: always selectable. */}
        <p className={"text-lg font-bold leading-tight mb-[3px]" + (headerField ? " pt-5" : "")}>{t("model")}</p>
        <p className="text-xs text-foreground leading-tight mb-2">{t("modelNote")}</p>
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
              {t(`modelNames.${m.slug}`)}
            </OptionRow>
          ))}
        </OptionTable>

        {/* Fit — always shown (both slim & normal). A model that isn't sold in a
            fit renders it blocked; the offered fit(s) are selectable and the user
            must click one (no auto-selection), even for single-fit models. */}
        <p className={"text-lg font-bold leading-tight pt-5 mb-[3px]" + (fitPending ? " text-foreground-pending" : "")}>{t("fit")}</p>
        <p className={"text-xs leading-tight mb-2 " + (fitPending ? "text-foreground-pending" : "text-foreground")}>{t("fitNote")}</p>
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
        <p className={"text-lg font-bold leading-tight pt-5 mb-1.5" + (sizePending ? " text-foreground-pending" : "")}>{t("size")}</p>
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

        {/* Label — free, required (no default). Selectable once the core
            resolves; a required single choice placed right after Size, before the
            optional sections. */}
        <p className={"text-lg font-bold leading-tight pt-5 mb-[3px]" + (labelPending ? " text-foreground-pending" : "")}>{t("label")}</p>
        <p className={"text-xs leading-tight mb-2 " + (labelPending ? "text-foreground-pending" : "text-foreground")}>{t("labelSpecNote")}</p>
        <OptionTable>
          {labels.map((l) => (
            <OptionRow
              key={l.id}
              selected={coreReady && state.labelId === l.id}
              selectable={coreReady}
              onClick={() =>
                update({ labelId: state.labelId === l.id ? undefined : l.id })
              }
            >
              {l.name}
            </OptionRow>
          ))}
        </OptionTable>

        {/* Embroidery (optional). One thread color is chosen globally for all
            four fields; the per-character rate follows the thread's category. */}
        <p className={"text-lg font-bold leading-tight pt-5 mb-[3px]" + (embroideryPending ? " text-foreground-pending" : "")}>{t("embroidery")}</p>
        <p className={"text-xs mb-1 " + (embroideryPending ? "text-foreground-pending" : "text-foreground")}>{t("threadColorTitle")}</p>
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
              {tThread(`threadColors.${tc}`)}
            </OptionRow>
          ))}
        </OptionTable>

        <p className={"text-xs mb-1 pt-2 " + (embroideryEndsPending ? "text-foreground-pending" : "text-foreground")}>{t("embroiderySubtitle")}</p>
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
        {/* Sleeve & pants cut — always shown. Each part is a radio (carrying the
            +price) that only ever SHORTENS; toggling it on reveals the length
            input below. mh-12 renders the radios blocked; otherwise they're
            pending until a size resolves (the input needs the chart ceiling). */}
        <p className={"text-lg font-bold leading-tight pt-5 mb-[3px]" + (adjustExcluded ? " text-foreground-blocked" : adjustPending ? " text-foreground-pending" : "")}>{t("adjust")}</p>
        <p className={"text-xs leading-tight mb-2 " + (adjustExcluded ? "text-foreground-blocked" : adjustPending ? "text-foreground-pending" : "text-foreground")}>{t("adjustNote")}</p>
        <OptionTable>
          <OptionRow
            selected={state.adjustCOn}
            selectable={coreReady && !adjustExcluded}
            blocked={adjustExcluded}
            price={`+ ${format(adjustCPrice)}`}
            onClick={() =>
              update(
                state.adjustCOn
                  ? { adjustCOn: false, adjustCText: "" }
                  : { adjustCOn: true },
              )
            }
          >
            {t("sleeveAdjust")}
          </OptionRow>
          {state.adjustCOn && (
            <MeasureInputRow
              label={t("adjustC")}
              text={state.adjustCText}
              onText={(v) => update({ adjustCText: v })}
              placeholder={t("adjustLengthPlaceholder")}
              unit="cm"
              error={cError}
            />
          )}
          <OptionRow
            selected={state.adjustHOn}
            selectable={coreReady && !adjustExcluded}
            blocked={adjustExcluded}
            price={`+ ${format(adjustHPrice)}`}
            onClick={() =>
              update(
                state.adjustHOn
                  ? { adjustHOn: false, adjustHText: "" }
                  : { adjustHOn: true },
              )
            }
          >
            {t("pantsAdjust")}
          </OptionRow>
          {state.adjustHOn && (
            <MeasureInputRow
              label={t("adjustH")}
              text={state.adjustHText}
              onText={(v) => update({ adjustHText: v })}
              placeholder={t("adjustLengthPlaceholder")}
              unit="cm"
              error={hError}
            />
          )}
        </OptionTable>
        {/* Field-level errors: the entered length exceeds the selected size's
            chart measurement. Stays inline (next to the inputs), not below CTA. */}
        {cError && cCeil != null && (
          <p className="text-[11px] italic text-red-400 mt-1">
            {t("adjustTooLongC", { max: cCeil, size: sizeLabel })}
          </p>
        )}
        {hError && hCeil != null && (
          <p className="text-[11px] italic text-red-400 mt-1">
            {t("adjustTooLongH", { max: hCeil, size: sizeLabel })}
          </p>
        )}

        {/* Shrinkage — always shown; mandatory once any C/H value is entered,
            because a new measurement is being requested (§8.2). Blocked on mh-12,
            pending until a C/H value is entered, then selectable. */}
        <p className={"text-xs mb-1 pt-3 " + (adjustExcluded ? "text-foreground-blocked" : shrinkagePending ? "text-foreground-pending" : "text-foreground")}>{t("shrinkage")}</p>
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

        {/* Manufacturer's logo — always shown. Only tsubasa & pinac-kumite offer
            it; every other model renders both placements blocked. */}
        <p className={"text-lg font-bold leading-tight pt-5 mb-[3px]" + (mfrExcluded ? " text-foreground-blocked" : mfrPending ? " text-foreground-pending" : "")}>{t("mfrLogoTitle")}</p>
        <p className={"text-xs leading-tight mb-2 " + (mfrExcluded ? "text-foreground-blocked" : mfrPending ? "text-foreground-pending" : "text-foreground")}>{t("mfrLogoNote")}</p>
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
        </>
      }
      right={
        <>
        {/* Karate-gi figure (mirrors the obi figure). */}
        <KarateGiVector
          aria-label={t("figureAlt")}
          className="w-[82.5%] max-md:w-[65%] mx-auto select-none text-black"
        />

        {/* Model name — appears once a model is chosen. */}
        {modelName && (
          <p className="text-lg font-bold leading-tight mb-1 mt-6">{modelName}</p>
        )}

        {/* Model info — two italic "type" lines (fabric + category) then the
            description, mirroring the obi material/width type + description. */}
        {modelDef && (
          <div className={modelName ? "" : "mt-6"}>
            <p className="text-[11px] italic leading-tight text-foreground-muted">
              {t(`modelComposition.${modelDef.slug}`)}
            </p>
            <p className="text-[11px] italic leading-tight mb-1.5 text-foreground-muted">
              {t(`modelCategory.${modelDef.slug}`)}
            </p>
            <p className="text-xs leading-tight">
              {t(`modelDescription.${modelDef.slug}`)}
            </p>
          </div>
        )}

        {/* Live selected features. The "choose…" prompt stays until the core
            resolves, at which point it's replaced by the subtotal + CTA. */}
        <div className="flex flex-col mt-3 gap-0.5 leading-tight text-[11px] text-foreground-muted">
          {features.map((f, idx) => (
            <div key={idx} className="flex justify-between gap-2">
              <p className="min-w-0">{f.label}</p>
              {f.amountJpy != null && (
                <p className="whitespace-nowrap">{format(f.amountJpy)}</p>
              )}
            </div>
          ))}
          {/* Suppress the initial nothing-selected prompt; only the
              progressive prompts (after a model is chosen) are shown. */}
          {!coreReady && state.modelSlug != null && (
            <p className="italic mt-3.5">{t(startPromptKey)}</p>
          )}
        </div>

        {/* Subtotal + CTA — only once fully configured (size chosen). */}
        {coreReady && (
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
                than inline in the form. */}
            {blockingHints.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {blockingHints.map((hint, i) => (
                  <p key={i} className="text-[11px] italic leading-tight text-foreground-muted">
                    {hint}
                  </p>
                ))}
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
    ? "bg-foreground-selected text-background cursor-pointer"
    : blocked
      ? "text-foreground-blocked cursor-default"
      : selectable
        ? "text-foreground hover:bg-foreground-hover cursor-pointer"
        : "text-foreground-pending cursor-default";

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
    ? "text-foreground-pending cursor-default"
    : completed
      ? "bg-foreground-selected text-background"
      : "hover:bg-foreground-hover focus-within:bg-foreground-hover";
  const borderClass = pending ? "border-border-pending" : "border-border";

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

// A numeric measurement input (the new C/H length), shown below its adjustment
// radio. Legacy-ui style: a label, a right-aligned numeric field, and a trailing
// unit ("cm"). Never carries a price (that lives on the radio). Once the buyer
// leaves the field with a valid value, the cell adopts the "selected" fill
// (bg-foreground-selected), mirroring the embroidery input's completed state. A solid dark
// border signals an invalid entry (not strictly shorter than the size chart).
function MeasureInputRow({
  label,
  text,
  onText,
  placeholder,
  unit,
  error = false,
}: {
  label: string;
  text: string;
  onText: (v: string) => void;
  placeholder: string;
  unit?: string;
  error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  // "completed" only after the buyer leaves the field (blur) with a valid value.
  // An invalid entry (error) never takes the selected fill; the border is left
  // unchanged — the error is signalled by the red hint below the inputs.
  const completed = !focused && text.trim().length > 0 && !error;
  const cellState = completed
    ? "bg-foreground-selected text-background"
    : "hover:bg-foreground-hover focus-within:bg-foreground-hover";

  return (
    <tr>
      <td className={"px-2 py-1 border border-border " + cellState}>
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <input
            type="text"
            inputMode="decimal"
            value={text}
            placeholder={placeholder}
            onChange={(e) => onText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label={label}
            className="flex-1 min-w-0 text-right bg-transparent focus:outline-none"
          />
          {unit && (
            <span
              className={
                "whitespace-nowrap " + (completed ? "text-background" : "text-foreground-muted")
              }
            >
              {unit}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
