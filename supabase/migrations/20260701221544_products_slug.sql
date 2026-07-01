-- ============================================================================
-- Add a URL slug to `products` for clean, stable PDP routing.
--
-- The numeric `id` is the PK and drives the image path, but product names are
-- not unique (e.g. "Fist Support T-Shirt" is ids 24 & 27; "Body Protector for
-- Men" is ids 7 & 9), so a name-derived slug would collide. We assign explicit,
-- human-readable, disambiguated slugs here. Routes resolve /product/[slug].
--
-- No new RLS policy needed: `products` already has a public SELECT policy
-- ("products public read"), which covers this new column.
-- ============================================================================

alter table products add column slug text;

update products set slug = case id
  when 1  then 'seiken-supporter'
  when 2  then 'jka-seiken-supporter'
  when 3  then 'red-fist-supporter'
  when 4  then 'blue-fist-supporter'
  when 5  then 'reversible-fist-supporter'
  when 6  then 'shin-instep-guard-set'
  when 7  then 'body-protector-men-jka'
  when 8  then 'body-protector-women-jka'
  when 9  then 'body-protector-men-jkf'
  when 10 then 'body-protector-women-jkf'
  when 11 then 'mouth-guard-children'
  when 12 then 'mouth-guard'
  when 13 then 'groin-supporter'
  when 14 then 'red-blue-laces'
  when 15 then 'kumite-match-display-board'
  when 16 then 'match-flags'
  when 17 then 'stainless-steel-whistle'
  when 18 then 'plastic-whistle'
  when 19 then 'hand-mitt'
  when 20 then 'double-hand-mitt'
  when 21 then 'punching-mitts'
  when 22 then 'kick-mitt'
  when 23 then 'big-mitt'
  when 24 then 'fist-support-tshirt-long'
  when 25 then 'hirota-original-i-tshirt'
  when 26 then 'hirota-original-ii-tshirt'
  when 27 then 'fist-support-tshirt-short'
  when 28 then 'wanna-be-strong-tshirt'
  when 29 then 'kumite-backpack'
  when 30 then 'muffler-towel'
  when 31 then 'hand-towel'
  when 32 then 'bear-keychains'
end;

alter table products alter column slug set not null;
alter table products add constraint products_slug_key unique (slug);
