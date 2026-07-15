"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart/CartProvider";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import {
  indexPricingData,
  sizeChartKey,
  type GiCustomBasePriceRow,
  type GiEmbroideryPriceRow,
  type GiHemPriceRow,
  type GiHighWaistPriceRow,
  type GiModelRow,
  type GiOptionRow,
  type PricingTables,
  type SizeChartRow,
} from "@/lib/pricing/data";
import { priceLineItem, validateConfig } from "@/lib/pricing/engine";
import type {
  GiCustomConfig,
  GiEmbroidery,
  GiMeasurements,
  HemSelection,
  MfrLogo,
  PurchaseUnit,
  Shrinkage,
} from "@/lib/pricing/types";
import {
  bandBaseFor,
  customBands,
  customModels,
  GI_THREAD_COLORS,
  giThreadCategory,
  HEM_OPTIONS,
  HIGH_WAIST_SUBTRACTED_LETTERS,
  hemAllowedForModel,
  hemDisplayPrice,
  hemOptionKey,
  JACKET_LETTERS,
  PANTS_LETTERS,
  PURCHASE_UNITS,
  UNVALIDATED_LETTERS,
  unitIncludesJacket,
  unitIncludesPants,
  type GiThreadColor,
  type MeasureLetter,
} from "@/lib/gi-custom/model";
import type { GiEmbroiderySummaryField } from "@/lib/cart/types";
import type { LabelOption } from "@/lib/obi/queries";
import { KarateGiVector } from "@/components/karate-gi/KarateGiVector";

// The custom (made-to-order) karate-gi configurator (Pattern C) — HIROTA's
// flagship. A client component: it runs the PURE pricing engine against the
// reference data passed as props (no Supabase here, no per-keystroke round trip —
// AGENTS §6). The cascade model → purchase unit → size band (base price) drives
// which measurements are validated and which part-tagged optionals show;
// everything reconciles downstream on every upstream change. All price math +
// availability rules live in the engine and the typed model defs; this only
// reads the engine's itemized breakdown for the live subtotal, and the engine's
// validation result for per-field measurement errors (§10).

const MfrLogoPlacements: readonly MfrLogo[] = ["neck", "breast_neck"] as const;
const ShrinkageOptions: readonly Shrinkage[] = ["accounted", "to_add"] as const;
const CollarOptions: readonly ("thick" | "extra_thick")[] = [
  "thick",
  "extra_thick",
] as const;

// gi_options codes, used here ONLY to DISPLAY a surcharge next to a choice —
// never to price (that's the engine's job). Mirrors the engine's OPT map.
const OPT_COLLAR_THICK = "collar_thick";
const OPT_COLLAR_EXTRA = "collar_extra_thick";
const OPT_ELASTIC = "elastic_waist";
const OPT_MFR_NECK = "mfr_logo_neck";

const ALL_LETTERS = [...JACKET_LETTERS, ...PANTS_LETTERS] as const;

type MeasureMap = Record<MeasureLetter, string>;
const emptyMeasure = (): MeasureMap =>
  ALL_LETTERS.reduce((acc, l) => {
    acc[l] = "";
    return acc;
  }, {} as MeasureMap);

interface GiCustomState {
  modelSlug?: string;
  purchaseUnit?: PurchaseUnit;
  bandCode?: string;
  /** Raw measurement inputs A–J. */
  measure: MeasureMap;
  /** Jacket, kata-only. */
  collar?: "thick" | "extra_thick";
  /** Jacket, free toggles. */
  sideTies: boolean;
  chestTies: boolean;
  /** Pants, Tsubasa-only. */
  elasticWaist: boolean;
  /** Jacket. */
  mfrLogo?: MfrLogo;
  /** Non-default uniform hem selection; undefined ⇒ the free 4cm/normal default. */
  hem?: HemSelection;
  /** Pants high-waist (exact cm entered; price from the band). */
  highWaistOn: boolean;
  highWaistText: string;
  /** Global thread color for all four embroidery fields. */
  threadColor?: GiThreadColor;
  lapelText: string;
  shoulderText: string;
  chestText: string;
  pantsText: string;
  /** Body sanity-check data (required, never priced). */
  heightText: string;
  weightText: string;
  waistText: string;
  shrinkage?: Shrinkage;
  labelId: number;
}

/** Count embroidery characters (code-point aware for kanji/katakana). */
function charCount(text: string): number {
  return [...text.trim()].length;
}

/** Parse a numeric input: undefined (empty), NaN (non-numeric), or a number. */
function parseNum(s: string): number | undefined {
  const t = s.trim();
  if (t === "") return undefined;
  return Number(t);
}

export function GiCustomConfigurator({
  giModels,
  sizeCharts,
  giCustomBasePrices,
  giOptions,
  giHemPrices,
  giHighWaistPrices,
  giEmbroideryPrices,
  labels,
}: {
  giModels: GiModelRow[];
  sizeCharts: SizeChartRow[];
  giCustomBasePrices: GiCustomBasePriceRow[];
  giOptions: GiOptionRow[];
  giHemPrices: GiHemPriceRow[];
  giHighWaistPrices: GiHighWaistPriceRow[];
  giEmbroideryPrices: GiEmbroideryPriceRow[];
  labels: LabelOption[];
}) {
  const t = useTranslations("GiCustom");
  const { format } = useCurrency();
  const { addItem } = useCart();

  // Rebuild the engine's indexed PricingData once from the raw rows. Only the
  // custom-gi tables are populated; the engine's gi_custom path touches nothing
  // else.
  const data = useMemo(() => {
    const tables: PricingTables = {
      giModels,
      sizeCharts,
      giStandardPrices: [],
      giCustomBasePrices,
      giOptions,
      giHemPrices,
      giHighWaistPrices,
      giEmbroideryPrices,
      obiSizes: [],
      obiPrices: [],
      obiEmbroideryPrices: [],
      products: [],
    };
    return indexPricingData(tables);
  }, [
    giModels,
    sizeCharts,
    giCustomBasePrices,
    giOptions,
    giHemPrices,
    giHighWaistPrices,
    giEmbroideryPrices,
  ]);

  const models = useMemo(() => customModels(giModels), [giModels]);
  const modelBySlug = useMemo(
    () => new Map(models.map((m) => [m.slug, m])),
    [models],
  );
  const bands = useMemo(() => customBands(giCustomBasePrices), [giCustomBasePrices]);
  const bandByCode = useMemo(
    () => new Map(bands.map((b) => [b.bandCode, b])),
    [bands],
  );

  const defaultLabelId =
    labels.find((l) => l.name === "Hirota")?.id ?? labels[0]?.id ?? 1;

  const [state, setState] = useState<GiCustomState>({
    measure: emptyMeasure(),
    sideTies: false,
    chestTies: false,
    elasticWaist: false,
    highWaistOn: false,
    highWaistText: "",
    lapelText: "",
    shoulderText: "",
    chestText: "",
    pantsText: "",
    heightText: "",
    weightText: "",
    waistText: "",
    labelId: defaultLabelId,
  });
  const [justAdded, setJustAdded] = useState(false);

  // Reconcile downstream selections whenever an upstream axis (model / purchase
  // unit) changes. Pure over `data`. Drops any optional the new model no longer
  // offers (kata-only collar, non-normal hem on kumite, elastic off Tsubasa) and
  // any optional/measurement/text the new purchase unit hides — CLEARING the
  // associated values, not just the flags, so nothing stale reappears.
  const reconcile = useCallback(
    (s: GiCustomState): GiCustomState => {
      const def = s.modelSlug ? modelBySlug.get(s.modelSlug) : undefined;
      const isKata = def?.isKata ?? false;
      const jacket = unitIncludesJacket(s.purchaseUnit);
      const pants = unitIncludesPants(s.purchaseUnit);

      let {
        collar,
        sideTies,
        chestTies,
        elasticWaist,
        mfrLogo,
        hem,
        highWaistOn,
        highWaistText,
        lapelText,
        shoulderText,
        chestText,
        pantsText,
      } = s;
      let measure = s.measure;

      // --- Model-driven gating -------------------------------------------
      // Collar: kata only.
      if (!def || !isKata) collar = undefined;
      // Hem: kumite models may only use normal-thickness hems (default + 5/normal).
      if (hem && def && !isKata && hem.thickness !== "normal") hem = undefined;
      // Elastic waist: Tsubasa only.
      if (!def || !def.allowsElasticWaist) elasticWaist = false;

      // --- Purchase-unit gating (jacket options + A–F measurements) ------
      if (!jacket) {
        collar = undefined;
        sideTies = false;
        chestTies = false;
        mfrLogo = undefined;
        lapelText = "";
        shoulderText = "";
        chestText = "";
        measure = { ...measure };
        for (const l of JACKET_LETTERS) measure[l] = "";
      }
      // --- Purchase-unit gating (pants options + G–J measurements) -------
      if (!pants) {
        elasticWaist = false;
        highWaistOn = false;
        highWaistText = "";
        pantsText = "";
        measure = { ...measure };
        for (const l of PANTS_LETTERS) measure[l] = "";
      }

      return {
        ...s,
        collar,
        sideTies,
        chestTies,
        elasticWaist,
        mfrLogo,
        hem,
        highWaistOn,
        highWaistText,
        lapelText,
        shoulderText,
        chestText,
        pantsText,
        measure,
      };
    },
    [modelBySlug],
  );

  const update = useCallback(
    (patch: Partial<GiCustomState>) => setState((s) => reconcile({ ...s, ...patch })),
    [reconcile],
  );

  const setMeasure = useCallback(
    (letter: MeasureLetter, value: string) =>
      setState((s) => reconcile({ ...s, measure: { ...s.measure, [letter]: value } })),
    [reconcile],
  );

  const modelDef = state.modelSlug ? modelBySlug.get(state.modelSlug) : undefined;
  const band = state.bandCode ? bandByCode.get(state.bandCode) : undefined;
  const isKata = modelDef?.isKata ?? false;
  const jacket = unitIncludesJacket(state.purchaseUnit);
  const pants = unitIncludesPants(state.purchaseUnit);

  // Core = model + purchase unit + band chosen. Optionals stay pending until then.
  const coreReady =
    state.modelSlug != null && state.purchaseUnit != null && state.bandCode != null;
  const isQuote = band?.isQuote ?? false;

  // The band's top size chart row — source of the per-letter measurement ceilings
  // (NULL for the quote band, which has no top size).
  const topRow: SizeChartRow | undefined =
    band?.topSizeCode != null
      ? data.sizeCharts.get(sizeChartKey("normal", band.topSizeCode))
      : undefined;

  // High waist — a pants measurement entered as exact cm (1–13; >13 not offered).
  const hwVal = parseNum(state.highWaistText);
  const hwEntered = state.highWaistOn && state.highWaistText.trim() !== "";
  const hwValid =
    hwEntered &&
    Number.isFinite(hwVal) &&
    (hwVal as number) > 0 &&
    (hwVal as number) <= 13;
  const hwError = hwEntered && !hwValid;
  const hwNeedsValue = state.highWaistOn && !hwValid;
  const effectiveHw = hwValid ? (hwVal as number) : 0;

  // Parsed measurements actually entered (finite numbers), included in the config
  // fed to the engine's validator. The engine decides which exceed the top size;
  // H and J have the high-waist subtracted there (§8.4).
  const parsedMeasurements = useMemo(() => {
    const m: GiMeasurements = {};
    for (const l of ALL_LETTERS) {
      const inPart = JACKET_LETTERS.includes(l as (typeof JACKET_LETTERS)[number])
        ? jacket
        : pants;
      if (!inPart) continue;
      const n = parseNum(state.measure[l]);
      if (n != null && Number.isFinite(n)) m[l] = n;
    }
    return m;
  }, [state.measure, jacket, pants]);

  const thread =
    state.threadColor != null ? giThreadCategory(state.threadColor) : null;

  // Embroidery, only for fields whose part is in scope (reconcile already cleared
  // the hidden ones, but guard anyway).
  const embroidery: GiEmbroidery | undefined = (() => {
    if (thread == null) return undefined;
    const e: GiEmbroidery = {};
    if (jacket && charCount(state.lapelText) > 0)
      e.lapel = { chars: charCount(state.lapelText), thread };
    if (jacket && charCount(state.shoulderText) > 0)
      e.shoulder = { chars: charCount(state.shoulderText), thread };
    if (jacket && charCount(state.chestText) > 0)
      e.chest = { chars: charCount(state.chestText), thread };
    if (pants && charCount(state.pantsText) > 0)
      e.pants = { chars: charCount(state.pantsText), thread };
    return Object.keys(e).length > 0 ? e : undefined;
  })();

  const bodyHeightCm = parseNum(state.heightText);
  const bodyWeightKg = parseNum(state.weightText);
  const bodyWaistCm = parseNum(state.waistText);

  // The full resolved engine config (with every entered measurement + body data).
  // Kept as a plain computed value; the React Compiler memoizes it.
  const config: GiCustomConfig | null = ((): GiCustomConfig | null => {
    if (!state.modelSlug || !state.purchaseUnit || !state.bandCode) return null;
    return {
      kind: "gi_custom",
      modelSlug: state.modelSlug,
      bandCode: state.bandCode,
      purchaseUnit: state.purchaseUnit,
      collar: state.collar ?? undefined,
      sideTies: state.sideTies,
      chestTies: state.chestTies,
      elasticWaist: state.elasticWaist,
      mfrLogo: state.mfrLogo ?? undefined,
      hem: state.hem,
      highWaistCm: hwValid ? (hwVal as number) : undefined,
      embroidery,
      labelId: state.labelId,
      shrinkage: state.shrinkage,
      bodyHeightCm: Number.isFinite(bodyHeightCm) ? bodyHeightCm : undefined,
      bodyWeightKg: Number.isFinite(bodyWeightKg) ? bodyWeightKg : undefined,
      bodyWaistCm: Number.isFinite(bodyWaistCm) ? bodyWaistCm : undefined,
      measurements:
        Object.keys(parsedMeasurements).length > 0 ? parsedMeasurements : undefined,
    };
  })();

  // The engine validates the FULL config (measurements included). We read its
  // result for per-field measurement errors and the add-to-cart gate — the
  // validation logic lives in the engine, never here (§10).
  const validation = config ? validateConfig(config, data) : null;
  const measurementErrorFields = new Set<string>(
    validation && !validation.ok
      ? validation.errors
          .filter((e) => e.code === "measurement_exceeds" && e.field)
          .map((e) => e.field as string)
      : [],
  );

  // The live price. Measurements never affect the price (the band + options do),
  // so we price a measurement-free copy — always engine-valid once model + unit +
  // band resolve — keeping the subtotal alive even while a measurement is still
  // out of range. `above_8` returns a quote (no total).
  const priceConfig: GiCustomConfig | null = config
    ? { ...config, measurements: undefined }
    : null;
  const breakdown =
    priceConfig && validateConfig(priceConfig, data).ok
      ? priceLineItem(priceConfig, data)
      : null;

  // ---- Per-letter measurement helpers -----------------------------------
  const letterState = (l: MeasureLetter) => {
    const raw = state.measure[l];
    const entered = raw.trim() !== "";
    const n = parseNum(raw);
    const finite = n != null && Number.isFinite(n) && n > 0;
    const validated = !UNVALIDATED_LETTERS.has(l);
    const exceeds = validated && measurementErrorFields.has(l);
    return {
      entered,
      finite,
      exceeds,
      error: entered && (!finite || exceeds),
      ok: finite && !exceeds,
    };
  };

  // The max the size chart allows for a letter (H/J add the effective high waist
  // back, mirroring the engine's subtraction). Display-only, for the hint text.
  const letterMax = (l: MeasureLetter): number | undefined => {
    if (!topRow) return undefined;
    const base = topRow[l] as number;
    return HIGH_WAIST_SUBTRACTED_LETTERS.has(l) ? base + effectiveHw : base;
  };

  const requiredLetters: MeasureLetter[] = [
    ...(jacket ? JACKET_LETTERS : []),
    ...(pants ? PANTS_LETTERS : []),
  ];
  const measurementsComplete =
    coreReady && requiredLetters.every((l) => letterState(l).ok || (UNVALIDATED_LETTERS.has(l) && letterState(l).finite));
  const anyMeasurementError = requiredLetters.some((l) => letterState(l).error);

  // Body data — all three required (positive numbers).
  const bodyComplete =
    Number.isFinite(bodyHeightCm) &&
    (bodyHeightCm as number) > 0 &&
    Number.isFinite(bodyWeightKg) &&
    (bodyWeightKg as number) > 0 &&
    Number.isFinite(bodyWaistCm) &&
    (bodyWaistCm as number) > 0;

  // Shrinkage is required — a real garment is being measured to order (§8.4).
  const shrinkageChosen = state.shrinkage != null;

  // A thread color with no embroidery text anywhere is a meaningless selection.
  const embFields = [
    { key: "lapel" as const, text: state.lapelText, show: jacket, set: (v: string) => update({ lapelText: v }) },
    { key: "shoulder" as const, text: state.shoulderText, show: jacket, set: (v: string) => update({ shoulderText: v }) },
    { key: "chest" as const, text: state.chestText, show: jacket, set: (v: string) => update({ chestText: v }) },
    { key: "pants" as const, text: state.pantsText, show: pants, set: (v: string) => update({ pantsText: v }) },
  ];
  const threadWithoutText =
    state.threadColor != null &&
    embFields.filter((f) => f.show).every((f) => charCount(f.text) === 0);

  const canAdd =
    coreReady &&
    !isQuote &&
    breakdown != null &&
    !breakdown.quote &&
    breakdown.unitSubtotalJpy != null &&
    validation != null &&
    validation.ok &&
    measurementsComplete &&
    !anyMeasurementError &&
    !hwNeedsValue &&
    shrinkageChosen &&
    bodyComplete &&
    !threadWithoutText;

  const labelName = labels.find((l) => l.id === state.labelId)?.name ?? "Hirota";
  const modelName = modelDef ? t(`modelNames.${modelDef.slug}`) : null;

  // Display prices for the option rows (read straight from the loaded options —
  // display only; the engine is what actually prices them).
  const collarPrice = (which: "thick" | "extra_thick") =>
    data.options.get(which === "thick" ? OPT_COLLAR_THICK : OPT_COLLAR_EXTRA)?.price ?? 0;
  const elasticPrice = data.options.get(OPT_ELASTIC)?.price ?? 0;
  const mfrLogoPrice = data.options.get(OPT_MFR_NECK)?.price ?? 0;
  const embroideryRate = (color: GiThreadColor): number =>
    data.giEmbroidery.get(giThreadCategory(color)) ?? 0;
  const threadColorSuffix =
    state.threadColor != null ? ` (${t(`threadColorsShort.${state.threadColor}`)})` : "";

  // ---- Right-panel live features, paired positionally with the engine's
  // breakdown lines (base, collar, elastic, mfr-logo, hem, high-waist, then
  // embroidery lapel/shoulder/chest/pants — exactly priceGiCustom's order). ----
  const features: { label: string; amountJpy?: number }[] = [];
  if (coreReady && breakdown && band && state.purchaseUnit) {
    let i = 0;
    const baseAmt = breakdown.lines[i++]?.amountJpy;
    const collarAmt = state.collar && jacket ? breakdown.lines[i++]?.amountJpy : undefined;
    const elasticAmt = state.elasticWaist && pants ? breakdown.lines[i++]?.amountJpy : undefined;
    const mfrAmt = state.mfrLogo && jacket ? breakdown.lines[i++]?.amountJpy : undefined;
    const hemAmt = state.hem ? breakdown.lines[i++]?.amountJpy : undefined;
    const hwAmt = pants && hwValid ? breakdown.lines[i++]?.amountJpy : undefined;
    const embAmt: Partial<Record<string, number | undefined>> = {};
    for (const f of embFields) {
      if (f.show && charCount(f.text) > 0 && thread != null) {
        embAmt[f.key] = breakdown.lines[i++]?.amountJpy;
      }
    }

    features.push({
      label: `${t("giLine").toLowerCase()}: ${t(`modelShort.${state.modelSlug!}`)} · ${t(`purchaseUnitsShort.${state.purchaseUnit}`)} · ${t(`bandsShort.${band.bandCode}`)}`,
      amountJpy: baseAmt,
    });
    if (state.collar && jacket) {
      features.push({ label: `${t(`collarOptions.${state.collar}`).toLowerCase()}`, amountJpy: collarAmt });
    }
    if (state.sideTies && jacket) features.push({ label: t("sideTies").toLowerCase() });
    if (state.chestTies && jacket) features.push({ label: t("chestTies").toLowerCase() });
    if (state.hem) {
      features.push({
        label: `${t("hems").toLowerCase()}: ${t(`hemOptions.${hemOptionKey(state.hem)}`)}`,
        amountJpy: hemAmt,
      });
    }
    if (pants && hwValid) {
      features.push({ label: `${t("highWaist").toLowerCase()}: ${hwVal}cm`, amountJpy: hwAmt });
    }
    if (state.elasticWaist && pants) {
      features.push({ label: t("elasticWaist").toLowerCase(), amountJpy: elasticAmt });
    }
    for (const f of embFields) {
      if (f.show && charCount(f.text) > 0 && thread != null) {
        features.push({
          label: `${t(`embroideryFieldsShort.${f.key}`).toLowerCase()}: ${f.text.trim()}${threadColorSuffix}`,
          amountJpy: embAmt[f.key],
        });
      }
    }
    if (state.mfrLogo && jacket) {
      features.push({
        label: `${t("mfrLogo").toLowerCase()}: ${t(`mfrLogoPlacementsShort.${state.mfrLogo}`)}`,
        amountJpy: mfrAmt,
      });
    }
    if (state.shrinkage) {
      features.push({
        label: `${t("shrinkage").toLowerCase()}: ${t(`shrinkageOptions.${state.shrinkage}`)}`,
      });
    }
    features.push({ label: `${t("label").toLowerCase()}: ${labelName}` });
  }

  // Prompt copy narrows to the first still-missing core axis.
  const startPromptKey =
    state.modelSlug == null
      ? "startPromptModel"
      : state.purchaseUnit == null
        ? "startPromptUnit"
        : "startPromptBand";

  // What's still blocking add-to-cart (surfaced below the button).
  const blockingHints: string[] = [];
  if (coreReady && !isQuote) {
    if (!measurementsComplete && !anyMeasurementError) blockingHints.push(t("measureNeedsAll"));
    if (hwNeedsValue) blockingHints.push(t("highWaistNeedsValue"));
    if (!shrinkageChosen) blockingHints.push(t("shrinkageRequired"));
    if (!bodyComplete) blockingHints.push(t("bodyNeedsAll"));
    if (threadWithoutText) blockingHints.push(t("threadNeedsText"));
  }

  function handleAdd() {
    if (!canAdd || !config || breakdown == null || breakdown.unitSubtotalJpy == null) return;
    // Re-price the FULL config (measurements included) for the stored snapshot;
    // canAdd guarantees it is engine-valid, so this never throws.
    const snapshotBreakdown = priceLineItem(config, data);
    if (snapshotBreakdown.unitSubtotalJpy == null) return;

    const embroiderySummary: GiEmbroiderySummaryField[] = [];
    for (const f of embFields) {
      const chars = charCount(f.text);
      if (f.show && chars > 0 && thread != null) {
        embroiderySummary.push({ field: f.key, chars, text: f.text.trim() });
      }
    }

    addItem({
      kind: "configured",
      productId: 0, // configured, not a `products` row; 0 = sentinel.
      name: modelDef
        ? {
            en:
              modelDef.nameJa === modelDef.nameEn
                ? modelDef.nameEn
                : `${modelDef.nameEn} (${modelDef.nameJa})`,
            ja: modelDef.nameJa,
          }
        : { en: "Karate-gi", ja: "空手衣" },
      unitPriceJpy: snapshotBreakdown.unitSubtotalJpy,
      config: {
        kind: "gi_custom",
        config,
        breakdown: snapshotBreakdown,
        summary: {
          modelSlug: config.modelSlug,
          purchaseUnit: config.purchaseUnit,
          bandCode: config.bandCode,
          measurements: config.measurements ?? {},
          collar: config.collar ?? undefined,
          sideTies: config.sideTies ?? false,
          chestTies: config.chestTies ?? false,
          elasticWaist: config.elasticWaist ?? false,
          mfrLogo: config.mfrLogo ?? undefined,
          hem: config.hem,
          highWaistCm: config.highWaistCm,
          threadColorKey:
            embroiderySummary.length > 0 ? state.threadColor : undefined,
          embroidery: embroiderySummary,
          shrinkage: config.shrinkage,
          bodyHeightCm: config.bodyHeightCm,
          bodyWeightKg: config.bodyWeightKg,
          bodyWaistCm: config.bodyWaistCm,
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
      {/* LEFT — the cascade + part-tagged optionals                       */}
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
              {t(`modelNames.${m.slug}`)}
            </OptionRow>
          ))}
        </OptionTable>

        {/* Purchase unit — selectable once a model is chosen. Drives which
            measurements are validated and which optionals show. */}
        <p className="text-lg font-bold pt-5 mb-[3px]">{t("purchaseUnit")}</p>
        <p className="text-xs text-foreground leading-tight mb-2">{t("purchaseUnitNote")}</p>
        <OptionTable>
          {PURCHASE_UNITS.map((u) => (
            <OptionRow
              key={u}
              selected={state.purchaseUnit === u}
              selectable={state.modelSlug != null}
              onClick={() =>
                update({ purchaseUnit: state.purchaseUnit === u ? undefined : u })
              }
            >
              {t(`purchaseUnits.${u}`)}
            </OptionRow>
          ))}
        </OptionTable>

        {/* Size band — sets the base price (× the purchase-unit multiplier).
            "above 8" is quote-on-request: selectable, but priced as a quote. */}
        <p className="text-lg font-bold pt-5 mb-[3px]">{t("band")}</p>
        <p className="text-xs text-foreground leading-tight mb-2">{t("bandNote")}</p>
        <OptionTable>
          {bands.map((b) => {
            const base = bandBaseFor(b, state.purchaseUnit);
            return (
              <OptionRow
                key={b.bandCode}
                selected={state.bandCode === b.bandCode}
                selectable={state.modelSlug != null && state.purchaseUnit != null}
                price={
                  b.isQuote
                    ? t("quoteOnRequest")
                    : base != null
                      ? format(base)
                      : undefined
                }
                onClick={() =>
                  update({ bandCode: state.bandCode === b.bandCode ? undefined : b.bandCode })
                }
              >
                {t(`bands.${b.bandCode}`)}
              </OptionRow>
            );
          })}
        </OptionTable>

        {/* Everything below is pending until the core (model + unit + band) is
            chosen. When the band is "above 8" the measurements/optionals still
            render, but add-to-cart is disabled (quote on request). */}

        {/* Measurements — jacket A–F and/or pants G–J per the purchase unit.
            Validated against the band's top size (F collected but not size-checked;
            H/J have the high waist subtracted). */}
        {coreReady && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("measurements")}</p>
            <p className="text-xs text-foreground leading-tight mb-2">
              {isQuote ? t("measurementsNoteQuote") : t("measurementsNote")}
            </p>
            <OptionTable>
              {requiredLetters.map((l) => {
                const ls = letterState(l);
                return (
                  <MeasureInputRow
                    key={l}
                    label={t(`measureLabels.${l}`)}
                    text={state.measure[l]}
                    onText={(v) => setMeasure(l, v)}
                    placeholder={t("measurePlaceholder")}
                    unit="cm"
                    error={ls.error}
                  />
                );
              })}
            </OptionTable>
            {/* Per-letter "too large" hints, inline under the inputs. */}
            {requiredLetters.map((l) => {
              const ls = letterState(l);
              const max = letterMax(l);
              if (!ls.exceeds || max == null) return null;
              return (
                <p key={l} className="text-[11px] italic text-red-400 mt-1">
                  {t("measureExceeds", {
                    letter: l.toUpperCase(),
                    max,
                    size: band?.topSizeCode ?? "",
                  })}
                </p>
              );
            })}
          </>
        )}

        {/* Collar thickness — jacket, kata only (kumite renders it blocked). */}
        {coreReady && jacket && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("collar")}</p>
            <p className="text-xs text-foreground leading-tight mb-2">{t("collarNote")}</p>
            <OptionTable>
              {CollarOptions.map((c) => (
                <OptionRow
                  key={c}
                  selected={state.collar === c}
                  selectable={isKata}
                  blocked={!isKata}
                  price={`+ ${format(collarPrice(c))}`}
                  onClick={() => update({ collar: state.collar === c ? undefined : c })}
                >
                  {t(`collarOptions.${c}`)}
                </OptionRow>
              ))}
            </OptionTable>
          </>
        )}

        {/* Ties — jacket, free toggles (all models). */}
        {coreReady && jacket && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("ties")}</p>
            <OptionTable>
              <OptionRow
                selected={state.sideTies}
                selectable
                price={t("free")}
                onClick={() => update({ sideTies: !state.sideTies })}
              >
                {t("sideTies")}
              </OptionRow>
              <OptionRow
                selected={state.chestTies}
                selectable
                price={t("free")}
                onClick={() => update({ chestTies: !state.chestTies })}
              >
                {t("chestTies")}
              </OptionRow>
            </OptionTable>
          </>
        )}

        {/* Hems — a single uniform width/thickness applied to the bought part(s);
            price is the sum of the included parts' rows. Default 4cm/normal is
            free. kumite models may only use the normal-thickness rows. */}
        {coreReady && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("hems")}</p>
            <p className="text-xs text-foreground leading-tight mb-2">{t("hemsNote")}</p>
            <OptionTable>
              {HEM_OPTIONS.map((o) => {
                const allowed = hemAllowedForModel(isKata, o);
                const selected = o.isDefault
                  ? state.hem == null
                  : state.hem?.widthCm === o.widthCm && state.hem?.thickness === o.thickness;
                const price = o.isDefault
                  ? t("free")
                  : `+ ${format(hemDisplayPrice(data, state.purchaseUnit!, o))}`;
                return (
                  <OptionRow
                    key={hemOptionKey(o)}
                    selected={selected}
                    selectable={allowed}
                    blocked={!allowed}
                    price={price}
                    onClick={() =>
                      update({
                        hem: o.isDefault
                          ? undefined
                          : { widthCm: o.widthCm, thickness: o.thickness },
                      })
                    }
                  >
                    {t(`hemOptions.${hemOptionKey(o)}`)}
                  </OptionRow>
                );
              })}
            </OptionTable>
          </>
        )}

        {/* High waist — pants; exact cm entered, price from the band. */}
        {coreReady && pants && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("highWaist")}</p>
            <p className="text-xs text-foreground leading-tight mb-2">{t("highWaistNote")}</p>
            <OptionTable>
              <OptionRow
                selected={state.highWaistOn}
                selectable
                onClick={() =>
                  update(
                    state.highWaistOn
                      ? { highWaistOn: false, highWaistText: "" }
                      : { highWaistOn: true },
                  )
                }
              >
                {t("highWaistToggle")}
              </OptionRow>
              {state.highWaistOn && (
                <MeasureInputRow
                  label={t("highWaistLabel")}
                  text={state.highWaistText}
                  onText={(v) => update({ highWaistText: v })}
                  placeholder={t("measurePlaceholder")}
                  unit="cm"
                  error={hwError}
                />
              )}
            </OptionTable>
            {hwError && (
              <p className="text-[11px] italic text-red-400 mt-1">{t("highWaistTooBig")}</p>
            )}
          </>
        )}

        {/* Elastic waist — pants, Tsubasa only (blocked elsewhere). Does not
            replace the high waist. */}
        {coreReady && pants && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("elasticWaistTitle")}</p>
            <p className="text-xs text-foreground leading-tight mb-2">{t("elasticNote")}</p>
            <OptionTable>
              <OptionRow
                selected={state.elasticWaist}
                selectable={modelDef?.allowsElasticWaist ?? false}
                blocked={!(modelDef?.allowsElasticWaist ?? false)}
                price={`+ ${format(elasticPrice)}`}
                onClick={() => update({ elasticWaist: !state.elasticWaist })}
              >
                {t("elasticWaist")}
              </OptionRow>
            </OptionTable>
          </>
        )}

        {/* Manufacturer's logo — jacket, all custom models. */}
        {coreReady && jacket && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("mfrLogoTitle")}</p>
            <p className="text-xs text-foreground leading-tight mb-2">{t("mfrLogoNote")}</p>
            <OptionTable>
              {MfrLogoPlacements.map((placement) => (
                <OptionRow
                  key={placement}
                  selected={state.mfrLogo === placement}
                  selectable
                  price={`+ ${format(mfrLogoPrice)}`}
                  onClick={() =>
                    update({ mfrLogo: state.mfrLogo === placement ? undefined : placement })
                  }
                >
                  {t(`mfrLogoPlacements.${placement}`)}
                </OptionRow>
              ))}
            </OptionTable>
          </>
        )}

        {/* Embroidery — one global thread color; up to four fields (per part). */}
        {coreReady && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("embroidery")}</p>
            <p className="text-xs mb-1 text-foreground">{t("threadColorTitle")}</p>
            <OptionTable>
              {GI_THREAD_COLORS.map((tc) => (
                <OptionRow
                  key={tc}
                  selected={state.threadColor === tc}
                  selectable
                  price={`+ ${format(embroideryRate(tc))} ${t("perChar")}`}
                  onClick={() =>
                    update({ threadColor: state.threadColor === tc ? undefined : tc })
                  }
                >
                  {t(`threadColors.${tc}`)}
                </OptionRow>
              ))}
            </OptionTable>
            <p className="text-xs mb-1 text-foreground pt-2">{t("embroiderySubtitle")}</p>
            <OptionTable>
              {embFields
                .filter((f) => f.show)
                .map((f) => (
                  <TextInputRow
                    key={f.key}
                    label={t(`embroideryFields.${f.key}`)}
                    text={f.text}
                    onText={f.set}
                    placeholder={t("embroideryPlaceholder")}
                    pending={state.threadColor == null}
                  />
                ))}
            </OptionTable>
          </>
        )}

        {/* Shrinkage — required (a real garment is being measured to order). */}
        {coreReady && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("shrinkage")}</p>
            <p className="text-xs text-foreground leading-tight mb-2">{t("shrinkageNote")}</p>
            <OptionTable>
              {ShrinkageOptions.map((opt) => (
                <OptionRow
                  key={opt}
                  selected={state.shrinkage === opt}
                  selectable
                  onClick={() =>
                    update({ shrinkage: state.shrinkage === opt ? undefined : opt })
                  }
                >
                  {t(`shrinkageOptions.${opt}`)}
                </OptionRow>
              ))}
            </OptionTable>
          </>
        )}

        {/* Body data — required sanity-check fields, stored but never priced. */}
        {coreReady && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("bodyData")}</p>
            <p className="text-xs text-foreground leading-tight mb-2">{t("bodyNote")}</p>
            <OptionTable>
              <MeasureInputRow
                label={t("bodyHeight")}
                text={state.heightText}
                onText={(v) => update({ heightText: v })}
                placeholder={t("measurePlaceholder")}
                unit="cm"
              />
              <MeasureInputRow
                label={t("bodyWeight")}
                text={state.weightText}
                onText={(v) => update({ weightText: v })}
                placeholder={t("measurePlaceholder")}
                unit="kg"
              />
              <MeasureInputRow
                label={t("bodyWaist")}
                text={state.waistText}
                onText={(v) => update({ waistText: v })}
                placeholder={t("measurePlaceholder")}
                unit="cm"
              />
            </OptionTable>
          </>
        )}

        {/* Label — free, defaults to Hirota. */}
        {coreReady && (
          <>
            <p className="text-lg font-bold pt-5 mb-[3px]">{t("label")}</p>
            <p className="text-xs text-foreground leading-tight mb-2">{t("labelSpecNote")}</p>
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
          </>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* RIGHT — figure placeholder, model info, live features + CTA      */}
      {/* ---------------------------------------------------------------- */}
      <div className="basis-[40%] flex flex-col mt-8 mb-5 mx-8 min-w-0">
        <KarateGiVector
          aria-label={t("figureAlt")}
          className="w-[73%] mx-auto select-none text-black"
        />

        {modelName && (
          <p className="text-lg font-bold leading-tight mb-1 mt-6">{modelName}</p>
        )}

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

        <div className="flex flex-col mt-3 gap-0.5 leading-tight text-[11px] text-foreground-muted">
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

        {coreReady && (
          <>
            {/* Quote-on-request state for "above 8": no price, add disabled. */}
            {isQuote ? (
              <p className="mt-3.5 text-xs italic text-foreground leading-tight">
                {t("quoteExplainer")}
              </p>
            ) : (
              <div className="flex justify-between mt-3">
                <p className="text-base font-bold leading-tight">{t("subtotal")}</p>
                <p className="text-base font-bold leading-tight">
                  {breakdown?.unitSubtotalJpy != null
                    ? format(breakdown.unitSubtotalJpy)
                    : "—"}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className={
                "mt-2.5 text-xs font-bold border tracking-wide py-1 " +
                (justAdded
                  ? "bg-foreground-selected text-background border-border cursor-pointer"
                  : canAdd
                    ? "bg-transparent text-foreground border-border hover:bg-foreground-hover active:bg-foreground-selected active:text-background cursor-pointer"
                    : "bg-transparent text-foreground-blocked border-border-blocked")
              }
            >
              {justAdded ? t("added") : isQuote ? t("quoteCta") : t("addToCart")}
            </button>

            {!isQuote && blockingHints.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-0.5">
                {blockingHints.map((hint, i) => (
                  <p key={i} className="text-[11px] italic text-foreground-muted">
                    {hint}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational primitives — the legacy option-table look. Duplicated from the
// standard-gi configurator (kept local so this sprint leaves the others
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

// A free-text embroidery input row (thread is chosen globally).
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

// A numeric measurement input. Legacy-ui style: a label, a right-aligned numeric
// field, and a trailing unit. Never carries a price. Adopts the "selected" fill
// once a valid value is left in it; `error` marks an invalid/out-of-range entry
// (the explanatory hint is rendered separately, below the table).
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
