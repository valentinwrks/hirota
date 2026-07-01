-- Size charts: jacket (A–F) + pants (G–J) measurements per size, in cm.
-- `normal` = Pinac Kumite normal / MH-10/11/12, and the reference chart used
-- for custom band-fitting validation. `slim` = Tsubasa / Pinac Kumite slim.
-- size_code is ASCII-canonical ('0.5','S5'); the UI formats the display label.
-- Public read-only; writes happen via migrations / admin (service role).

create type gi_size_chart as enum ('normal', 'slim');

create table size_charts (
  chart       gi_size_chart not null,
  size_code   text          not null,
  sort_order  smallint      not null,
  a numeric(4,1) not null,  -- jacket length
  b numeric(4,1) not null,  -- jacket width (shoulder)
  c numeric(4,1) not null,  -- sleeve length (adjustable in standard)
  d numeric(4,1) not null,  -- sleeve width
  e numeric(4,1) not null,  -- jacket cuff / lower width
  f numeric(4,1) not null,  -- skirt slit depth — IGNORED for custom size fitting
  g numeric(4,1) not null,  -- pant waist
  h numeric(4,1) not null,  -- pant length (adjustable in standard; minus high waist when fitting)
  i numeric(4,1) not null,  -- pant thigh
  j numeric(4,1) not null,  -- pant hem width (minus high waist when fitting)
  primary key (chart, size_code)
);

insert into size_charts (chart, size_code, sort_order, a, b, c, d, e, f, g, h, i, j) values
  ('normal', 'S5', 1, 55, 41, 27.5, 14.5, 21.5, 20, 23, 61, 20.5, 18.5),
  ('normal', 'S6', 2, 57, 42, 29, 14.5, 21.5, 20, 23, 64, 20.5, 18.5),
  ('normal', 'S7', 3, 59, 43, 30.5, 14.5, 21.5, 20, 23, 67, 20.5, 18.5),
  ('normal', '0', 4, 61, 44, 32, 15, 23.5, 21, 24.5, 70, 21.5, 19.5),
  ('normal', '0.5', 5, 63, 46, 33, 15, 23.5, 21, 24.5, 73, 21.5, 19.5),
  ('normal', '1', 6, 66, 48, 34, 15.5, 24.5, 22, 26, 76, 22.5, 20.5),
  ('normal', '1.5', 7, 68, 50, 35.5, 15.5, 24.5, 22, 26, 79, 22.5, 20.5),
  ('normal', '2', 8, 70, 52, 37, 16, 25.5, 23, 27.5, 82, 23.5, 21.5),
  ('normal', '2.5', 9, 72, 54, 38.5, 16, 25.5, 23, 27.5, 85, 23.5, 21.5),
  ('normal', '3', 10, 74, 56, 40, 17, 26.5, 24, 29.5, 88, 25, 22.5),
  ('normal', '3.5', 11, 76, 58, 41.5, 17, 26.5, 24, 29.5, 91, 25, 22.5),
  ('normal', '4', 12, 79, 60, 43, 18, 28.5, 25, 31, 94, 26, 23.5),
  ('normal', '4.5', 13, 82, 61, 45, 18, 28.5, 25, 31, 97, 26, 23.5),
  ('normal', '5', 14, 85, 63, 46.5, 18.5, 30.5, 26, 32.5, 100, 27, 24.5),
  ('normal', '5.5', 15, 88, 64, 48, 18.5, 30.5, 26, 32.5, 103, 27, 24.5),
  ('normal', '6', 16, 91, 66, 49.5, 19.5, 31.5, 27, 34, 106, 28, 25.5),
  ('normal', '6.5', 17, 94, 67, 51, 19.5, 31.5, 27, 34, 109, 28, 25.5),
  ('normal', '7', 18, 97, 69, 52.5, 20.5, 32.5, 29, 36, 112, 29.5, 27.5),
  ('normal', '7.5', 19, 100, 70, 54, 20.5, 32.5, 29, 36, 115, 29.5, 27.5),
  ('normal', '8', 20, 103, 72, 55.5, 21.5, 33.5, 31, 37.5, 118, 30.5, 29.5),
  ('slim', '0.5', 1, 65, 44, 34.5, 13, 19, 26, 22, 81, 19, 23),
  ('slim', '1.5', 2, 70, 48, 37, 14, 20, 27, 23.5, 87, 20, 24),
  ('slim', '2.5', 3, 74, 52, 40, 15, 21, 28, 25, 92, 21, 25),
  ('slim', '3', 4, 76, 54, 41.5, 16, 22.5, 30, 27, 95, 22, 26),
  ('slim', '3.5', 5, 79, 56, 43, 16, 22.5, 30, 27, 98, 22, 26),
  ('slim', '4', 6, 82, 58, 44.5, 17, 24, 32, 29, 101, 23, 27),
  ('slim', '4.5', 7, 85, 59, 46.5, 17, 24, 32, 29, 104, 23, 27),
  ('slim', '5', 8, 88, 61, 47.5, 17.5, 26, 33, 30, 107, 24, 28),
  ('slim', '5.5', 9, 91, 62, 49, 17.5, 26, 33, 30, 110, 24, 28),
  ('slim', '6', 10, 94, 64, 50.5, 18.5, 27, 34, 32, 113, 25, 29),
  ('slim', '6.5', 11, 97, 65, 52, 18.5, 27, 34, 32, 116, 25, 29),
  ('slim', '7', 12, 100, 67, 53.5, 19.5, 28, 35, 34, 119, 26, 30);

alter table size_charts enable row level security;
create policy "size_charts public read" on size_charts for select using (true);