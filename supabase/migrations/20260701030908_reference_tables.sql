-- Reference data: association labels + karate-gi models.
-- These are read publicly by the storefront; only the admin (service role,
-- which bypasses RLS) writes them.

-- Internal class that governs which custom optionals a model allows.
-- Only meaningful for custom models; NULL for standard-only models.
create type gi_class as enum ('kata', 'kumite');

-- ---------------------------------------------------------------------------
-- Labels (15 associations, shared by gi and obi). Proper nouns: not localized.
-- ---------------------------------------------------------------------------
create table labels (
  id          smallint primary key,
  name        text     not null,
  sort_order  smallint not null
);

insert into labels (id, name, sort_order) values
  (1,  'Hirota',              1),
  (2,  'Hayashi-ha',          2),
  (3,  'Inoue-ha Shitoryu',   3),
  (4,  'Itosu-ryu',           4),
  (5,  'JKA',                 5),
  (6,  'JKS',                 6),
  (7,  'JSKA',                7),
  (8,  'KWF',                 8),
  (9,  'SKIF',                9),
  (10, 'Shitokai',           10),
  (11, 'Wado-kai',           11),
  (12, 'Wado-ryu',           12),
  (13, 'WIKF (Wado)',        13),
  (14, 'WSKF',               14),
  (15, 'WTKO',               15);

-- ---------------------------------------------------------------------------
-- Karate-gi models. One row per model; flags say where it can be bought and,
-- for custom, which optional set (via `class`) applies.
-- ---------------------------------------------------------------------------
create table gi_models (
  slug                       text primary key,   -- stable id used in code
  name_en                    text     not null,
  name_ja                    text     not null,
  class                      gi_class,           -- NULL when not custom-relevant
  material                   text     not null,
  available_custom           boolean  not null,
  available_standard_slim    boolean  not null default false,
  available_standard_normal  boolean  not null default false,
  sort_order                 smallint not null
);

insert into gi_models
  (slug, name_en, name_ja, class, material,
   available_custom, available_standard_slim, available_standard_normal, sort_order) values
  ('tsubasa',      'Tsubasa',      'ツバサ',        'kumite', '95% polyester / 5% elastane', true,  true,  false, 1),
  ('kuu',          'Kū',           'クウ',          'kumite', '65% cotton / 35% polyester',  true,  false, false, 2),
  ('pinac-kumite', 'Pinac Kumite', 'ピナック組手用', 'kumite', '70% cotton / 30% polyester',  true,  true,  true,  3),
  ('takumi',       'Takumi',       'タクミ',        'kata',   '65% polyester / 35% cotton',  true,  false, false, 4),
  ('pinac-kata',   'Pinac Kata',   'ピナック形用',   'kata',   '70% cotton / 30% polyester',  true,  false, false, 5),
  ('mh-10',        'MH-10',        'MH-10',         'kata',   '100% cotton 14oz',            true,  false, true,  6),
  ('mh-11',        'MH-11',        'MH-11',         'kata',   '100% cotton 12oz',            true,  false, true,  7),
  ('mh-12',        'MH-12',        'MH-12',         null,     '100% cotton 7.9oz',           false, false, true,  8);

-- ---------------------------------------------------------------------------
-- RLS: public read-only. Writes happen via migrations / admin (service role).
-- ---------------------------------------------------------------------------
alter table labels    enable row level security;
alter table gi_models enable row level security;

create policy "labels public read"    on labels    for select using (true);
create policy "gi_models public read" on gi_models for select using (true);