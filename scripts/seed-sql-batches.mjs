import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rawSql } from './insforge-admin-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  for (let i = 2; i <= 4; i++) {
    const sql = readFileSync(join(__dirname, `seed-batch-${i}.sql`), 'utf8');
    console.log('Running batch', i);
    await rawSql(sql);
  }
  const r = await rawSql('SELECT count(*)::int as c FROM bni_members');
  console.log('Total members:', r.rows[0].c);
}

main().catch(e => { console.error(e); process.exit(1); });
