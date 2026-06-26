-- 全庫重複名單整合（保留 canonical，其餘停用）
-- node scripts/run-insforge-sql.mjs scripts/consolidate-all-dupes.sql

-- 王祈 · 長輝：保留 samuel900731@gmail.com
-- 張巧瑜 · 長悅：保留 roster 008 · cforest0424@gmail.com
-- 楊曉凡 · 金澎湃：保留 roster 093 · shoufan39@gmail.com

DELETE FROM bni_onboarding
WHERE bound_member_id IN (
  '373d8938-b2e7-4c78-91a2-fc95927d0121',
  'e681256d-bf7b-44f9-9cdd-058f96fc419c',
  '3fa36197-9d8e-42f8-b7cb-4cfab85b2325',
  '83ffbcac-36e3-44d4-8e73-c690787557d2'
);

DELETE FROM bni_onboarding o
USING bni_members m
WHERE o.auth_user_id = m.auth_user_id
  AND m.id IN (
    '373d8938-b2e7-4c78-91a2-fc95927d0121',
    'e681256d-bf7b-44f9-9cdd-058f96fc419c',
    '3fa36197-9d8e-42f8-b7cb-4cfab85b2325',
    '83ffbcac-36e3-44d4-8e73-c690787557d2'
  );

UPDATE bni_members
SET active = false,
    auth_user_id = NULL,
    google_email = NULL,
    updated_at = now()
WHERE id IN (
  '373d8938-b2e7-4c78-91a2-fc95927d0121',
  'e681256d-bf7b-44f9-9cdd-058f96fc419c',
  '3fa36197-9d8e-42f8-b7cb-4cfab85b2325',
  '83ffbcac-36e3-44d4-8e73-c690787557d2'
);

-- 驗證：應無 active 重複
SELECT name, branch, count(*) AS cnt
FROM bni_members WHERE active = true
GROUP BY name, branch HAVING count(*) > 1;
