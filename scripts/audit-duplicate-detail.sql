-- 全庫重複名單詳情（整合前查詢）
SELECT id, name, branch, roster_id, status, active,
  auth_user_id IS NOT NULL AS bound,
  left(coalesce(profession,''), 30) AS profession,
  google_email, created_at::text
FROM bni_members
WHERE active = true
  AND (name, branch) IN (
    ('王祈', '長輝分會'),
    ('張巧瑜', '長悅分會'),
    ('楊曉凡', '金澎湃分會')
  )
ORDER BY name, branch, created_at;
