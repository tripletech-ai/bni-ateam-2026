-- 楊日陞 NameGain 名片
UPDATE bni_members
SET
  card_link = 'https://namegain.introvista.ai/card/anderson-yang',
  updated_at = now()
WHERE active = true
  AND regexp_replace(name, '[^\u4e00-\u9fff]', '', 'g') = '楊日陞';
