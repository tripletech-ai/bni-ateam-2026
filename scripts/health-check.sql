-- 一鍵健康檢查（部署後驗證）
-- node scripts/run-insforge-sql.mjs scripts/health-check.sql

SELECT 'admin_rpcs' AS check_name, count(*)::int AS ok_count
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND proname LIKE 'bni_admin_%';

SELECT 'duplicate_members' AS check_name, count(*)::int AS problem_count
FROM (
  SELECT name, branch FROM bni_members WHERE active = true
  GROUP BY name, branch HAVING count(*) > 1
) d;

SELECT 'connection_marks_table' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bni_connection_marks'
  ) AS ok;

SELECT 'mark_rpcs' AS check_name, count(*)::int AS ok_count
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'bni_record_connection_mark', 'bni_remove_connection_mark',
    'bni_get_incoming_marks', 'bni_ack_incoming_marks'
  );

SELECT 'public_members_rpc' AS check_name,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND proname = 'bni_get_public_members'
  ) AS ok;

SELECT 'members_rls' AS check_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'bni_members';
