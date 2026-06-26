import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rawSql } from './insforge-admin-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.BNI_API_KEY) {
    console.error('Set BNI_API_KEY (InsForge admin API key)');
    process.exit(1);
  }
  const sql = readFileSync(join(__dirname, 'fix-register-rpc.sql'), 'utf8');
  console.log('Applying fix-register-rpc.sql to', process.env.BNI_API_BASE || 'https://a-team9204.zeabur.app');
  await rawSql(sql);
  console.log('Done — bni_register_new_member now accepts p_industries.');
}

main().catch(e => { console.error(e); process.exit(1); });
