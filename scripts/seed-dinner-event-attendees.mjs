/**
 * Seed bni_event_attendees from src/data/changhuiDinner.js
 * Matches DB members by normalized name + claim-branch alias.
 *
 * $env:BNI_API_KEY="ik_..."; node scripts/seed-dinner-event-attendees.mjs
 */
import { rawSql } from './insforge-admin-api.mjs';
import {
  CHANGHUI_DINNER_EVENT,
  CHANGHUI_DINNER_MEMBERS,
  CHANGHUI_DINNER_GUESTS,
} from '../src/data/changhuiDinner.js';

const EVENT_ID = CHANGHUI_DINNER_EVENT.id;

function coreName(n) {
  return String(n || '')
    .replace(/\s+/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[A-Za-z].*$/, '')
    .trim();
}

function displayName(n) {
  return String(n || '').replace(/\s+/g, ' ').trim();
}

const roster = [
  ...CHANGHUI_DINNER_MEMBERS.map(p => ({ ...p, role: 'member' })),
  ...CHANGHUI_DINNER_GUESTS.map(p => ({ ...p, role: 'guest' })),
];

const { rows: dbMembers } = await rawSql(`
  SELECT id, name, branch, active
  FROM bni_members
  WHERE active = true
`);

const { rows: branchNorm } = await rawSql(`
  SELECT id, bni_normalize_claim_branch(branch) AS nb,
         regexp_replace(regexp_replace(name, '\\s+', '', 'g'), '[A-Za-z].*$', '') AS nn
  FROM bni_members
  WHERE active = true
`);

const byKey = new Map();
for (const r of branchNorm || []) {
  const key = `${r.nn}||${r.nb}`;
  if (!byKey.has(key)) byKey.set(key, r.id);
  // also key without branch for rare fallback later
}

async function ensureMember(person) {
  const name = displayName(person.name);
  const core = coreName(name);
  const { rows: nbRows } = await rawSql(
    `SELECT bni_normalize_claim_branch($1) AS nb`,
    [person.branch || ''],
  );
  const nb = nbRows?.[0]?.nb || person.branch;
  const key = `${core}||${nb}`;
  let id = byKey.get(key);

  if (!id) {
    // fuzzy: same core name under any 長輝* / guest / A Team
    const hit = (branchNorm || []).find(r =>
      r.nn === core && (
        r.nb === nb
        || r.nb === '長輝分會'
        || (person.type === 'guest' && r.nb.includes('來賓'))
        || r.nb === 'A Team分會'
      ),
    );
    id = hit?.id;
  }

  if (id) return id;

  // insert missing roster row
  const rosterId = person.id || `dinner-${core}`;
  const { rows: inserted } = await rawSql(
    `INSERT INTO bni_members (
       roster_id, name, branch, region, profession, have, want_meet, bio,
       line_link, tags, industries, status, active
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::text[], 'roster', true
     )
     ON CONFLICT (roster_id) DO UPDATE
       SET name = EXCLUDED.name,
           branch = EXCLUDED.branch,
           profession = COALESCE(NULLIF(EXCLUDED.profession, ''), bni_members.profession),
           updated_at = now()
     RETURNING id`,
    [
      rosterId,
      name,
      person.branch || (person.type === 'guest' ? '長輝晚會來賓' : '長輝分會'),
      person.region || (person.type === 'guest' ? 'guest' : 'zhongshan'),
      person.profession || '',
      person.have || '',
      person.wantMeet || '',
      person.bio || '',
      person.lineLink || '',
      JSON.stringify(person.tags || []),
      person.profession ? [person.profession] : [],
    ],
  );
  id = inserted?.[0]?.id;
  if (id) {
    byKey.set(key, id);
    branchNorm.push({ id, nn: core, nb });
  }
  return id;
}

await rawSql(`DELETE FROM bni_event_attendees WHERE event_id = $1`, [EVENT_ID]);

let ok = 0;
const missing = [];
for (const p of roster) {
  const memberId = await ensureMember(p);
  if (!memberId) {
    missing.push(p.name);
    continue;
  }
  await rawSql(
    `INSERT INTO bni_event_attendees (event_id, member_id, role)
     VALUES ($1, $2::uuid, $3)
     ON CONFLICT (event_id, member_id) DO UPDATE SET role = EXCLUDED.role`,
    [EVENT_ID, memberId, p.role === 'guest' ? 'guest' : 'member'],
  );
  ok++;
}

const { rows: check } = await rawSql(
  `SELECT count(*)::int AS n,
          count(*) FILTER (WHERE role = 'member')::int AS members,
          count(*) FILTER (WHERE role = 'guest')::int AS guests
   FROM bni_event_attendees WHERE event_id = $1`,
  [EVENT_ID],
);
const { rows: pub } = await rawSql(
  `SELECT jsonb_array_length(bni_get_event_public_members($1)) AS n`,
  [EVENT_ID],
);

console.log(JSON.stringify({
  eventId: EVENT_ID,
  seeded: ok,
  missing,
  attendees: check?.[0],
  publicMembers: pub?.[0]?.n,
  yearEndPublicUntouched: true,
}, null, 2));
