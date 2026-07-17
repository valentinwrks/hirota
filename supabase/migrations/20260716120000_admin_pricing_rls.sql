-- ============================================================================
-- Admin pricing/stock write access — Sprint C.
--
-- The five catalog-mirror admin sections edit the SAME reference tables the
-- pricing engine reads (§10): a saved value flows to the storefront and to
-- future orders by construction, while placed orders keep their frozen
-- order_items snapshots (§7) — nothing here touches orders.
--
-- Same two-layer guard as the orders sprint, per table:
--   1. RLS policy  → only the admin (public.is_admin()) may UPDATE.
--   2. Column GRANT → only the value column(s) are writable; identity/structure
--      columns (codes, names, sizes, labels, options) stay immutable.
-- No INSERT/DELETE policies anywhere: the admin edits VALUES, never structure —
-- adding a size, model, or product remains a migration.
--
-- NULL-cell guard: on the two tables where a NULL price means "not offered"
-- (obi_prices, gi_custom_base_prices' quote band), the USING clause also
-- requires the current value to be non-NULL, so the DATABASE refuses to turn a
-- "not offered" cell into a price. Offering a new size/band is structural.
--
-- Existing public SELECT policies are untouched (the storefront keeps reading);
-- checkout's stock decrement runs as service_role and ignores these grants.
-- ============================================================================

-- --- products: price + stock only (Pattern A row editor) --------------------
create policy products_admin_update
  on products for update
  using (public.is_admin())
  with check (public.is_admin());

revoke update on products from anon, authenticated;
grant  update (price, stock) on products to authenticated;

-- --- gi_standard_prices: price per (model, fit, size) -----------------------
create policy gi_standard_prices_admin_update
  on gi_standard_prices for update
  using (public.is_admin())
  with check (public.is_admin());

revoke update on gi_standard_prices from anon, authenticated;
grant  update (price) on gi_standard_prices to authenticated;

-- --- gi_custom_base_prices: band base price; quote band (NULL) stays quote --
create policy gi_custom_base_prices_admin_update
  on gi_custom_base_prices for update
  using (public.is_admin() and base_price is not null)
  with check (public.is_admin());

revoke update on gi_custom_base_prices from anon, authenticated;
grant  update (base_price) on gi_custom_base_prices to authenticated;

-- --- gi_options: flat add-on prices (0 = offered & free, editable) ----------
create policy gi_options_admin_update
  on gi_options for update
  using (public.is_admin())
  with check (public.is_admin());

revoke update on gi_options from anon, authenticated;
grant  update (price) on gi_options to authenticated;

-- --- gi_hem_prices: per (part, width, thickness) -----------------------------
create policy gi_hem_prices_admin_update
  on gi_hem_prices for update
  using (public.is_admin())
  with check (public.is_admin());

revoke update on gi_hem_prices from anon, authenticated;
grant  update (price) on gi_hem_prices to authenticated;

-- --- gi_high_waist_prices: per cm band ---------------------------------------
create policy gi_high_waist_prices_admin_update
  on gi_high_waist_prices for update
  using (public.is_admin())
  with check (public.is_admin());

revoke update on gi_high_waist_prices from anon, authenticated;
grant  update (price) on gi_high_waist_prices to authenticated;

-- --- gi_embroidery_prices: per-char by thread (shared standard + custom) ----
create policy gi_embroidery_prices_admin_update
  on gi_embroidery_prices for update
  using (public.is_admin())
  with check (public.is_admin());

revoke update on gi_embroidery_prices from anon, authenticated;
grant  update (price_per_char) on gi_embroidery_prices to authenticated;

-- --- obi_prices: per (color, material, width, size); NULL = not offered -----
create policy obi_prices_admin_update
  on obi_prices for update
  using (public.is_admin() and price is not null)
  with check (public.is_admin());

revoke update on obi_prices from anon, authenticated;
grant  update (price) on obi_prices to authenticated;

-- --- obi_embroidery_prices: per-char by (width, thread) ---------------------
create policy obi_embroidery_prices_admin_update
  on obi_embroidery_prices for update
  using (public.is_admin())
  with check (public.is_admin());

revoke update on obi_embroidery_prices from anon, authenticated;
grant  update (price_per_char) on obi_embroidery_prices to authenticated;
