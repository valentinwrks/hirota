-- ============================================================================
-- create_order — the SINGLE, ATOMIC path for guest-checkout order creation.
--
-- WHY A FUNCTION: supabase-js has no multi-statement transaction API — each
-- .insert() is its own request, so doing "insert order + insert items +
-- decrement stock" from JS is not atomic (a mid-way failure leaves a partial
-- order). A plpgsql function body runs in ONE implicit transaction: any
-- `raise` inside it rolls back everything. This is the correct Supabase pattern
-- for several writes that must be all-or-nothing.
--
-- WHAT IT DOES *NOT* DO: no pricing. The checkout server action already re-ran
-- the pure engine over fresh DB data and computed every amount (AGENTS §6); this
-- function only PERSISTS those server-computed values and guards stock. Keep all
-- business rules in the engine, never here.
--
-- SECURITY: called only via the SECRET key (service_role), which bypasses RLS,
-- so no SECURITY DEFINER is needed (default INVOKER runs as service_role).
-- Execute is revoked from anon/authenticated so it is not exposed on the public
-- PostgREST RPC surface — orders remain server-side-only per §5.
--
-- STOCK: decremented for SIMPLE (Pattern A) items only — configurators are
-- made-to-order with no stock. The decrement is guarded (`stock >= qty`); if any
-- simple line is short at commit time the whole checkout rolls back cleanly
-- (no partial order, no negative stock).
--
-- INPUTS:
--   order_data : jsonb  -- one object: buyer contact, shipping_address, note,
--                          the three status enums, total_jpy, display_currency,
--                          fx_rate_usd_jpy (null for JPY).
--   items_data : jsonb  -- array of line objects: kind, title, quantity,
--                          unit_price_jpy, line_total_jpy, config (the frozen
--                          resolved-config snapshot), and product_id (simple only).
-- RETURNS: the new order's id + human-readable order_number.
-- ============================================================================

create or replace function create_order(order_data jsonb, items_data jsonb)
returns table (id uuid, order_number bigint)
language plpgsql
as $$
declare
  v_order_id     uuid;
  v_order_number bigint;
  v_item         jsonb;
  v_affected     integer;
begin
  -- 1) The order. total_jpy + statuses are server-computed; we only store them.
  insert into orders (
    customer_name, customer_email, customer_phone,
    shipping_address, customer_note,
    payment_status, production_status, shipping_status,
    total_jpy, display_currency, fx_rate_usd_jpy
  ) values (
    order_data ->> 'customer_name',
    order_data ->> 'customer_email',
    order_data ->> 'customer_phone',
    order_data ->  'shipping_address',
    order_data ->> 'customer_note',
    (order_data ->> 'payment_status')::order_payment_status,
    (order_data ->> 'production_status')::order_production_status,
    (order_data ->> 'shipping_status')::order_shipping_status,
    (order_data ->> 'total_jpy')::integer,
    (order_data ->> 'display_currency')::currency,
    nullif(order_data ->> 'fx_rate_usd_jpy', '')::numeric
  )
  returning orders.id, orders.order_number
    into v_order_id, v_order_number;

  -- 2) Each line item + guarded stock decrement for simple items.
  for v_item in select * from jsonb_array_elements(items_data)
  loop
    insert into order_items (
      order_id, kind, title, quantity, unit_price_jpy, line_total_jpy, config
    ) values (
      v_order_id,
      (v_item ->> 'kind')::order_item_kind,
      v_item ->> 'title',
      (v_item ->> 'quantity')::smallint,
      (v_item ->> 'unit_price_jpy')::integer,
      (v_item ->> 'line_total_jpy')::integer,
      v_item -> 'config'
    );

    if (v_item ->> 'kind') = 'simple' then
      update products
        set stock = stock - (v_item ->> 'quantity')::integer
        where products.id = (v_item ->> 'product_id')::integer
          and products.stock >= (v_item ->> 'quantity')::integer;

      get diagnostics v_affected = row_count;
      if v_affected = 0 then
        -- No row updated => insufficient stock (or missing product). Roll back
        -- the whole order. The server action maps this message to a clean
        -- "out of stock" failure; the buyer's cart stays intact.
        raise exception 'insufficient_stock'
          using detail = v_item ->> 'product_id';
      end if;
    end if;
  end loop;

  return query select v_order_id, v_order_number;
end;
$$;

-- Keep it off the public RPC surface: only the secret key (service_role) calls
-- it. Functions are granted to PUBLIC by default, so revoke that (which covers
-- anon + authenticated) and re-grant to service_role only.
revoke execute on function create_order(jsonb, jsonb) from public;
grant  execute on function create_order(jsonb, jsonb) to service_role;
