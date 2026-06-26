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
  const sql = readFileSync(join(__dirname, 'fix-onboard-db.sql'), 'utf8');
  console.log('Applying fix-onboard-db.sql to', process.env.BNI_API_BASE || 'https://a-team9204.zeabur.app');
  await rawSql(sql);
  console.log('Done.');

  const check = await rawSql(`
    SELECT name, branch, card_link IS NOT NULL AS has_card
    FROM bni_members
    WHERE active = true
      AND regexp_replace(name, '[^\\u4e00-\\u9fff]', '', 'g') = '譚愷悌'
    LIMIT 1
  `);
  console.log('譚愷悌:', check?.rows?.[0] || check);

  const fn = await rawSql(`
    SELECT proname FROM pg_proc
    WHERE proname IN ('bni_register_new_member', 'bni_auto_bind_on_login')
    ORDER BY proname
  `);
  console.log('RPC functions:', fn?.rows || fn);
}

main().catch(e => { console.error(e); process.exit(1); });
