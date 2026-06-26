import { rawSql } from './insforge-admin-api.mjs';

const fns = await rawSql(`
  SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname LIKE 'bni_update_my_profile%'
     OR (n.nspname = 'public' AND p.proname IN (
      'bni_get_my_status','bni_register_new_member','bni_bind_existing_member',
      'bni_self_unbind','bni_complete_tutorial','bni_auto_bind_on_login'
    ))
  ORDER BY p.proname, args
`);
console.log('RPCs:', JSON.stringify(fns?.rows || fns, null, 2));

const cols = await rawSql(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name='bni_members'
    AND column_name IN ('bio','card_link','industries')
  ORDER BY 1
`);
console.log('columns:', cols?.rows || cols);
