-- 張巧瑜 — NameGain 名片
-- https://namegain.introvista.ai/card/clairechang

UPDATE bni_members
SET
  card_link = 'https://namegain.introvista.ai/card/clairechang',
  bio = CASE
    WHEN COALESCE(trim(bio), '') = '' THEN E'禾東創意成立15年，專營客製化網站開發與數位行銷宣傳品製作。\n\n服務領域含政黨、半導體科技、媒體、飯店、建設、餐飲等；近期專案含緯來電視台、六福萬怡酒店、台亞半導體、大毅科技 ESG 等。\n\n2026 年創立海洋主題伴手禮品牌 HEXI，已於馬爾地夫及日本石垣島展開銷售。'
    ELSE bio
  END,
  updated_at = now()
WHERE active = true
  AND name = '張巧瑜'
  AND branch = '長悅分會';

SELECT name, branch, left(coalesce(card_link, ''), 60) AS card_link,
  left(coalesce(bio, ''), 80) AS bio_preview
FROM bni_members
WHERE active = true AND name = '張巧瑜' AND branch = '長悅分會';
