-- ============================================================================
-- Localize product_type. It was a plain English `text` tag ("kumite protection"
-- etc.); promote it to localized JSONB {en, ja} like name/description, so the
-- catalog card shows the HIROTA-official JA type (少年・一般用, 男性用組手防具,
-- 綿100％・男女兼用 …). Existing English text becomes the "en" value; the "ja"
-- value is merged in per product. Source: HIROTA i18n reference (docs/i18n).
-- ============================================================================

alter table products
  alter column product_type type jsonb
  using case
    when product_type is null then null
    else jsonb_build_object('en', product_type)
  end;

update products set product_type = product_type || '{"ja":"少年・一般用"}'::jsonb where id = 1;
update products set product_type = product_type || '{"ja":"少年・一般用"}'::jsonb where id = 2;
update products set product_type = product_type || '{"ja":"小学校・中学校・高校・一般用"}'::jsonb where id = 3;
update products set product_type = product_type || '{"ja":"小学校・中学校・高校・一般用"}'::jsonb where id = 4;
update products set product_type = product_type || '{"ja":"小学生用"}'::jsonb where id = 5;
update products set product_type = product_type || '{"ja":"組手試合用"}'::jsonb where id = 6;
update products set product_type = product_type || '{"ja":"男性用組手防具"}'::jsonb where id = 7;
update products set product_type = product_type || '{"ja":"女性用組手防具"}'::jsonb where id = 8;
update products set product_type = product_type || '{"ja":"男性用組手防具"}'::jsonb where id = 9;
update products set product_type = product_type || '{"ja":"女性用組手防具"}'::jsonb where id = 10;
update products set product_type = product_type || '{"ja":"少年用組手防具"}'::jsonb where id = 11;
update products set product_type = product_type || '{"ja":"一般用組手防具"}'::jsonb where id = 12;
update products set product_type = product_type || '{"ja":"男性用組手防具"}'::jsonb where id = 13;
update products set product_type = product_type || '{"ja":"赤・青試合用品"}'::jsonb where id = 14;
update products set product_type = product_type || '{"ja":"1コート用審判用品"}'::jsonb where id = 15;
update products set product_type = product_type || '{"ja":"審判用品"}'::jsonb where id = 16;
update products set product_type = product_type || '{"ja":"審判用品"}'::jsonb where id = 17;
update products set product_type = product_type || '{"ja":"審判用品"}'::jsonb where id = 18;
update products set product_type = product_type || '{"ja":"鍛練用品"}'::jsonb where id = 19;
update products set product_type = product_type || '{"ja":"鍛練用品"}'::jsonb where id = 20;
update products set product_type = product_type || '{"ja":"鍛練用品"}'::jsonb where id = 21;
update products set product_type = product_type || '{"ja":"鍛練用品"}'::jsonb where id = 22;
update products set product_type = product_type || '{"ja":"鍛練用品"}'::jsonb where id = 23;
update products set product_type = product_type || '{"ja":"綿100％・男女兼用"}'::jsonb where id = 24;
update products set product_type = product_type || '{"ja":"綿100％・男女兼用"}'::jsonb where id = 25;
update products set product_type = product_type || '{"ja":"綿100％・男女兼用"}'::jsonb where id = 26;
update products set product_type = product_type || '{"ja":"綿100％・男女兼用"}'::jsonb where id = 27;
update products set product_type = product_type || '{"ja":"綿100％・男女兼用"}'::jsonb where id = 28;
update products set product_type = product_type || '{"ja":"500個限定販売"}'::jsonb where id = 29;
update products set product_type = product_type || '{"ja":"ヒロタオリジナルグッズ"}'::jsonb where id = 30;
update products set product_type = product_type || '{"ja":"ヒロタオリジナルグッズ"}'::jsonb where id = 31;
update products set product_type = product_type || '{"ja":"ヒロタオリジナルグッズ"}'::jsonb where id = 32;
