-- ============================================================================
-- Admin copy editing for simple products (Equipment / Accessories).
--
-- Sprint C granted only (price, stock) as writable on `products` (Pattern A row
-- editor). This extends the SAME admin-only path to the localized copy columns
-- so the two catalog-mirror sections can author name / description / product_type
-- in both EN and JA — each is JSONB {en, ja}, so a single column already holds
-- both languages (no per-language columns).
--
-- Guard is unchanged and two-layered:
--   1. RLS  → products_admin_update already gates UPDATE to public.is_admin().
--   2. GRANT → widen the writable column set. anon stays with no UPDATE grant;
--      non-admin authenticated is still blocked by RLS regardless of the grant.
-- Structure/identity columns (id, category, subcategory, price, stock, options)
-- keep their prior grants; adding a product remains a migration (§ guardrails).
-- ============================================================================

grant update (name, description, product_type) on products to authenticated;
