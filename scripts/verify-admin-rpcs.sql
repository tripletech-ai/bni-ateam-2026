-- 驗證管理員 RPC 是否存在
SELECT proname AS fn
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname LIKE 'bni_admin_%'
ORDER BY proname;
