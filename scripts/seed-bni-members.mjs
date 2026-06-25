/**
 * Seed bni_members from src/data/members.js via Insforge REST API.
 * Run: node scripts/seed-bni-members.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://6cepnfaz.us-east.insforge.app';
const ANON_KEY = 'anon_36c5274b824b5947fb8912981876481272383d2ed1e67fb44a7c3a02469d9b90';

const membersJs = readFileSync(join(__dirname, '../src/data/members.js'), 'utf8');
const sandbox = { window: {} };
const fn = new Function('window', membersJs + '\nreturn window.BNI_MEMBERS;');
const members = fn(sandbox.window);
if (!Array.isArray(members)) throw new Error('Could not parse members.js');

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const existing = await api('/api/database/records/bni_members?select=roster_id&limit=1');
  if (existing?.length > 0) {
    console.log('bni_members already seeded, skipping.');
    return;
  }

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

  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await api('/api/database/records/bni_members', {
      method: 'POST',
      body: JSON.stringify(batch),
      headers: { Prefer: 'return=minimal' },
    });
    console.log(`Inserted ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }
  console.log('Seed complete:', rows.length, 'members');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
