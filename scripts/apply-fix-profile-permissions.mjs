import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rawSql } from './insforge-admin-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.BNI_API_KEY) {
    console.error('Set BNI_API_KEY');
    process.exit(1);
  }
  const sql = readFileSync(join(__dirname, 'fix-profile-permissions.sql'), 'utf8');
  console.log('Applying fix-profile-permissions.sql...');
  await rawSql(sql);
  console.log('Done.');

  const check = await rawSql(`
    SELECT pg_get_function_identity_arguments(p.oid) AS args,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'bni_update_my_profile'
  `);
  console.log('bni_update_my_profile:', check?.rows?.[0] || check);
}

main().catch(e => { console.error(e); process.exit(1); });
