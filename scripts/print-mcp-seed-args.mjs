import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL = `INSERT INTO bni_members (roster_id, name, branch, region, profession, have, want_meet, want_referral, line_id, line_link, tags, status, active) SELECT r.roster_id, r.name, r.branch, r.region, r.profession, r.have, r.want_meet, r.want_referral, r.line_id, r.line_link, r.tags, r.status, r.active FROM jsonb_to_recordset($1::jsonb) AS r(roster_id text, name text, branch text, region text, profession text, have text, want_meet text, want_referral text, line_id text, line_link text, tags jsonb, status text, active boolean) ON CONFLICT (roster_id) DO NOTHING;`;

for (let i = 1; i <= 4; i++) {
  const json = readFileSync(join(__dirname, `seed-json-batch-${i}.json`), 'utf8');
  console.log('---BATCH', i, '---');
  console.log(JSON.stringify({ query: SQL, params: [json] }));
}
