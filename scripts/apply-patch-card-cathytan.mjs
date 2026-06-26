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
  const sql = readFileSync(join(__dirname, 'patch-card-cathytan.sql'), 'utf8');
  console.log('Applying patch-card-cathytan.sql…');
  const result = await rawSql(sql);
  console.log('Done.', result?.rowsAffected ?? result);
}

main().catch(e => { console.error(e); process.exit(1); });
