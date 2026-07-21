-- ============================================================================
-- News / お知らせ — the about-column announcements feed.
--
-- Replicates the announcements block on HIROTA's official landing page: a short
-- list of dated posts (date · title · body). Content is SINGLE-LANGUAGE per post
-- (authored as-is, typically Japanese) — NOT the {en,ja} JSONB localisation used
-- for catalog content (§6), by product decision: announcements are written once
-- and shown verbatim in both locales.
--
-- Full admin CRUD (unlike the pricing tables, which are value-only edits): the
-- admin creates, edits, and removes posts over time. Two-layer guard, per the
-- project convention: RLS restricts every write to public.is_admin(); the public
-- (publishable key) can only read.
-- ============================================================================

create table news (
  id            bigint      generated always as identity primary key,
  published_on  date        not null default current_date,
  title         text        not null,
  body          text        not null,
  created_at    timestamptz not null default now()
);

-- Newest first; created_at breaks ties within a single day.
create index news_published_on_idx on news (published_on desc, created_at desc);

alter table news enable row level security;

-- Public: read-only.
create policy news_public_read on news for select using (true);

-- Admin (is_admin): full create / edit / delete.
create policy news_admin_insert on news for insert
  with check (public.is_admin());
create policy news_admin_update on news for update
  using (public.is_admin()) with check (public.is_admin());
create policy news_admin_delete on news for delete
  using (public.is_admin());

-- The publishable (anon) key never writes; the admin session (authenticated)
-- does, gated by the policies above. Public SELECT stays on the default grant.
revoke insert, update, delete on news from anon;
grant  insert, update, delete on news to authenticated;
