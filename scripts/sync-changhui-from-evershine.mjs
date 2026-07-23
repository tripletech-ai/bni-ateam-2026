/**
 * Sync Changhui chapter members from evershine.tw → InsForge bni_members.
 *
 * - Prefer enriching existing 長輝分會 / 長輝白金分會 rows (never wipe auth bindings)
 * - Insert missing evershine members as roster under 長輝分會
 * - Optionally upsert tonight's dinner guests as 長輝晚會來賓
 *
 * Prereq: node scripts/fetch-evershine-members.mjs
 * Run:   $env:BNI_API_KEY="ik_..."; node scripts/sync-changhui-from-evershine.mjs
 * Dry:   ... --dry-run
 */
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { BNI_API_BASE, BNI_API_KEY, rawSql, adminApi } from './insforge-admin-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry-run');
const WITH_GUESTS = process.argv.includes('--with-guests');
const CANON_BRANCH = '長輝分會';
const ALIAS_BRANCHES = ['長輝分會', '長輝白金分會'];
const GUEST_BRANCH = '長輝晚會來賓';
const REGION = 'zhongshan';

if (!BNI_API_KEY) {
  console.error('Missing BNI_API_KEY');
  process.exit(1);
}

function normName(n) {
  return String(n || '')
    .replace(/\s+/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/\s*[A-Za-z].*$/, '')
    .trim();
}

function extractWantMeet(fullIntro = '') {
  const m = String(fullIntro).match(/【理想引薦對象】\s*([\s\S]*?)(?:【|$)/);
  if (!m) return '';
  return m[1].replace(/\n+/g, '、').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function extractLine(links) {
  if (!links) return '';
  if (Array.isArray(links)) {
    const hit = links.find(l => /line/i.test(l?.type || l?.icon || '') && l.url && l.url !== '#');
    return hit?.url || '';
  }
  if (typeof links === 'object' && links.line && links.line !== '#') return links.line;
  return '';
}

function richer(next, prev) {
  const a = String(next || '').trim();
  const b = String(prev || '').trim();
  if (!a) return b;
  if (!b) return a;
  return a.length >= b.length ? a : b;
}

function mapEvershine(src) {
  const services = Array.isArray(src.services) ? src.services.filter(Boolean) : [];
  return {
    name: String(src.name || '').trim(),
    profession: src.industry || src.position || '',
    have: services.join('、') || src.shortIntro || '',
    want_meet: extractWantMeet(src.fullIntro) || '',
    bio: String(src.shortIntro || '').slice(0, 800),
    line_link: extractLine(src.links),
    tags: services.slice(0, 8),
    card_link: src.photo || '',
    industries: src.industry ? [src.industry] : [],
  };
}

const evershine = JSON.parse(
  fs.readFileSync(join(__dirname, '_evershine-clean.json'), 'utf8'),
);

const { rows: existing } = await rawSql(`
  SELECT id, name, branch, roster_id, profession, have, want_meet, bio, line_link, tags,
         card_link, industries, auth_user_id, status, active
  FROM bni_members
  WHERE active = true
    AND (
      branch IN ('長輝分會', '長輝白金分會', '長輝晚會來賓')
      OR branch ILIKE '長輝%'
    )
`);

const byName = new Map();
for (const row of existing || []) {
  const k = normName(row.name);
  if (!k) continue;
  const list = byName.get(k) || [];
  list.push(row);
  byName.set(k, list);
}

function pickCanonical(list) {
  return [...list].sort((a, b) => {
    const score = (r) =>
      (r.auth_user_id ? 8 : 0) +
      (r.branch === CANON_BRANCH ? 4 : 0) +
      (r.roster_id ? 2 : 0) +
      (String(r.bio || '').length > 20 ? 1 : 0);
    return score(b) - score(a);
  })[0];
}

let updated = 0;
let inserted = 0;
let skipped = 0;
const report = { updated: [], inserted: [], deactivatedDupes: [] };

for (const src of evershine) {
  const mapped = mapEvershine(src);
  const key = normName(mapped.name);
  if (!key || key.length < 2) { skipped++; continue; }

  const hits = (byName.get(key) || []).filter(r =>
    ALIAS_BRANCHES.includes(r.branch) || /^長輝/.test(r.branch),
  );
  const canon = hits.length ? pickCanonical(hits) : null;

  if (canon) {
    const next = {
      profession: richer(mapped.profession, canon.profession),
      have: richer(mapped.have, canon.have),
      want_meet: richer(mapped.want_meet, canon.want_meet),
      bio: richer(mapped.bio, canon.bio),
      line_link: richer(mapped.line_link, canon.line_link),
      card_link: richer(mapped.card_link, canon.card_link),
      tags: (mapped.tags?.length ? mapped.tags : (canon.tags || [])),
      industries: (mapped.industries?.length ? mapped.industries : (canon.industries || [])),
      branch: canon.branch === '長輝白金分會' ? CANON_BRANCH : canon.branch,
    };

    const changed =
      next.profession !== (canon.profession || '') ||
      next.have !== (canon.have || '') ||
      next.want_meet !== (canon.want_meet || '') ||
      next.bio !== (canon.bio || '') ||
      next.line_link !== (canon.line_link || '') ||
      next.card_link !== (canon.card_link || '') ||
      next.branch !== canon.branch;

    if (changed) {
      if (!DRY) {
        await rawSql(
          `UPDATE bni_members
           SET profession = $1,
               have = $2,
               want_meet = $3,
               bio = $4,
               line_link = $5,
               card_link = $6,
               tags = $7::jsonb,
               industries = $8::text[],
               branch = $9,
               region = COALESCE(NULLIF(region, ''), $10),
               updated_at = now()
           WHERE id = $11::uuid`,
          [
            next.profession,
            next.have,
            next.want_meet,
            next.bio,
            next.line_link,
            next.card_link,
            JSON.stringify(next.tags || []),
            next.industries || [],
            next.branch,
            REGION,
            canon.id,
          ],
        );
      }
      updated++;
      report.updated.push(mapped.name);
    } else {
      skipped++;
    }

    // deactivate sparse duplicates under alias branches
    for (const dup of hits) {
      if (dup.id === canon.id) continue;
      if (dup.auth_user_id && canon.auth_user_id && dup.auth_user_id !== canon.auth_user_id) continue;
      if (!DRY) {
        await rawSql(
          `UPDATE bni_members
           SET active = false, updated_at = now()
           WHERE id = $1::uuid AND active = true`,
          [dup.id],
        );
      }
      report.deactivatedDupes.push(`${dup.name}/${dup.branch}`);
    }
    continue;
  }

  // insert new roster row
  if (!DRY) {
    await rawSql(
      `INSERT INTO bni_members (
         roster_id, name, branch, region, profession, have, want_meet, bio,
         line_link, card_link, tags, industries, status, active
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::text[], 'roster', true
       )`,
      [
        `evershine-${src.id || key}`,
        mapped.name,
        CANON_BRANCH,
        REGION,
        mapped.profession,
        mapped.have,
        mapped.want_meet,
        mapped.bio,
        mapped.line_link,
        mapped.card_link,
        JSON.stringify(mapped.tags || []),
        mapped.industries || [],
      ],
    );
  }
  inserted++;
  report.inserted.push(mapped.name);
  byName.set(key, [{ name: mapped.name, branch: CANON_BRANCH, auth_user_id: null }]);
}

if (WITH_GUESTS) {
  const { CHANGHUI_DINNER_GUESTS } = await import('../src/data/changhuiDinner.js');
  for (const g of CHANGHUI_DINNER_GUESTS) {
    const key = normName(g.name);
    const hits = byName.get(key) || [];
    if (hits.some(h => h.branch === GUEST_BRANCH || ALIAS_BRANCHES.includes(h.branch))) {
      skipped++;
      continue;
    }
    if (!DRY) {
      await rawSql(
        `INSERT INTO bni_members (
           roster_id, name, branch, region, profession, have, want_meet, bio,
           tags, industries, status, active
         ) VALUES (
           $1, $2, $3, 'guest', $4, $5, $6, $7, $8::jsonb, $9::text[], 'roster', true
         )`,
        [
          g.id || `dinner-guest-${key}`,
          g.name,
          GUEST_BRANCH,
          g.profession || '',
          g.have || '',
          g.wantMeet || '',
          g.bio || '',
          JSON.stringify(g.tags || []),
          g.profession ? [g.profession] : [],
        ],
      );
    }
    inserted++;
    report.inserted.push(`來賓:${g.name}`);
  }
}

console.log(JSON.stringify({
  base: BNI_API_BASE,
  dryRun: DRY,
  evershine: evershine.length,
  updated,
  inserted,
  skipped,
  deactivatedDupes: report.deactivatedDupes.length,
  sampleUpdated: report.updated.slice(0, 10),
  sampleInserted: report.inserted.slice(0, 15),
}, null, 2));

// sanity
const { rows: after } = await rawSql(`
  SELECT branch, count(*)::int AS n,
         count(*) FILTER (WHERE coalesce(profession,'') <> '')::int AS has_prof,
         count(*) FILTER (WHERE coalesce(bio,'') <> '')::int AS has_bio
  FROM bni_members
  WHERE active AND (branch ILIKE '長輝%' OR branch = '長輝晚會來賓')
  GROUP BY branch
  ORDER BY n DESC
`);
console.log('after:', after);
