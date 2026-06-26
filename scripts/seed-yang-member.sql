-- 楊日陞：後台名單 + boss 登入認領用（A Team分會 / guest 區）
INSERT INTO bni_members (
  name, branch, region, profession, have, want_meet, want_referral,
  line_id, line_link, tags, industries, status, active
)
SELECT
  '楊日陞',
  'A Team分會',
  'guest',
  '區域資深董事',
  'BNI Anderson Team 區域資深董事',
  '',
  '',
  '', '', '[]'::jsonb, '{}'::text[],
  'roster',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM bni_members
  WHERE active = true
    AND regexp_replace(name, '[^\u4e00-\u9fff]', '', 'g') = '楊日陞'
);
