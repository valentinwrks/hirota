-- ============================================================================
-- Block 5 — Simple products (equipment + accessories), 32 items.
-- Pattern A: fixed price; size/color are cosmetic and never change price.
-- Localized content (name, description) is JSONB {en, ja}; only EN provided
-- for now, JA added later. product_type is a short English descriptive tag.
-- Image path is derived in the app from the id: /products/product-<id>.<ext>
-- (matches the source naming); no URL stored here.
-- Public read-only; stock writes happen server-side (secret key) on checkout.
-- ============================================================================

create type product_category    as enum ('equipment', 'accessories');
create type product_subcategory as enum (
  'competition-equipment', 'referee-equipment', 'training-equipment', 'apparel', 'goods'
);

create table products (
  id           smallint            primary key,   -- from source JSON; drives image path
  name         jsonb               not null,      -- {"en":"...","ja":"..."}
  description  jsonb,                              -- {"en":"..."} short blurb
  product_type text,                               -- descriptive tag, e.g. 'kumite protection'
  category     product_category    not null,
  subcategory  product_subcategory not null,
  price        integer             not null,       -- JPY, tax incl.
  options      jsonb,                              -- {"size":[...],"color":[...]} or null
  stock        integer             not null default 100   -- placeholder; editable in admin
);

insert into products (id, name, description, product_type, category, subcategory, price, options) values
  (1, '{"en": "Seiken Supporter"}', '{"en": "HIROTA logo"}', 'traditional kumite gear, for children & adults', 'equipment', 'competition-equipment', 2530, null),
  (2, '{"en": "JKA Seiken Supporter"}', '{"en": "JKA approved"}', 'traditional kumite gear, for children & adults', 'equipment', 'competition-equipment', 2530, null),
  (3, '{"en": "Red Fist Supporter"}', '{"en": "JKF approved"}', 'AKA kumite gear', 'equipment', 'competition-equipment', 3960, '{"size": ["XS", "S", "M", "L"]}'),
  (4, '{"en": "Blue Fist Supporter"}', '{"en": "JKF approved"}', 'AO kumite gear', 'equipment', 'competition-equipment', 3960, '{"size": ["XS", "S", "M", "L"]}'),
  (5, '{"en": "Red/Blue Reversible Fist Supporter"}', '{"en": "JKF approved for elementary schools students"}', 'AKA & AO kumite gear', 'equipment', 'competition-equipment', 3520, '{"size": ["S", "M"]}'),
  (6, '{"en": "Shin & Instep Guard Set"}', '{"en": "JKF approved"}', 'AKA & AO kumite gear', 'equipment', 'competition-equipment', 6380, '{"size": ["S", "M", "L"], "color": ["red", "blue"]}'),
  (7, '{"en": "Body Protector for Men"}', '{"en": "JKA approved"}', 'kumite protection', 'equipment', 'competition-equipment', 4730, '{"size": ["XS", "S", "M", "L"]}'),
  (8, '{"en": "Body Protector for Women"}', '{"en": "JKA approved"}', 'kumite protection', 'equipment', 'competition-equipment', 4730, '{"size": ["S", "M", "L"]}'),
  (9, '{"en": "Body Protector for Men"}', '{"en": "JKF approved"}', 'kumite protection', 'equipment', 'competition-equipment', 5500, '{"size": ["XS", "S", "M", "L"]}'),
  (10, '{"en": "Body Protector for Women"}', '{"en": "JKF approved"}', 'kumite protection', 'equipment', 'competition-equipment', 5500, '{"size": ["S", "M", "L"]}'),
  (11, '{"en": "Mouth Guard for Children"}', '{"en": "upper teeth mouthpiece"}', 'kumite protection', 'equipment', 'competition-equipment', 1100, null),
  (12, '{"en": "Mouth Guard"}', '{"en": "upper teeth mouthpiece"}', 'kumite protection', 'equipment', 'competition-equipment', 1100, null),
  (13, '{"en": "Groin Supporter"}', '{"en": "groin supporter for men"}', 'kumite protection', 'equipment', 'competition-equipment', 2640, '{"size": ["S", "M", "L"]}'),
  (14, '{"en": "Red & Blue Laces"}', '{"en": "JKF approved"}', 'AKA & AO kumite gear, free size each', 'equipment', 'competition-equipment', 440, '{"color": ["red", "blue"]}'),
  (15, '{"en": "Kumite Match Display Board"}', '{"en": "kumite boards for one tatami"}', 'referee equipment', 'equipment', 'referee-equipment', 20570, null),
  (16, '{"en": "Match Flags"}', '{"en": "white, red, and blue flags"}', 'referee equipment', 'equipment', 'referee-equipment', 908, '{"color": ["white", "red", "blue"]}'),
  (17, '{"en": "Stainless Steel Whistle"}', '{"en": "stainless steel whistle"}', 'referee equipment', 'equipment', 'referee-equipment', 330, null),
  (18, '{"en": "Plastic Whistle"}', '{"en": "plastic whistle, white & black available"}', 'referee equipment', 'equipment', 'referee-equipment', 330, '{"color": ["white", "black"]}'),
  (19, '{"en": "Hand Mitt"}', '{"en": "40cm long x 20cm wide x 6cm thick"}', 'training equipment', 'equipment', 'training-equipment', 3025, null),
  (20, '{"en": "Double Hand Mitt"}', '{"en": "40cm long x 20cm wide x 12cm thick"}', 'training equipment', 'equipment', 'training-equipment', 3630, null),
  (21, '{"en": "Punching Mitts"}', '{"en": "25cm long x 19cm wide x 9cm thick, one pair"}', 'training equipment', 'equipment', 'training-equipment', 7260, null),
  (22, '{"en": "Kick Mitt"}', '{"en": "47cm long x 23cm wide x 11cm thick"}', 'training equipment', 'equipment', 'training-equipment', 6050, null),
  (23, '{"en": "Big Mitt"}', '{"en": "65cm long x 43cm wide x 13cm thick"}', 'training equipment', 'equipment', 'training-equipment', 9680, null),
  (24, '{"en": "Fist Support T-Shirt"}', '{"en": "long-sleeved t-shirt, fist support embroidered"}', '100% cotton, unisex', 'accessories', 'apparel', 4180, '{"size": ["S", "M", "L", "XL"], "color": ["white", "black"]}'),
  (25, '{"en": "Hirota Original I T-Shirt"}', '{"en": "long-sleeved t-shirt"}', '100% cotton, unisex', 'accessories', 'apparel', 3630, '{"size": ["S", "M", "L", "XL"], "color": ["white", "black"]}'),
  (26, '{"en": "Hirota Original II T-Shirt"}', '{"en": "long-sleeved t-shirt"}', '100% cotton, unisex', 'accessories', 'apparel', 4180, '{"size": ["S", "M", "L", "XL"], "color": ["black", "blue"]}'),
  (27, '{"en": "Fist Support T-Shirt"}', '{"en": "short-sleeved t-shirt, fist support embroidered"}', '100% cotton, unisex', 'accessories', 'apparel', 3080, '{"size": ["S", "M", "L", "XL"], "color": ["white", "black"]}'),
  (28, '{"en": "Wanna Be Strong T-Shirt"}', '{"en": "short-sleeved t-shirt"}', '100% cotton, unisex', 'accessories', 'apparel', 3080, '{"size": ["S", "M", "L", "XL"], "color": ["white", "black"]}'),
  (29, '{"en": "Kumite Backpack"}', '{"en": "karate backpack designed to carry all your kumite essentials"}', 'limited edition, only 500 units available', 'accessories', 'goods', 17600, null),
  (30, '{"en": "Hirota Original Muffler Towel"}', '{"en": "26cm wide x 115cm long"}', 'hirota original goods', 'accessories', 'goods', 1650, null),
  (31, '{"en": "Hirota Original Hand Towel"}', '{"en": "33cm wide x 90cm long"}', 'hirota original goods', 'accessories', 'goods', 1100, null),
  (32, '{"en": "Hirota Original Bear Keychains"}', '{"en": "your keys protected by cute bear karateka''s"}', 'hirota original goods', 'accessories', 'goods', 880, '{"color": ["yellow", "brown", "white", "pink"]}');

alter table products enable row level security;
create policy "products public read" on products for select using (true);