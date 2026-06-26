import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rawSql } from './insforge-admin-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.BNI_API_KEY) {
    console.error('Set BNI_API_KEY');
    process.exit(1);
  }
  const sqlPath = join(__dirname, 'event-chapters.sql');
  if (!existsSync(sqlPath)) {
    console.error('Run: node scripts/generate-event-chapters-sql.mjs first');
    process.exit(1);
  }
  const sql = readFileSync(sqlPath, 'utf8');
  console.log('Applying event-chapters.sql...');
  await rawSql(sql);
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
