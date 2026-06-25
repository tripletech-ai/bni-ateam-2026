import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const membersJs = readFileSync(join(__dirname, '../src/data/members.js'), 'utf8');
const sandbox = { window: {} };
const fn = new Function('window', membersJs + '\nreturn window.BNI_MEMBERS;');
const members = fn(sandbox.window);

function esc(s) {
  return String(s ?? '').replace(/'/g, "''");
}

const header = `INSERT INTO bni_members (
  roster_id, name, branch, region, profession, have, want_meet, want_referral,
  line_id, line_link, tags, status, active
) VALUES `;

const BATCH = 30;
for (let i = 0; i < members.length; i += BATCH) {
  const batch = members.slice(i, i + BATCH);
  const values = batch.map(m => `(
  '${esc(m.id)}', '${esc(m.name)}', '${esc(m.branch)}', '${esc(m.region || 'zhongshan')}',
  '${esc(m.profession || '')}', '${esc(m.have || '')}', '${esc(m.wantMeet || '')}', '${esc(m.wantReferral || '')}',
  '${esc(m.lineId || '')}', '${esc(m.lineLink || '')}', '${esc(JSON.stringify(m.tags || []))}'::jsonb,
  'roster', true
)`).join(',');
  const sql = `${header}${values} ON CONFLICT (roster_id) DO NOTHING;`;
  writeFileSync(join(__dirname, `seed-batch-${i / BATCH + 1}.sql`), sql);
  console.log('batch', i / BATCH + 1, batch.length);
}
