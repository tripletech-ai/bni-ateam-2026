/**
 * 依 profession / have 推斷大產業並寫入 bni_members.industries
 *
 *   node scripts/seed-member-industries.mjs
 *   node scripts/seed-member-industries.mjs --dry-run
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rawSql } from './insforge-admin-api.mjs';
import { inferIndustriesFromText } from '../src/data/industries.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');

async function loadSeedMembers() {
  const js = readFileSync(join(__dirname, '../src/data/members.js'), 'utf8');
  const sandbox = { window: {} };
  new Function('window', js + '\nreturn window.BNI_MEMBERS;')(sandbox.window);
  return sandbox.window.BNI_MEMBERS || [];
}

function pgTextArray(arr) {
  if (!arr?.length) return "'{}'";
  const esc = arr.map(s => `'${String(s).replace(/'/g, "''")}'`).join(',');
  return `ARRAY[${esc}]::text[]`;
}

async function main() {
  if (!process.env.BNI_API_KEY && !dryRun) {
    console.error('Set BNI_API_KEY (or use --dry-run)');
    process.exit(1);
  }

  const infer = inferIndustriesFromText;
  const seed = await loadSeedMembers();
  const byRoster = new Map(seed.map(m => [String(m.id), m]));

  let rows = [];
  if (process.env.BNI_API_KEY) {
    const res = await rawSql(
      'SELECT id, roster_id, name, profession, have, industries FROM bni_members WHERE active = true ORDER BY roster_id NULLS LAST'
    );
    rows = res.rows || [];
  } else {
    rows = seed.map(m => ({
      id: null,
      roster_id: m.id,
      name: m.name,
      profession: m.profession,
      have: m.have,
      industries: [],
    }));
  }

  let ok = 0;
  let skip = 0;
  for (const row of rows) {
    const seedRow = byRoster.get(String(row.roster_id || ''));
    const profession = row.profession || seedRow?.profession || '';
    const have = row.have || seedRow?.have || '';
    const inferred = infer(profession, have);
    const current = Array.isArray(row.industries) ? row.industries : [];
    if (current.length && JSON.stringify(current) === JSON.stringify(inferred)) {
      skip++;
      continue;
    }
    if (!inferred.length) {
      console.log(`  - ${row.name}: 無法推斷`);
      continue;
    }
    if (dryRun || !row.id) {
      console.log(`  ✓ ${row.name}: ${inferred.join(', ')}`);
      ok++;
      continue;
    }
    await rawSql(
      `UPDATE bni_members SET industries = ${pgTextArray(inferred)}, updated_at = now() WHERE id = '${row.id}'`
    );
    console.log(`  ✓ ${row.name}: ${inferred.join(', ')}`);
    ok++;
  }
  console.log(`\nDone: ${ok} updated, ${skip} unchanged${dryRun ? ' (dry-run)' : ''}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
