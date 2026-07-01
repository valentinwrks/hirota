-- Custom gi pricing + shared gi optionals catalog.
-- All prices JPY, tax included. Public read-only; writes via migrations / admin.
-- Availability rules (kata/kumite, standard vs custom, per-model) live in the
-- pricing engine; this stores prices + simple data-level restrictions only.

-- ---------------------------------------------------------------------------
-- Custom base price bands. The user picks a band explicitly; it sets the base.
-- top_size_code = the band's top size in the NORMAL chart, used for measurement
-- validation (all entered measurements must be <= that size). NULL = quote.
-- ---------------------------------------------------------------------------
create table gi_custom_base_prices (
  band_code     text primary key,
  label_en      text     not null,
  top_size_code text,               -- references size_charts (chart='normal'); NULL for quote
  base_price    integer,            -- JPY; NULL = quote on request
  sort_order    smallint not null
);

insert into gi_custom_base_prices (band_code, label_en, top_size_code, base_price, sort_order) values
  ('up_to_2_5', 'Up to 2½',                     '2.5', 29700, 1),
  ('3_to_5_5',  '3 to 5½',                      '5.5', 31900, 2),
  ('6_to_8',    '6 to 8',                       '8',   35200, 3),
  ('above_8',   'Above 8 (quote on request)',   null,  null,  4);

-- ---------------------------------------------------------------------------
-- Optionals catalog (flat-priced). part drives which purchase unit shows it.
-- kata_only: only kata models. restrict_model_slug: only that model (elastic
-- waist → Tsubasa). Manufacturer logo also reused by standard Tsubasa/Pinac.
-- Sleeve/pant adjustments are the standard-only C/H shortenings (1100 each).
-- ---------------------------------------------------------------------------
create type gi_part as enum ('jacket', 'pants', 'both');

create table gi_options (
  code                text primary key,
  name_en             text     not null,
  name_ja             text,                    -- fill in later; not yet provided
  part                gi_part  not null,
  price               integer  not null,       -- JPY, tax incl.
  kata_only           boolean  not null default false,
  restrict_model_slug text references gi_models(slug),
  sort_order          smallint not null
);

insert into gi_options
  (code, name_en, name_ja, part, price, kata_only, restrict_model_slug, sort_order) values
  ('collar_thick',         'Thick collar',                            null, 'jacket', 550,  true,  null,      1),
  ('collar_extra_thick',   'Extra-thick collar',                      null, 'jacket', 1100, true,  null,      2),
  ('side_ties',            'Side ties (waki)',                        null, 'jacket', 0,    false, null,      3),
  ('chest_ties',           'Chest ties (mune)',                       null, 'jacket', 0,    false, null,      4),
  ('elastic_waist',        'Elastic waist',                           null, 'pants',  550,  false, 'tsubasa', 5),
  ('mfr_logo_neck',        'Manufacturer logo — neck only',           null, 'jacket', 1100, false, null,      6),
  ('mfr_logo_breast_neck', 'Manufacturer logo — right breast & neck', null, 'jacket', 1100, false, null,      7),
  ('adjust_sleeve_c',      'Sleeve shortening (C, standard)',         null, 'jacket', 1100, false, null,      8),
  ('adjust_pant_h',        'Pant-length shortening (H, standard)',    null, 'pants',  1100, false, null,      9);

-- ---------------------------------------------------------------------------
-- Hems: per-part price ladder (source of truth). Full-set hem price = the sum
-- of the jacket and pants rows for the same width/thickness. kata_only=false
-- marks the two rows kumite models may also use (4/normal default and 5/normal).
-- ---------------------------------------------------------------------------
create type gi_hem_thickness as enum ('normal', 'thick', 'ultra');

create table gi_hem_prices (
  part      gi_part          not null,   -- 'jacket' (jacket+sleeve) or 'pants'
  width_cm  smallint         not null,   -- 4 or 5
  thickness gi_hem_thickness not null,
  price     integer          not null,   -- JPY, tax incl.
  kata_only boolean          not null,
  primary key (part, width_cm, thickness)
);

insert into gi_hem_prices (part, width_cm, thickness, price, kata_only) values
  ('jacket', 4, 'normal', 0,    false),
  ('jacket', 4, 'thick',  1100, true),
  ('jacket', 4, 'ultra',  2200, true),
  ('jacket', 5, 'normal', 1100, false),
  ('jacket', 5, 'thick',  2200, true),
  ('jacket', 5, 'ultra',  2200, true),
  ('pants',  4, 'normal', 0,    false),
  ('pants',  4, 'thick',  550,  true),
  ('pants',  4, 'ultra',  1100, true),
  ('pants',  5, 'normal', 550,  false),
  ('pants',  5, 'thick',  1100, true),
  ('pants',  5, 'ultra',  1100, true);

-- ---------------------------------------------------------------------------
-- High-waist bands. User enters exact cm; price comes from the band. >13 not offered.
-- ---------------------------------------------------------------------------
create table gi_high_waist_prices (
  min_cm smallint not null,
  max_cm smallint not null,
  price  integer  not null,
  primary key (min_cm, max_cm)
);

insert into gi_high_waist_prices (min_cm, max_cm, price) values
  (1,  4,  2200),
  (5,  7,  3300),
  (8,  10, 3850),
  (11, 13, 4400);

-- ---------------------------------------------------------------------------
-- Gi embroidery: per-character price by thread type. Same rate for all 4 fields.
-- ---------------------------------------------------------------------------
create type gi_thread as enum ('standard', 'metallic');

create table gi_embroidery_prices (
  thread         gi_thread primary key,
  price_per_char integer   not null   -- JPY, tax incl.
);

insert into gi_embroidery_prices (thread, price_per_char) values
  ('standard', 220),
  ('metallic', 275);

-- ---------------------------------------------------------------------------
-- RLS: public read on all.
-- ---------------------------------------------------------------------------
alter table gi_custom_base_prices enable row level security;
alter table gi_options            enable row level security;
alter table gi_hem_prices         enable row level security;
alter table gi_high_waist_prices  enable row level security;
alter table gi_embroidery_prices  enable row level security;

create policy "gi_custom_base_prices public read" on gi_custom_base_prices for select using (true);
create policy "gi_options public read"            on gi_options            for select using (true);
create policy "gi_hem_prices public read"         on gi_hem_prices         for select using (true);
create policy "gi_high_waist_prices public read"  on gi_high_waist_prices  for select using (true);
create policy "gi_embroidery_prices public read"  on gi_embroidery_prices  for select using (true);