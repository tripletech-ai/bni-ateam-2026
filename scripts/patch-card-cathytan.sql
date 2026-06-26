-- 譚愷悌 Cathy Tan — NameGain 名片
-- https://namegain.introvista.ai/card/cathytan

ALTER TABLE bni_members ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE bni_members ADD COLUMN IF NOT EXISTS card_link text DEFAULT '';

UPDATE bni_members
SET
  card_link = 'https://namegain.introvista.ai/card/cathytan',
  bio = CASE
    WHEN COALESCE(trim(bio), '') = '' THEN '富而喜悅財富流沙盤企業內訓以沉浸式遊戲化方式，讓個人及企業有效理解及運用BNI系統槓桿，創造並激發學員目標感，深化片實戰模擬，帶入現實工作現學現用，轉化知識為有效行動，助力企業更好的落地領導與戰略。'
    ELSE bio
  END,
  updated_at = now()
WHERE active = true
  AND regexp_replace(name, '[^\u4e00-\u9fff]', '', 'g') = '譚愷悌';
