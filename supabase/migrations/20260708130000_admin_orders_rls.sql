-- ============================================================================
-- Admin orders access — RLS that lets THE admin read orders and advance the
-- three status axes, and nothing more.
--
-- Until now orders/order_items had RLS enabled with NO policies (deny-all): the
-- checkout path reaches them only via the secret key (which bypasses RLS). The
-- admin panel, by contrast, reads/writes through the SSR AUTH client — the
-- admin's cookie session, running as the `authenticated` role. So access must be
-- granted in RLS, gated by the Sprint A predicate public.is_admin(). The
-- publishable/anon path stays fully denied.
--
-- WRITE = STATUS ONLY. A placed order is an immutable snapshot (§7). Two layers
-- enforce that on UPDATE:
--   1. RLS policy  → only the admin, only existing order rows (no insert/delete).
--   2. Column GRANT → only the three status columns are writable; every other
--      column (money, snapshot, contact) is rejected by the engine.
-- Together: the admin can advance payment/production/shipping and touch nothing
-- else; no one can create or delete a placed order through this path.
-- ============================================================================

-- Reads: the admin sees all orders and their line-item snapshots.
create policy orders_admin_select
  on orders for select
  using (public.is_admin());

create policy order_items_admin_select
  on order_items for select
  using (public.is_admin());

-- Writes: the admin may UPDATE existing order rows (status advancement). USING
-- gates which rows are visible to update; WITH CHECK re-verifies after the write
-- so a row can't be flipped out of admin ownership.
create policy orders_admin_update
  on orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- Column-level lockdown: Supabase grants `authenticated` UPDATE on all columns
-- by default (RLS is what restrains it). Narrow that to the three status columns
-- so even the admin's own session cannot mutate money, the snapshot, or contact
-- data on a placed order. The BEFORE trigger that bumps updated_at is unaffected
-- (it tuple-writes inside the trigger; column privileges apply to the statement's
-- target columns, not trigger-set fields).
revoke update on orders from authenticated;
grant  update (payment_status, production_status, shipping_status)
  on orders to authenticated;
