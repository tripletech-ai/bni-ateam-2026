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
  const sql = readFileSync(join(__dirname, 'member-industries.sql'), 'utf8');
  console.log('Applying member-industries.sql...');
  await rawSql(sql);
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
