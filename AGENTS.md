<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# HIROTA Store — Project Guide
 
## 1. What this is
 
A modern e-commerce storefront + admin panel for **HIROTA**, a niche Japanese karate-gi
manufacturer. HIROTA currently sells only inside Japan via a fax-based ordering system
(customers fax paper forms). This project is a **self-initiated spec build** whose purpose
is to (a) serve as a strong product/design portfolio piece, and (b) demonstrate a digital
replacement for the fax workflow.
 
It is **not** a client engagement. Do not write copy or metadata implying HIROTA
commissioned or endorsed this. The honest framing everywhere is: self-initiated concept,
built production-ready, pending validation with the brand.
 
The strategic center of the project is the **made-to-order configurator** (custom karate-gi
and obi) with conditional fields and dynamic pricing. The **admin panel** is the second
pillar: it is what literally replaces the fax forms. Everything else (simple catalog,
cart, checkout) is table-stakes plumbing around those two.
 
## 2. Scope
 
### In scope (V1)
- Public storefront: catalog, category navigation, product detail pages (PDPs) for simple
  products, and the configurators for standard gi, custom gi, and obi.
- Cart with **localStorage** persistence (no cross-device sync). Happy path only.
- **Guest checkout** (no customer accounts): contact + shipping form, order summary,
  **simulated payment** → creates an order, decrements stock, shows a confirmation with a
  stub "you'll receive email updates" notice (no email is actually sent).
- **Admin panel** (single admin user, protected): order list, order detail rendering the
  full resolved custom spec, order status management (payment / production / shipping),
  and basic product + stock CRUD.
- **i18n EN/JA** across the whole UI and localized content.
- **Currency switch JPY/USD** (JPY is the source of truth; USD is a runtime conversion).
- Public deploy (Vercel + Supabase cloud).
### Out of scope (V2 — document, do NOT build)
- Customer accounts / auth / saved measurements.
- Real payments (Stripe is the planned V2 gateway; **no real money is ever handled**).
- Real shipping/courier integration (shipping is handled manually by the admin).
- Transactional email (Resend etc.).
### Hard guardrails
- Never introduce customer-facing auth. The only account is the admin.
- Never wire a real payment provider or move real money. Payment is a pure simulation.
- Never build an admin UI for what Supabase Studio already does during development
  (seeding is done via SQL/seed scripts, not a custom UI).
## 3. Stack & versions
 
- **Next.js 16.2.9** (App Router, Turbopack default). React **19.2.4**.
- **TypeScript 5** (strict).
- **Tailwind CSS 4** (via `@tailwindcss/postcss`).
- **Custom components only. Do NOT use shadcn/ui.** Build components by hand following the
  project's design language (§9). A headless primitive lib (Radix primitives or Headless UI,
  unstyled) is acceptable ONLY for keyboard/a11y-heavy widgets (label selector, collapsible
  panels, cart drawer) and must be fully custom-styled. Prefer hand-rolled otherwise.
- **Supabase** (Postgres 17, Auth used for admin only, Row Level Security). CLI installed as
  a dev dependency; all CLI commands are prefixed: `pnpm supabase <cmd>`.
- **next-intl** for i18n.
- **pnpm** package manager.
- Deploy: **Vercel**.
## 4. Next.js 16 gotchas (this is NOT Next 14/15)
 
Read the bundled docs in `node_modules/next/dist/docs/` before writing framework code.
Key differences from older Next that training data may get wrong:
- **`proxy.ts` replaces `middleware.ts`.** The admin route protection lives in `proxy.ts`
  with an exported `proxy` function (not `middleware`). It runs on the Node.js runtime.
- **Route `params` are async** — await them.
- **Turbopack is the default bundler.** No custom webpack config.
- Caching is opt-in (Cache Components). Dynamic code runs at request time by default.
## 5. Supabase conventions
 
- **Keys use the new format** (legacy anon/service_role are not provisioned on this project):
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) — client-side, safe to ship
    to the browser; protection comes from RLS.
  - `SUPABASE_SECRET_KEY` (`sb_secret_…`) — **server-only**, bypasses RLS, never imported
    into client code, never committed.
- **Migrations workflow** (no Docker; work directly against the linked remote):
  - `pnpm supabase migration new <name>` → edit the generated SQL in `supabase/migrations/`.
  - `pnpm supabase db push` → apply to the remote.
  - Migrations are the source of truth for schema. Do not change schema through the
    dashboard; write a migration.
- **RLS is mandatory on every table.** Public (publishable key) can read products and
  reference/pricing tables and can insert orders. Only the admin can read orders/customer
  data and write products/stock/statuses. When in doubt, deny.
- Postgres `major_version` is 17 (matches `config.toml`).
## 6. Architecture
 
- App lives under `app/[locale]/…` (the `[locale]` segment is required by next-intl).
  Note: this project scaffolded **without** `src/`, so routes are at `app/`, not `src/app/`.
- **Pricing engine**: a single **pure TypeScript module** (no I/O, no DB, no React) that,
  given a resolved configuration, returns a fully itemized price breakdown in JPY. It is
  shared between:
  - the configurator UI (live price as the user configures), and
  - the server (revalidates the price before creating an order — never trust a
    client-submitted total).
  It must have unit tests covering the conditional rules below. This module is the most
  important piece of the codebase; keep business rules here, not scattered in components.
- Localized content is stored in the DB as JSONB `{ "en": "...", "ja": "..." }`. Prices,
  sizes, and rules are language-agnostic.
- Currency: all prices stored and computed in **JPY**. USD is a **display-only** runtime
  conversion using a cached USD/JPY rate (refresh on an interval, with a fallback rate if
  the FX source fails). An order records: total in JPY, the currency shown to the buyer, and
  the FX rate used at purchase time.
## 7. Data model
 
Three pricing patterns cover every product. Understanding which pattern a product is in
explains its entire behavior.
 
- **Pattern A — fixed price** (simple products: equipment + accessories).
- **Pattern B — lookup-table price** (standard gi, obi).
- **Pattern C — band price + conditional add-ons** (custom gi). The only hard one.
### Tables
`products` · `gi_models` · `size_chart_normal` · `size_chart_slim` · `gi_standard_prices` ·
`gi_custom_base_prices` · `gi_custom_options` · `obi_prices` · `obi_embroidery_prices` ·
`labels` · `orders` · `order_items`.
 
### `order_items` — snapshot rule
Each order item stores the **complete resolved configuration in JSONB**, including the
itemized price breakdown, as a snapshot. Do NOT store only references to option rows.
Prices and models change over time; a placed order must forever render exactly what the
customer configured and paid. The admin reads this snapshot to render the full spec
(model, all measurements, options, embroidery text, label) — this is the fax replacement.
 
## 8. Business rules (the source of truth for the pricing engine)
 
### 8.1 Pattern A — Simple products (equipment + accessories)
- ~32 products. Fields: category (`equipment`/`accessories`), subcategory, localized
  name/description, fixed JPY price, `options` JSONB (`{ size:[…], color:[…] }` where
  applicable), stock (tracked at product level, not per variant), image.
- **Size and color are cosmetic and never change price.** (One real product, the groin
  supporter in S, is 200 JPY cheaper — deliberately ignored to avoid per-variant pricing.)
### 8.2 Pattern B1 — Karate-gi Standard (ready-made)
Price = lookup `(product line, size)` in `gi_standard_prices`. Sold as **full sets only**
(no separate pieces in standard). Availability and options per model:
 
| Model | Fit in standard | Size chart | Label | Mfr Logo | Embroidery (4) | Adjust C/H |
|---|---|---|---|---|---|---|
| Tsubasa | Slim + High Waist only | slim | ✓ | ✓ | ✓ | ✓ |
| Pinac Kumite | Slim+HW **and** Normal | slim / normal | ✓ | ✓ | ✓ | ✓ |
| MH-10 | Normal | normal | ✓ | ✗ | ✓ | ✓ |
| MH-11 | Normal | normal | ✓ | ✗ | ✓ | ✓ |
| MH-12 | Normal | normal | ✓ | ✗ | ✓ | ✗ |
 
- Takumi, Pinac Kata, and Kū do **not** exist in standard (custom-only).
- Pinac Kumite appears twice in `gi_standard_prices`: a slim variant (uses `size_chart_slim`)
  and a normal variant (uses `size_chart_normal`).
- **Adjust C/H** (sleeve length C, pant hem length H): removes material only, never adds.
  User enters the desired (shorter) final measurement. 1100 JPY per measurement adjusted;
  either, both, or neither. Charging is a flat **1100** each (ignore any "550 for ≥5cm" note).
- Whenever C and/or H is adjusted, the form must also require a **shrinkage** selection
  ("already accounted" vs "to be added by HIROTA"), same as custom, because new measurements
  are being entered.
- Embroidery = the same 4-field per-character scheme as custom (§8.4).
### 8.3 Pattern B2 — Obi
Dependency chain: **color → material → width → size**. Each choice constrains the next.
 
Color → available materials:
| Color | Materials |
|---|---|
| Black | Nami, Shushi, Yohachi, Silk |
| Blue | Nami, Shushi, Yohachi |
| Red | Nami, Shushi, Yohachi |
| Other (white + colors: green, purple, brown, yellow, orange) | Nami only |
 
Material → available widths:
| Material | Widths |
|---|---|
| Nami | 4cm (normal) only |
| Shushi, Yohachi, Silk | 4cm (normal) and 4.5cm (special) |
 
- Sizes 0–13 (205–400cm). **Special (4.5cm) starts at size 3**; there is no special in 0–2.
- Price = lookup in `obi_prices`. Load the corrected tables (normal 4cm and special 4.5cm)
  exactly as given — they already tabulate the extra sizes (#9–#13). **No runtime size
  math.** Where a table cell is "—", that size is not offered for that combo: do not show it
  in the form, but keep the row with a **NULL** price so a future size is a one-cell UPDATE.
- Material name mapping in source tables: Algodón Normal = Nami, Satinado = Shushi,
  Algodón Especial = Yohachi, Seda = Silk.
**Obi embroidery** (distinct from gi): two bordable ends, both optional, charged per
character:
- End A (the labeled end, usually the wearer's name), End B (usually the style/association).
- Price per character depends on **width × thread**:
| | Standard thread | Metallic (gold/silver) |
|---|---|---|
| Normal 4cm | 220 | 275 |
| Special 4.5cm | 275 | 330 |
 
- **Colored ("Other") belts can only be embroidered in black.**
### 8.4 Pattern C — Karate-gi Custom (7 models)
MH-12 is **not** available custom. The 7 custom models, with the internal kata/kumite
classification that governs thickness options:
 
| Model | Class (for options) | Custom |
|---|---|---|
| Tsubasa | kumite | ✓ |
| Kū | kumite | ✓ |
| Pinac Kumite | kumite | ✓ |
| Takumi | kata | ✓ |
| Pinac Kata | kata | ✓ |
| MH-10 | kata | ✓ |
| MH-11 | kata | ✓ |
 
- **kumite models** (Tsubasa, Kū, Pinac Kumite): cannot modify lapel thickness or hem
  thickness. Their only hem option is **5cm width, normal thickness**.
- **kata models** (Takumi, Pinac Kata, MH-10, MH-11): all options available.
**Base price** — user explicitly selects the size **band** (for transparent pricing); the
band sets the base:
 
| Band | Base (JPY) |
|---|---|
| up to 2½ | 29,700 |
| 3 to 5½ | 31,900 |
| 6 to 8 | 35,200 |
| above 8 | quote on request |
 
**Measurement validation**: measurement inputs A–J validate against the **top size of the
selected band**, using `size_chart_normal`. Every entered measurement must be ≤ that size's
value. Rules:
- **Ignore measurement F** entirely for sizing (it's skirt-slit depth, doesn't add fabric).
- For **H and J**, subtract the entered high-waist centimeters before comparing (the size
  chart does not include high waist).
**Purchase unit** (multiplier on base price):
- Full set = 1.0×
- Jacket only = 0.6×
- Pants only = 0.5×
(Note: jacket + pants bought separately = 1.1× > set. Intentional; the engine must not
assume parts sum to 1.0.) When a single piece is bought, validation uses only that piece's
measurements (jacket: A–E, F ignored; pants: G–J with high-waist subtraction).
 
**Options, tagged by part** (the tag drives which options show for the chosen purchase unit):
 
| Option | Part | Availability | Price |
|---|---|---|---|
| Thick collar | jacket | kata only | +550 |
| Extra-thick collar | jacket | kata only | +1100 |
| Side ties (waki) | jacket | all | free toggle |
| Chest ties (mune) | jacket | all | free toggle |
| Embroidery: lapel / shoulder / chest | jacket | all | per char (§below) |
| Manufacturer's logo | jacket | see below | +1100 |
| Jacket & sleeve hems | jacket | see hems | see hems |
| High waist | pants | all | banded (below) |
| Elastic waist | pants | **Tsubasa only** | +550 |
| Embroidery: pants | pants | all | per char |
| Pants hems | pants | see hems | see hems |
| Label (15 associations) | both | all | free (each part has its own) |
| Shrinkage (accounted / to add) | — | all | free selection |
 
**Hems** — priced per part (this is the single source of truth; the set price is the sum):
 
| Selection | Jacket (2 hems) | Pants (1 hem) | Set (= sum) |
|---|---|---|---|
| 4cm thick | +1100 | +550 | +1650 |
| 4cm ultra-thick | +2200 | +1100 | +3300 |
| 5cm normal | +1100 | +550 | +1650 |
| 5cm thick | +2200 | +1100 | +3300 |
| 5cm ultra-thick | +2200 | +1100 | +3300 |
 
- Default is 4cm width / normal thickness (free, not an option).
- **kumite models only allow the 5cm-normal row** (jacket +1100 / pants +550 / set +1650).
- For a **full set**, hems are a **single uniform selection** (one width/thickness applied to
  jacket + sleeves + pants), priced as the sum of the two part rows. Not independent per part.
**High-waist bands** (user enters exact cm as a real measurement; price comes from the band):
| High waist | Price |
|---|---|
| ≤ 4cm | 2,200 |
| 5–7cm | 3,300 |
| 8–10cm | 3,850 |
| 11–13cm | 4,400 |
 
- Above 13cm is not offered.
- Elastic waist does **not** replace high waist — a gi can have both (elastic only on Tsubasa).
**Gi embroidery** — 4 independent optional fields, charged per character, summed across all
four:
1. Jacket lapel, 2. Pants, 3. Left shoulder, 4. Chest.
- 220/char standard color; 275/char gold or silver.
- Input languages: Latin alphabet, katakana, or kanji.
**Manufacturer's logo** — HIROTA logo placement. Options: `neck only` (+1100) or
`right breast & neck` (+1100). Does not overlap with the chest embroidery/brand logo (that
goes on the **left** breast; the manufacturer's logo goes on the **right**). Available for
all 7 custom models, and additionally for the **Tsubasa** and **Pinac Kumite** standard
(ready-made) models per §8.2.
 
**Body data** (height, weight, waist): required sanity-check fields. Stored on the order but
**not used to build the garment** (HIROTA emails the customer if measurements look wrong for
the stated body).
 
**Excluded**: "side tailoring / entallado de costados" is discontinued — never offer it.
 
### 8.5 Labels (shared by gi and obi)
15 options: Hirota, Hayashi-ha, Inoue-ha Shitoryu, Itosu-ryu, JKA, JKS, JSKA, KWF, SKIF,
Shitokai, Wado-kai, Wado-ryu, WIKF (Wado), WSKF, WTKO. Default to "Hirota" if unspecified.
 
### 8.6 Orders & statuses
- `orders`: guest buyer contact, shipping address (manual fulfillment), payment status,
  production status, shipping status, JPY total, display currency, FX rate used.
- `order_items`: one row per line item with the resolved config snapshot + price breakdown.
- The admin advances statuses; there is no automated fulfillment.
## 9. Design language
 
Portfolio-grade but intentionally restrained: a **monospaced "spreadsheet" aesthetic**
that fits HIROTA's traditional Japanese, form-driven identity. The current unfinished UI is
a **three-column desktop layout**: left = brand/about info, center = the store (with a top
nav bar to switch product categories), right = cart. Clean, airy, grid/table-like — a
15-field measurement form should feel at home in it.
 
- Desktop-first for now. A proper mobile navigation is a later task.
- Collapsible panels and a nicer nav are planned but deferred.
- **The visual styles will be ported from an existing HTML + Tailwind + vanilla-JS prototype**
  (a separate old repo). When that task starts, read that repo and reuse its tokens,
  spacing, and component styling rather than inventing a new look. Do not restyle from
  scratch; extend the existing language.
- All prices are shown transparently in the configurators — no hidden pricing; the live
  breakdown is part of the UX.
## 10. Coding conventions
 
- TypeScript strict; no `any` in domain code (pricing, model types).
- Keep all HIROTA business rules in the pricing engine module and in typed model
  definitions — not duplicated across components.
- Server components by default; client components only where interactivity requires it
  (configurators, cart).
- Read reference data and prices from Postgres; never hardcode price tables in the app
  (except a documented FX fallback rate).
- Every new table gets RLS policies in the same migration that creates it.