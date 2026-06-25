/**
 * Generate SQL seed file for bni_members (admin run-raw-sql).
 */
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

const values = members.map(m => `(
  '${esc(m.id)}', '${esc(m.name)}', '${esc(m.branch)}', '${esc(m.region || 'zhongshan')}',
  '${esc(m.profession || '')}', '${esc(m.have || '')}', '${esc(m.wantMeet || '')}', '${esc(m.wantReferral || '')}',
  '${esc(m.lineId || '')}', '${esc(m.lineLink || '')}', '${esc(JSON.stringify(m.tags || []))}'::jsonb,
  'roster', true
)`);

const sql = `INSERT INTO bni_members (
  roster_id, name, branch, region, profession, have, want_meet, want_referral,
  line_id, line_link, tags, status, active
) VALUES ${values.join(',')}
ON CONFLICT (roster_id) DO NOTHING;`;

writeFileSync(join(__dirname, 'seed-bni-members.sql'), sql);
console.log('SQL written,', members.length, 'rows');
