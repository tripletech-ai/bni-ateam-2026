/**
 * 套用 A Team 認領規則（20 分會綁定 / 外來賓新認領）
 *
 *   $env:BNI_API_KEY = "ik_..."
 *   node scripts/apply-claim-policy.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rawSql, BNI_API_BASE, BNI_API_KEY } from './insforge-admin-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!BNI_API_KEY) {
    console.error('請設定 BNI_API_KEY');
    process.exit(1);
  }
  const sql = readFileSync(join(__dirname, 'claim-policy.sql'), 'utf8');
  console.log('Applying claim policy to', BNI_API_BASE);
  await rawSql(sql);
  console.log('Done. 20-branch bind + guest register rules are active.');
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
