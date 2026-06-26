-- 長輝分會 · 洪儀君 — 媒合資料修正
UPDATE bni_members SET
  profession = '手足指甲保健',
  have = E'手足指甲保健、健甲照護\n健甲專家 H.N.P／足日 zuday 健甲管理中心\n運動傷害防護背景',
  want_meet = E'皮膚科診所\n運動醫學診所\n長照產業\n想轉型健甲的美甲師',
  line_id = 'hnp2016',
  line_link = '',
  card_link = COALESCE(NULLIF(trim(card_link), ''), 'https://namegain.introvista.ai/card/3eb7939c-6cf5-4d60-b401-e1b08a88d82f?ref=e3d5e4aecc89'),
  updated_at = now()
WHERE active = true
  AND name = '洪儀君'
  AND branch = '長輝分會';
