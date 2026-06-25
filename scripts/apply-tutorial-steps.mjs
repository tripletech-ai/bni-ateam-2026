/**
 * 更新新手教學步驟（含「完善媒合名片」步驟）
 *
 *   $env:BNI_API_KEY = "ik_..."
 *   node scripts/apply-tutorial-steps.mjs
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
  const sql = readFileSync(join(__dirname, 'tutorial-steps-seed.sql'), 'utf8');
  console.log('Updating tutorial steps on', BNI_API_BASE);
  await rawSql(sql);
  console.log('Done — 8 steps including profile template guidance.');
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
