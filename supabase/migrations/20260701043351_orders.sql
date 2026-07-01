-- ============================================================================
-- Block 6 — Orders (guest checkout) + order items with resolved-config snapshot.
--
-- SECURITY: orders & order_items hold personal data. RLS is enabled with NO
-- policies, so the publishable (anon) key can do NOTHING here. All access is
-- server-side via the secret key (which bypasses RLS): the checkout server
-- action revalidates prices with the pricing engine, then inserts; the admin
-- reads/updates behind the auth gate. The browser never touches an order.
-- ============================================================================

create type currency                as enum ('JPY', 'USD');
create type order_payment_status    as enum ('pending', 'paid', 'cancelled');
create type order_production_status as enum ('pending', 'in_production', 'ready');
create type order_shipping_status   as enum ('pending', 'shipped', 'delivered');
create type order_item_kind         as enum ('simple', 'gi_standard', 'gi_custom', 'obi');

create table orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      bigint generated always as identity,   -- human-readable, for display
  -- guest buyer (no account)
  customer_name     text not null,
  customer_email    text not null,
  customer_phone    text,
  shipping_address  jsonb not null,   -- {line1,line2,city,state,postal_code,country}
  -- independent statuses the admin advances
  payment_status    order_payment_status    not null default 'pending',
  production_status order_production_status not null default 'pending',
  shipping_status   order_shipping_status   not null default 'pending',
  -- money: JPY is the source of truth; display currency + FX are what the buyer saw
  total_jpy         integer  not null,
  display_currency  currency not null default 'JPY',
  fx_rate_usd_jpy   numeric(10,4),    -- rate used at purchase time; NULL when JPY
  customer_note     text,             -- buyer's remarks (備考欄)
  admin_note        text,             -- internal
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  kind           order_item_kind not null,
  title          text    not null,   -- snapshot label for quick display
  quantity       smallint not null default 1,
  unit_price_jpy integer not null,
  line_total_jpy integer not null,
  -- full resolved configuration snapshot (model, measurements, options,
  -- embroidery, label, price breakdown). This is what the admin renders and
  -- what makes an order immutable against later price/model changes.
  config         jsonb   not null,
  created_at     timestamptz not null default now()
);

create index order_items_order_id_idx on order_items (order_id);
create index orders_created_at_idx    on orders (created_at desc);

-- keep updated_at fresh on orders
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- RLS: enabled with NO policies => anon/authenticated denied entirely.
-- Only the secret key (service role, server-side) can access these tables.
alter table orders      enable row level security;
alter table order_items enable row level security;