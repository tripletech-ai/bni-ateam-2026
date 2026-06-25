/**
 * Export members to JSON for bulk-upsert
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const membersJs = readFileSync(join(__dirname, '../src/data/members.js'), 'utf8');
const sandbox = { window: {} };
const fn = new Function('window', membersJs + '\nreturn window.BNI_MEMBERS;');
const members = fn(sandbox.window);

const rows = members.map(m => ({
  roster_id: m.id,
  name: m.name,
  branch: m.branch,
  region: m.region || 'zhongshan',
  profession: m.profession || '',
  have: m.have || '',
  want_meet: m.wantMeet || '',
  want_referral: m.wantReferral || '',
  line_id: m.lineId || '',
  line_link: m.lineLink || '',
  tags: m.tags || [],
  status: 'roster',
  active: true,
}));

writeFileSync(join(__dirname, 'bni-members-seed.json'), JSON.stringify(rows, null, 2));
console.log('Written', rows.length, 'rows');
