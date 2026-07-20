"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
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
import { displayLabelName } from "@/lib/cart/format";
import type { LabelOption } from "@/lib/obi/queries";
import { KarateGiVector } from "@/components/karate-gi/KarateGiVector";
import { ConfiguratorLayout } from "@/components/configurator/ConfiguratorLayout";

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
  /** Pants high-waist: the selected band (min/max cm; price from the band),
   *  plus the exact cm entered within it. undefined band ⇒ no high waist. */
  highWaistBand?: { minCm: number; maxCm: number };
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
  labelId?: number;
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
  headerField,
}: {
  giModels: GiModelRow[];
  sizeCharts: SizeChartRow[];
  giCustomBasePrices: GiCustomBasePriceRow[];
  giOptions: GiOptionRow[];
  giHemPrices: GiHemPriceRow[];
  giHighWaistPrices: GiHighWaistPriceRow[];
  giEmbroideryPrices: GiEmbroideryPriceRow[];
  labels: LabelOption[];
  /** Optional node rendered as the form's FIRST field (the /karate-gi
   *  tailoring-mode radio lives here, above "Karate-gi model"). */
  headerField?: React.ReactNode;
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
  // High-waist bands (each a cm range → price), low-to-high for the radio list.
  const highWaistBands = useMemo(
    () => [...data.highWaistBands].sort((a, b) => a.minCm - b.minCm),
    [data.highWaistBands],
  );

  const [state, setState] = usePersistentState<GiCustomState>(
    // v2: label is no longer defaulted to Hirota — bumped so pre-existing saved
    // payloads (which still carry the old default labelId) are dropped instead of
    // shallow-merged back in and resurfacing as a selected label.
    "hirota:config:gi-custom:v2",
    {
      measure: emptyMeasure(),
      sideTies: false,
      chestTies: false,
      elasticWaist: false,
      highWaistText: "",
      lapelText: "",
      shoulderText: "",
      chestText: "",
      pantsText: "",
      heightText: "",
      weightText: "",
      waistText: "",
      // Label is a required, un-defaulted choice — like every other section, the
      // buyer must pick one (no auto-selected "Hirota").
    },
  );
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

      // Cascade: dropping an upstream axis clears the downstream ones so nothing
      // dangles — a purchase unit with no model, or a size band with no purchase
      // unit (band selection is only meaningful once a unit sets the multiplier).
      let purchaseUnit = s.purchaseUnit;
      let bandCode = s.bandCode;
      if (!s.modelSlug) purchaseUnit = undefined;
      if (!purchaseUnit) bandCode = undefined;

      const jacket = unitIncludesJacket(purchaseUnit);
      const pants = unitIncludesPants(purchaseUnit);

      let {
        collar,
        sideTies,
        chestTies,
        elasticWaist,
        mfrLogo,
        hem,
        highWaistBand,
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
        highWaistBand = undefined;
        highWaistText = "";
        pantsText = "";
        measure = { ...measure };
        for (const l of PANTS_LETTERS) measure[l] = "";
      }

      // --- Core gating: everything below Size band ----------------------
      // The entire form below the Size band (measurements, every option,
      // embroidery, label — plus shrinkage and body data) is gated on
      // `coreReady` (model + unit + band). Dropping any of those axes — most
      // notably de-selecting the band — must wipe ALL of it, not just the flags:
      // nothing should linger selected/filled while the section sits pending.
      let { shrinkage, heightText, weightText, waistText, threadColor, labelId } = s;
      const coreReady =
        s.modelSlug != null && purchaseUnit != null && bandCode != null;
      if (!coreReady) {
        measure = emptyMeasure();
        collar = undefined;
        sideTies = false;
        chestTies = false;
        elasticWaist = false;
        mfrLogo = undefined;
        hem = undefined;
        highWaistBand = undefined;
        highWaistText = "";
        threadColor = undefined;
        lapelText = "";
        shoulderText = "";
        chestText = "";
        pantsText = "";
        shrinkage = undefined;
        heightText = "";
        weightText = "";
        waistText = "";
        labelId = undefined;
      }

      return {
        ...s,
        purchaseUnit,
        bandCode,
        collar,
        sideTies,
        chestTies,
        elasticWaist,
        mfrLogo,
        hem,
        highWaistBand,
        highWaistText,
        lapelText,
        shoulderText,
        chestText,
        pantsText,
        measure,
        shrinkage,
        heightText,
        weightText,
        waistText,
        threadColor,
        labelId,
      };
    },
    [modelBySlug],
  );

  const update = useCallback(
    (patch: Partial<GiCustomState>) => setState((s) => reconcile({ ...s, ...patch })),
    [reconcile, setState],
  );

  const setMeasure = useCallback(
    (letter: MeasureLetter, value: string) =>
      setState((s) => reconcile({ ...s, measure: { ...s.measure, [letter]: value } })),
    [reconcile, setState],
  );

  const modelDef = state.modelSlug ? modelBySlug.get(state.modelSlug) : undefined;
  const band = state.bandCode ? bandByCode.get(state.bandCode) : undefined;
  const isKata = modelDef?.isKata ?? false;
  const jacket = unitIncludesJacket(state.purchaseUnit);
  const pants = unitIncludesPants(state.purchaseUnit);

  // A purchase unit alone decides the part-exclusion blocks (points 1/2): a
  // single-piece unit blocks the other piece's fields immediately, without
  // waiting for the size band. Interactivity of the IN-scope fields still needs
  // the full core (below) because prices come from the band.
  const unitChosen = state.purchaseUnit != null;

  // Likewise, the MODEL alone decides the model-rule blocks (kumite can't touch
  // collar/hem thickness, elastic waist is Tsubasa-only). These fire the moment
  // a model is picked — no need to wait for the purchase unit or the band.
  const modelChosen = modelDef != null;

  // Core = model + purchase unit + band chosen. Optionals stay pending until then.
  const coreReady =
    state.modelSlug != null && state.purchaseUnit != null && state.bandCode != null;
  const isQuote = band?.isQuote ?? false;

  // Section-header tint (mirrors ready-made / obi): each section's title (and its
  // description) follows the state of the options right below it — `pending`
  // while its upstream axis is unresolved, `blocked` when a decided rule (a
  // purchase-unit part exclusion, or a model rule) blocks the WHOLE section.
  // blocked wins over pending; each `*Pending` is "not blocked and not yet
  // selectable", exactly the inert-but-not-struck state of the rows below.
  const allowsElastic = modelDef?.allowsElasticWaist ?? false;
  const unitPending = !modelChosen;
  const bandPending = !(modelChosen && unitChosen);
  // Measurements + shrinkage + body data: pending until the core resolves; no
  // whole-section blocked state (single-piece units only block SOME letters).
  const measurementsPending = !coreReady;
  const tiesBlocked = unitChosen && !jacket;
  const tiesPending = !tiesBlocked && !(coreReady && jacket);
  const elasticBlocked = (modelChosen && !allowsElastic) || (unitChosen && !pants);
  const elasticPending = !elasticBlocked && !(coreReady && pants && allowsElastic);
  const highWaistBlocked = unitChosen && !pants;
  const highWaistPending = !highWaistBlocked && !(coreReady && pants);
  const collarBlocked = (unitChosen && !jacket) || (modelChosen && !isKata);
  const collarPending = !collarBlocked && !(coreReady && jacket && isKata);
  // Hems always keep the normal-thickness path (5cm-normal) available, so the
  // section is never fully blocked — only pending until the core resolves.
  const hemsPending = !coreReady;
  const embroideryPending = !coreReady; // thread-color table
  const embroideryEndsPending = !coreReady || state.threadColor == null; // fields
  const mfrBlocked = unitChosen && !jacket;
  const mfrPending = !mfrBlocked && !(coreReady && jacket);
  const labelPending = !coreReady;

  // The band's top size chart row — source of the per-letter measurement ceilings
  // (NULL for the quote band, which has no top size).
  const topRow: SizeChartRow | undefined =
    band?.topSizeCode != null
      ? data.sizeCharts.get(sizeChartKey("normal", band.topSizeCode))
      : undefined;

  // High waist — a pants measurement entered as exact cm (1–13; >13 not offered).
  const hwBand = state.highWaistBand;
  const hwVal = parseNum(state.highWaistText);
  const hwEntered = hwBand != null && state.highWaistText.trim() !== "";
  // The exact cm must fall inside the selected band (its price is the band's).
  const hwValid =
    hwEntered &&
    hwBand != null &&
    Number.isFinite(hwVal) &&
    (hwVal as number) >= hwBand.minCm &&
    (hwVal as number) <= hwBand.maxCm;
  const hwError = hwEntered && !hwValid;
  const hwNeedsValue = hwBand != null && !hwValid;
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
  // Whether a measurement letter belongs to a part in the chosen purchase unit
  // (jacket A–F / pants G–J). Letters outside the unit render pending.
  const letterInScope = (l: MeasureLetter) =>
    JACKET_LETTERS.includes(l as (typeof JACKET_LETTERS)[number]) ? jacket : pants;

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

  // Label is required — no default; the buyer must pick one like any other
  // section.
  const labelChosen = state.labelId != null;

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
    labelChosen &&
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

    // Push order mirrors the left-hand form top-to-bottom (§9): base line, then
    // the entered measurements A–J, their shrinkage and the body data, then
    // Ties → Elastic waist → High waist → Collar → Hems → Embroidery →
    // Manufacturer's logo → Label. The amounts were read above in the ENGINE's
    // line order, so reordering the pushes here is purely presentational. The
    // model itself lives in the panel title (and the cart-line name), so the
    // base line reads "fully-tailored · full set · 6 to 8".
    features.push({
      label: `${t("giLine")} · ${t(`purchaseUnitsShort.${state.purchaseUnit}`)} · ${t(`bandsShort.${band.bandCode}`)}`,
      amountJpy: baseAmt,
    });
    for (const l of ALL_LETTERS) {
      const v = parsedMeasurements[l];
      if (v != null) features.push({ label: `${l.toUpperCase()} = ${v}` });
    }
    if (state.shrinkage) {
      features.push({ label: t(`shrinkageShort.${state.shrinkage}`) });
    }
    if (bodyComplete) {
      features.push({
        label: `${bodyHeightCm}cm · ${bodyWeightKg}kg · ${bodyWaistCm}cm`,
      });
    }
    if (state.sideTies && jacket) features.push({ label: t("sideTiesShort") });
    if (state.chestTies && jacket) features.push({ label: t("chestTiesShort") });
    if (state.elasticWaist && pants) {
      features.push({ label: t("elasticWaistShort"), amountJpy: elasticAmt });
    }
    if (pants && hwValid) {
      features.push({ label: `${t("highWaistLabel").toLowerCase()} = ${hwVal}cm`, amountJpy: hwAmt });
    }
    if (state.collar && jacket) {
      features.push({ label: `${t(`collarOptions.${state.collar}`).toLowerCase()}`, amountJpy: collarAmt });
    }
    if (state.hem) {
      features.push({
        label: t("hemLine", { option: t(`hemOptions.${hemOptionKey(state.hem)}`) }),
        amountJpy: hemAmt,
      });
    }
    for (const f of embFields) {
      if (f.show && charCount(f.text) > 0 && thread != null) {
        features.push({
          label: `${t(`embroideryFieldsShort.${f.key}`)} = ${f.text.trim()}${threadColorSuffix}`,
          amountJpy: embAmt[f.key],
        });
      }
    }
    if (state.mfrLogo && jacket) {
      features.push({
        label: t(`mfrLogoShort.${state.mfrLogo}`),
        amountJpy: mfrAmt,
      });
    }
    if (labelChosen) {
      features.push({ label: t("labelLine", { name: displayLabelName(labelName) }) });
    }
  }

  // What's still blocking add-to-cart (surfaced below the button).
  const blockingHints: string[] = [];
  if (coreReady && !isQuote) {
    if (!measurementsComplete && !anyMeasurementError) blockingHints.push(t("measureNeedsAll"));
    if (hwNeedsValue) blockingHints.push(t("highWaistNeedsValue"));
    if (!shrinkageChosen) blockingHints.push(t("shrinkageRequired"));
    if (!bodyComplete) blockingHints.push(t("bodyNeedsAll"));
    if (!labelChosen) blockingHints.push(t("labelRequired"));
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
    <ConfiguratorLayout
      variant="dogi"
      left={
        <>
        {headerField}
        {/* Model — no upstream: always selectable. */}
        <p className={"text-lg font-bold mb-[3px]" + (headerField ? " pt-5" : "")}>{t("model")}</p>
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

        {/* Purchase unit — selectable once a model is chosen. Drives which
            measurements are validated and which optionals show. */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (unitPending ? " text-foreground-pending" : "")}>{t("purchaseUnit")}</p>
        <p className={"text-xs leading-tight mb-2 " + (unitPending ? "text-foreground-pending" : "text-foreground")}>{t("purchaseUnitNote")}</p>
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
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (bandPending ? " text-foreground-pending" : "")}>{t("band")}</p>
        <p className={"text-xs leading-tight mb-2 " + (bandPending ? "text-foreground-pending" : "text-foreground")}>{t("bandNote")}</p>
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

        {/* Everything below is ALWAYS rendered so the full spec sheet is visible
            from the start (§9). Rows that aren't yet available — because the core
            (model + unit + band) is unresolved, or the chosen purchase unit /
            model doesn't include that part/option — render in the "pending" style
            (inert, not selectable) rather than disappearing. Model-rule
            exclusions that ARE decided (kumite collar/hem, non-Tsubasa elastic)
            still render "blocked" (struck through) once the core is resolved. */}

        {/* Measurements — jacket A–F and/or pants G–J. Every letter always shows;
            the ones outside the chosen purchase unit stay pending. Validated
            against the band's top size (F collected but not size-checked; H/J have
            the high waist subtracted). */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (measurementsPending ? " text-foreground-pending" : "")}>{t("measurements")}</p>
        <p className={"text-xs leading-tight mb-2 " + (measurementsPending ? "text-foreground-pending" : "text-foreground")}>
          {isQuote ? t("measurementsNoteQuote") : t("measurementsNote")}
        </p>
        <OptionTable>
          {ALL_LETTERS.map((l) => {
            const inScope = coreReady && letterInScope(l);
            // As soon as a single-piece purchase unit is chosen, the other
            // piece's letters are a decided exclusion (blocked, struck through),
            // not merely pending — jacket-only blocks G–J, pants-only blocks A–F.
            // Depends only on the unit, so it fires before the size band.
            const blocked = unitChosen && !letterInScope(l);
            const ls = letterState(l);
            return (
              <MeasureInputRow
                key={l}
                label={t(`measureLabels.${l}`)}
                text={state.measure[l]}
                onText={(v) => setMeasure(l, v)}
                placeholder={t("measurePlaceholder")}
                unit="cm"
                error={inScope && ls.error}
                pending={!coreReady}
                blocked={blocked}
              />
            );
          })}
        </OptionTable>
        {/* Per-letter "too large" hints, inline under the inputs. */}
        {ALL_LETTERS.map((l) => {
          const inScope = coreReady && letterInScope(l);
          const ls = letterState(l);
          const max = letterMax(l);
          if (!inScope || !ls.exceeds || max == null) return null;
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

        {/* Shrinkage — part of the measurements: real (final) measurements are
            being entered, so the buyer must say whether shrinkage is already
            accounted for or HIROTA should add it (§8.4). No heading of its own;
            it sits under the measurements like the ready-made cut section. */}
        <p className={"text-xs mb-1 pt-3 " + (measurementsPending ? "text-foreground-pending" : "text-foreground")}>{t("shrinkage")}</p>
        <OptionTable>
          {ShrinkageOptions.map((opt) => (
            <OptionRow
              key={opt}
              selected={state.shrinkage === opt}
              selectable={coreReady}
              onClick={() =>
                update({ shrinkage: state.shrinkage === opt ? undefined : opt })
              }
            >
              {t(`shrinkageOptions.${opt}`)}
            </OptionRow>
          ))}
        </OptionTable>

        {/* Body data — part of the measurements: required sanity-check fields,
            stored but never priced and not used to build the garment. No heading
            of its own; it sits under the measurements like shrinkage. */}
        <p className={"text-xs mb-1 pt-3 " + (measurementsPending ? "text-foreground-pending" : "text-foreground")}>{t("bodyData")}</p>
        <OptionTable>
          <MeasureInputRow
            label={t("bodyHeight")}
            text={state.heightText}
            onText={(v) => update({ heightText: v })}
            placeholder={t("measurePlaceholder")}
            unit="cm"
            pending={!coreReady}
          />
          <MeasureInputRow
            label={t("bodyWeight")}
            text={state.weightText}
            onText={(v) => update({ weightText: v })}
            placeholder={t("measurePlaceholder")}
            unit="kg"
            pending={!coreReady}
          />
          <MeasureInputRow
            label={t("bodyWaist")}
            text={state.waistText}
            onText={(v) => update({ waistText: v })}
            placeholder={t("measurePlaceholder")}
            unit="cm"
            pending={!coreReady}
          />
        </OptionTable>

        {/* Ties — jacket, free toggles (all models). */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (tiesBlocked ? " text-foreground-blocked" : tiesPending ? " text-foreground-pending" : "")}>{t("ties")}</p>
        <OptionTable>
          <OptionRow
            selected={jacket && state.sideTies}
            selectable={coreReady && jacket}
            blocked={unitChosen && !jacket}
            price={t("free")}
            onClick={() => update({ sideTies: !state.sideTies })}
          >
            {t("sideTies")}
          </OptionRow>
          <OptionRow
            selected={jacket && state.chestTies}
            selectable={coreReady && jacket}
            blocked={unitChosen && !jacket}
            price={t("free")}
            onClick={() => update({ chestTies: !state.chestTies })}
          >
            {t("chestTies")}
          </OptionRow>
        </OptionTable>

        {/* Elastic waist — pants, Tsubasa only. Pending until the core resolves
            with pants in scope; blocked for non-Tsubasa. Does not replace the
            high waist. */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (elasticBlocked ? " text-foreground-blocked" : elasticPending ? " text-foreground-pending" : "")}>{t("elasticWaistTitle")}</p>
        <p className={"text-xs leading-tight mb-2 " + (elasticBlocked ? "text-foreground-blocked" : elasticPending ? "text-foreground-pending" : "text-foreground")}>{t("elasticNote")}</p>
        <OptionTable>
          <OptionRow
            selected={pants && state.elasticWaist}
            selectable={coreReady && pants && (modelDef?.allowsElasticWaist ?? false)}
            blocked={
              (modelChosen && !(modelDef?.allowsElasticWaist ?? false)) ||
              (unitChosen && !pants)
            }
            price={`+ ${format(elasticPrice)}`}
            onClick={() => update({ elasticWaist: !state.elasticWaist })}
          >
            {t("elasticWaist")}
          </OptionRow>
        </OptionTable>

        {/* High waist — pants; one radio per cm band (price = the band's). Once a
            band is picked, an input collects the exact cm, validated to fall
            inside that band. */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (highWaistBlocked ? " text-foreground-blocked" : highWaistPending ? " text-foreground-pending" : "")}>{t("highWaist")}</p>
        <p className={"text-xs leading-tight mb-2 " + (highWaistBlocked ? "text-foreground-blocked" : highWaistPending ? "text-foreground-pending" : "text-foreground")}>{t("highWaistNote")}</p>
        <OptionTable>
          {highWaistBands.map((b) => {
            const isSel =
              pants &&
              state.highWaistBand?.minCm === b.minCm &&
              state.highWaistBand?.maxCm === b.maxCm;
            return (
              <OptionRow
                key={`${b.minCm}-${b.maxCm}`}
                selected={isSel}
                selectable={coreReady && pants}
                blocked={unitChosen && !pants}
                price={`+ ${format(b.price)}`}
                onClick={() =>
                  update(
                    isSel
                      ? { highWaistBand: undefined, highWaistText: "" }
                      : { highWaistBand: { minCm: b.minCm, maxCm: b.maxCm }, highWaistText: "" },
                  )
                }
              >
                {t("highWaistBand", { min: b.minCm, max: b.maxCm })}
              </OptionRow>
            );
          })}
          {pants && state.highWaistBand && (
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
        {pants && hwError && hwBand && (
          <p className="text-[11px] italic text-red-400 mt-1">
            {t("highWaistTooBig", { min: hwBand.minCm, max: hwBand.maxCm })}
          </p>
        )}

        {/* Collar thickness — jacket, kata only. Pending until the core resolves
            with a jacket in scope; blocked (struck through) for kumite. */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (collarBlocked ? " text-foreground-blocked" : collarPending ? " text-foreground-pending" : "")}>{t("collar")}</p>
        <p className={"text-xs leading-tight mb-2 " + (collarBlocked ? "text-foreground-blocked" : collarPending ? "text-foreground-pending" : "text-foreground")}>{t("collarNote")}</p>
        <OptionTable>
          {CollarOptions.map((c) => (
            <OptionRow
              key={c}
              selected={jacket && state.collar === c}
              selectable={coreReady && jacket && isKata}
              blocked={(unitChosen && !jacket) || (modelChosen && !isKata)}
              price={`+ ${format(collarPrice(c))}`}
              onClick={() => update({ collar: state.collar === c ? undefined : c })}
            >
              {t(`collarOptions.${c}`)}
            </OptionRow>
          ))}
        </OptionTable>

        {/* Hems — a single uniform width/thickness applied to the bought part(s);
            price is the sum of the included parts' rows. The free 4cm/normal
            default is NOT a row (it's the note above); clicking a selected row
            toggles back to it. kumite models may only use the normal-thickness
            rows; the rest render blocked for them once the core resolves. */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (hemsPending ? " text-foreground-pending" : "")}>{t("hems")}</p>
        <p className={"text-xs leading-tight mb-2 " + (hemsPending ? "text-foreground-pending" : "text-foreground")}>{t("hemsNote")}</p>
        <OptionTable>
          {HEM_OPTIONS.filter((o) => !o.isDefault).map((o) => {
            const allowed = hemAllowedForModel(isKata, o);
            const selected =
              coreReady &&
              state.hem?.widthCm === o.widthCm &&
              state.hem?.thickness === o.thickness;
            const price =
              state.purchaseUnit != null
                ? `+ ${format(hemDisplayPrice(data, state.purchaseUnit, o))}`
                : undefined;
            return (
              <OptionRow
                key={hemOptionKey(o)}
                selected={selected}
                selectable={coreReady && allowed}
                blocked={modelChosen && !allowed}
                price={price}
                onClick={() =>
                  update({
                    hem: selected
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

        {/* Embroidery — one global thread color; four fields (per part). All four
            fields always show; ones outside the purchase unit, or before a thread
            colour is chosen, stay pending. */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (embroideryPending ? " text-foreground-pending" : "")}>{t("embroidery")}</p>
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
              {t(`threadColors.${tc}`)}
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
              // Field whose part the purchase unit excludes ⇒ blocked (struck
              // through) as soon as the unit is chosen. Otherwise pending until
              // the core + a thread colour resolve. jacket-only blocks the pants
              // field; pants-only blocks lapel/shoulder/chest.
              blocked={unitChosen && !f.show}
              pending={!coreReady || (f.show && state.threadColor == null)}
            />
          ))}
        </OptionTable>

        {/* Manufacturer's logo — jacket, all custom models. */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (mfrBlocked ? " text-foreground-blocked" : mfrPending ? " text-foreground-pending" : "")}>{t("mfrLogoTitle")}</p>
        <p className={"text-xs leading-tight mb-2 " + (mfrBlocked ? "text-foreground-blocked" : mfrPending ? "text-foreground-pending" : "text-foreground")}>{t("mfrLogoNote")}</p>
        <OptionTable>
          {MfrLogoPlacements.map((placement) => (
            <OptionRow
              key={placement}
              selected={jacket && state.mfrLogo === placement}
              selectable={coreReady && jacket}
              blocked={unitChosen && !jacket}
              price={`+ ${format(mfrLogoPrice)}`}
              onClick={() =>
                update({ mfrLogo: state.mfrLogo === placement ? undefined : placement })
              }
            >
              {t(`mfrLogoPlacements.${placement}`)}
            </OptionRow>
          ))}
        </OptionTable>

        {/* Label — free, required (no default). Selectable once the core
            resolves; a required single choice like the other sections. */}
        <p className={"text-lg font-bold pt-5 mb-[3px]" + (labelPending ? " text-foreground-pending" : "")}>{t("label")}</p>
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
        </>
      }
      right={
        <>
        <KarateGiVector
          aria-label={t("figureAlt")}
          className="w-[82.5%] max-md:w-[65%] mx-auto select-none text-black"
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
          // Every non-blocked cell (selected / selectable / pending) uses
          // border-style: double — it renders as a 1px solid line but OUTRANKS a
          // blocked neighbour's solid border in the border-collapse conflict
          // order (double > solid). So a live OR still-pending row keeps its own
          // border on every side — including the top edge it shares with a
          // blocked row above (e.g. the lone 5cm-normal hem allowed for kumite,
          // pending under blocked thicker rows). Only blocked cells stay solid.
          "group px-2 py-1 border " +
          (blocked ? "" : "border-double ") +
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

// A free-text embroidery input row (thread is chosen globally). `blocked`
// (struck through, inert) marks a field the chosen purchase unit excludes — a
// decided exclusion, distinct from `pending` (still-unresolved, awaiting core).
function TextInputRow({
  label,
  text,
  onText,
  placeholder,
  pending = false,
  blocked = false,
}: {
  label: string;
  text: string;
  onText: (v: string) => void;
  placeholder: string;
  pending?: boolean;
  blocked?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const completed = !focused && text.trim().length > 0;
  const cellState = blocked
    ? "text-foreground-blocked cursor-default"
    : pending
      ? "text-foreground-pending cursor-default"
      : completed
        ? "bg-foreground-selected text-background"
        : "hover:bg-foreground-hover focus-within:bg-foreground-hover";
  const borderClass = blocked
    ? "border-border-blocked"
    : pending
      ? "border-border-pending"
      : "border-border";
  // Every non-blocked row (active OR pending) uses border-style: double so it
  // OUTRANKS a blocked neighbour's solid border on the shared edge (double >
  // solid in the border-collapse conflict order) — so both a live input and a
  // still-pending one below a blocked cell keep their own top border.
  const doubleClass = !blocked ? "border-double " : "";

  return (
    <tr>
      <td className={"px-2 py-1 border " + doubleClass + borderClass + " " + cellState}>
        <div className="flex items-center gap-1.5">
          <span className={blocked ? "line-through" : ""}>{label}</span>
          <input
            type="text"
            value={text}
            placeholder={placeholder}
            disabled={pending || blocked}
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
// (the explanatory hint is rendered separately, below the table). `pending`
// renders the inert, un-editable style used before the field is in scope.
// `blocked` (struck through) marks a measurement the chosen purchase unit
// excludes — a decided exclusion, distinct from `pending` (awaiting the core).
function MeasureInputRow({
  label,
  text,
  onText,
  placeholder,
  unit,
  error = false,
  pending = false,
  blocked = false,
}: {
  label: string;
  text: string;
  onText: (v: string) => void;
  placeholder: string;
  unit?: string;
  error?: boolean;
  pending?: boolean;
  blocked?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const completed =
    !pending && !blocked && !focused && text.trim().length > 0 && !error;
  const cellState = blocked
    ? "text-foreground-blocked cursor-default"
    : pending
      ? "text-foreground-pending cursor-default"
      : completed
        ? "bg-foreground-selected text-background"
        : "hover:bg-foreground-hover focus-within:bg-foreground-hover";
  const borderClass = blocked
    ? "border-border-blocked"
    : pending
      ? "border-border-pending"
      : "border-border";
  // Every non-blocked row (active OR pending) uses border-style: double so it
  // OUTRANKS a blocked neighbour's solid border on the shared edge (double >
  // solid in the border-collapse conflict order) — so both a live measurement
  // and a still-pending one below a blocked cell keep their own top border.
  const doubleClass = !blocked ? "border-double " : "";

  return (
    <tr>
      <td className={"px-2 py-1 border " + doubleClass + borderClass + " " + cellState}>
        <div className="flex items-center gap-1.5">
          <span className={blocked ? "line-through" : ""}>{label}</span>
          <input
            type="text"
            inputMode="decimal"
            value={text}
            placeholder={placeholder}
            disabled={pending || blocked}
            onChange={(e) => onText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label={label}
            className="flex-1 min-w-0 text-right bg-transparent focus:outline-none disabled:cursor-default"
          />
          {unit && (
            <span
              className={
                "whitespace-nowrap " +
                (completed
                  ? "text-background"
                  : blocked
                    ? "text-foreground-blocked"
                    : pending
                      ? "text-foreground-pending"
                      : "text-foreground-muted")
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
