-- 長輝分會：合併李孟一、孫成育重複名單（保留 canonical 列，其餘停用）
-- 執行：node scripts/run-insforge-sql.mjs scripts/consolidate-changhui-dupes.sql

-- 孫成育 canonical：efa77e62（roster 038 · b1993614@gmail.com）
-- 李孟一 canonical：e4088bee（首筆完整 profession）

DELETE FROM bni_onboarding
WHERE bound_member_id IN (
  'ad7265cd-fb4f-4941-a086-fc16c4e4f8e2',
  'c1f308b6-fbe0-48a5-94b5-6551181c531c',
  '689a770b-7c81-4153-ac67-629b793190d4',
  '076dd438-770b-4a9b-affe-af472d971d02',
  'fbd32cd6-9b8b-4de0-a089-d679fea60e6a',
  'acd7a69a-6187-40d3-a76e-a51be15388c6'
);

DELETE FROM bni_onboarding o
USING bni_members m
WHERE o.auth_user_id = m.auth_user_id
  AND m.id IN (
    'ad7265cd-fb4f-4941-a086-fc16c4e4f8e2',
    'c1f308b6-fbe0-48a5-94b5-6551181c531c',
    '689a770b-7c81-4153-ac67-629b793190d4',
    '076dd438-770b-4a9b-affe-af472d971d02',
    'fbd32cd6-9b8b-4de0-a089-d679fea60e6a',
    'acd7a69a-6187-40d3-a76e-a51be15388c6'
  );

UPDATE bni_members
SET active = false,
    auth_user_id = NULL,
    google_email = NULL,
    updated_at = now()
WHERE id IN (
  'ad7265cd-fb4f-4941-a086-fc16c4e4f8e2',
  'c1f308b6-fbe0-48a5-94b5-6551181c531c',
  '689a770b-7c81-4153-ac67-629b793190d4',
  '076dd438-770b-4a9b-affe-af472d971d02',
  'fbd32cd6-9b8b-4de0-a089-d679fea60e6a',
  'acd7a69a-6187-40d3-a76e-a51be15388c6'
);

SELECT name, branch, id, roster_id, status, active,
  left(coalesce(profession, ''), 40) AS profession,
  google_email
FROM bni_members
WHERE branch = '長輝分會'
  AND name IN ('李孟一', '孫成育')
ORDER BY name, active DESC, created_at;
