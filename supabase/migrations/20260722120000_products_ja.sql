-- ============================================================================
-- Add Japanese (ja) localized content to the 32 simple products.
-- The original seed (20260701042829_products.sql) inserted EN only, noting
-- "JA added later". This merges the HIROTA-official JA name + description into
-- each product's JSONB using `||`, adding the "ja" key without disturbing "en".
-- Source: HIROTA i18n reference (docs/i18n) — official store copy.
-- Prices/options/type are unchanged (language-agnostic).
-- ============================================================================

update products set name = name || '{"ja":"正拳サポーター／B型"}'::jsonb,
  description = description || '{"ja":"ヒロタロゴ入り"}'::jsonb where id = 1;

update products set name = name || '{"ja":"正拳サポーター"}'::jsonb,
  description = description || '{"ja":"日本空手協会（JKA）指定"}'::jsonb where id = 2;

update products set name = name || '{"ja":"赤拳サポーター"}'::jsonb,
  description = description || '{"ja":"全空連検定"}'::jsonb where id = 3;

update products set name = name || '{"ja":"青拳サポーター"}'::jsonb,
  description = description || '{"ja":"全空連検定"}'::jsonb where id = 4;

update products set name = name || '{"ja":"赤・青リバーシブル拳サポーター"}'::jsonb,
  description = description || '{"ja":"全空連検定。手首の固定部分にゴムバンド、親指の付け根部分にゴム生地を使用し、はめやすくしています。"}'::jsonb where id = 5;

update products set name = name || '{"ja":"赤青シンガード・インステップガード"}'::jsonb,
  description = description || '{"ja":"全空連検定・学連指定"}'::jsonb where id = 6;

update products set name = name || '{"ja":"ボディプロテクター／C型"}'::jsonb,
  description = description || '{"ja":"日本空手協会（JKA）指定"}'::jsonb where id = 7;

update products set name = name || '{"ja":"ボディプロテクター／NB型"}'::jsonb,
  description = description || '{"ja":"日本空手協会（JKA）指定"}'::jsonb where id = 8;

update products set name = name || '{"ja":"ボディプロテクター／C型"}'::jsonb,
  description = description || '{"ja":"全空連検定"}'::jsonb where id = 9;

update products set name = name || '{"ja":"ボディプロテクター／NB型"}'::jsonb,
  description = description || '{"ja":"全空連検定"}'::jsonb where id = 10;

update products set name = name || '{"ja":"マウスピース 少年用"}'::jsonb,
  description = description || '{"ja":"熱湯で10秒ほど柔らかくして、上の歯にあてて使用します。"}'::jsonb where id = 11;

update products set name = name || '{"ja":"マウスピース 一般用"}'::jsonb,
  description = description || '{"ja":"熱湯で10秒ほど柔らかくして、上の歯にあてて使用します。"}'::jsonb where id = 12;

update products set name = name || '{"ja":"金的サポーター"}'::jsonb,
  description = description || '{"ja":"男性用金的保護サポーター"}'::jsonb where id = 13;

update products set name = name || '{"ja":"試合用 赤・青ひも"}'::jsonb,
  description = description || '{"ja":"フリーサイズ"}'::jsonb where id = 14;

update products set name = name || '{"ja":"組手 試合表示板"}'::jsonb,
  description = description || '{"ja":"縦35cm×横41cm"}'::jsonb where id = 15;

update products set name = name || '{"ja":"試合用 白・赤・青旗"}'::jsonb,
  description = description || '{"ja":"試合用審判旗"}'::jsonb where id = 16;

update products set name = name || '{"ja":"ステンレス笛"}'::jsonb,
  description = description || '{"ja":"ステンレス製"}'::jsonb where id = 17;

update products set name = name || '{"ja":"プラスチック笛"}'::jsonb,
  description = description || '{"ja":"プラスチック製"}'::jsonb where id = 18;

update products set name = name || '{"ja":"ハンドミット シングル"}'::jsonb,
  description = description || '{"ja":"縦40cm×横20cm×厚さ6cm"}'::jsonb where id = 19;

update products set name = name || '{"ja":"ハンドミット ダブル"}'::jsonb,
  description = description || '{"ja":"縦40cm×横20cm×厚さ12cm"}'::jsonb where id = 20;

update products set name = name || '{"ja":"パンチングミット"}'::jsonb,
  description = description || '{"ja":"縦25cm×横19cm×厚さ9cm・両手一組"}'::jsonb where id = 21;

update products set name = name || '{"ja":"キックミット"}'::jsonb,
  description = description || '{"ja":"縦47cm×横23cm×厚さ11cm"}'::jsonb where id = 22;

update products set name = name || '{"ja":"ビックミット"}'::jsonb,
  description = description || '{"ja":"縦65cm×横43cm×厚さ13cm"}'::jsonb where id = 23;

update products set name = name || '{"ja":"拳サポワンポイント刺しゅう入りロンT"}'::jsonb,
  description = description || '{"ja":"拳サポーターモチーフのワンポイント刺しゅう入り長袖Tシャツ"}'::jsonb where id = 24;

update products set name = name || '{"ja":"オリジナルロンT Type1"}'::jsonb,
  description = description || '{"ja":"ヒロタオリジナル長袖Tシャツ"}'::jsonb where id = 25;

update products set name = name || '{"ja":"オリジナルロンT Type2"}'::jsonb,
  description = description || '{"ja":"ヒロタオリジナル長袖Tシャツ"}'::jsonb where id = 26;

update products set name = name || '{"ja":"拳サポワンポイント刺しゅう入り半袖Tシャツ"}'::jsonb,
  description = description || '{"ja":"拳サポーターモチーフのワンポイント刺しゅう入り"}'::jsonb where id = 27;

update products set name = name || '{"ja":"Wanna Be Strong 半袖Tシャツ"}'::jsonb,
  description = description || '{"ja":"Wanna Be Strong デザイン"}'::jsonb where id = 28;

update products set name = name || '{"ja":"New空手用バックパック"}'::jsonb,
  description = description || '{"ja":"組手用品をまとめて収納できる空手用バックパック"}'::jsonb where id = 29;

update products set name = name || '{"ja":"オリジナルマフラータオル"}'::jsonb,
  description = description || '{"ja":"横26cm×縦115cm"}'::jsonb where id = 30;

update products set name = name || '{"ja":"手ぬぐい"}'::jsonb,
  description = description || '{"ja":"横33cm×縦90cm"}'::jsonb where id = 31;

update products set name = name || '{"ja":"ヒロタオリジナル熊キーホルダー"}'::jsonb,
  description = description || '{"ja":"かわいい熊の空手家をモチーフにしたキーホルダー"}'::jsonb where id = 32;
