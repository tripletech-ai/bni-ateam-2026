/**
 * Remove ALL BNI / a-team artifacts from the LEGACY InsForge (UIC project).
 * Does NOT touch a-team9204.zeabur.app.
 *
 * Usage:
 *   $env:LEGACY_INSFORGE_URL="https://6cepnfaz.us-east.insforge.app"
 *   $env:LEGACY_INSFORGE_API_KEY="ik_... (UIC project admin key)"
 *   node scripts/cleanup-legacy-insforge.mjs
 */
const BASE = process.env.LEGACY_INSFORGE_URL || 'https://6cepnfaz.us-east.insforge.app';
const KEY = process.env.LEGACY_INSFORGE_API_KEY || '';

async function rawSql(query) {
  const res = await fetch(`${BASE}/api/database/advance/rawsql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const CLEANUP_SQL = `
-- BNI tables (CASCADE drops dependent policies)
DROP TABLE IF EXISTS bni_tutorial_steps CASCADE;
DROP TABLE IF EXISTS bni_onboarding CASCADE;
DROP TABLE IF EXISTS bni_members CASCADE;

-- BNI functions
DROP FUNCTION IF EXISTS bni_admin_unbind_member(uuid);
DROP FUNCTION IF EXISTS bni_admin_dashboard();
DROP FUNCTION IF EXISTS bni_bind_existing_member(uuid);
DROP FUNCTION IF EXISTS bni_register_new_member(text,text,text,text,text,text,text,text,text,jsonb);
DROP FUNCTION IF EXISTS bni_complete_tutorial();
DROP FUNCTION IF EXISTS bni_get_my_status();
DROP FUNCTION IF EXISTS bni_is_admin();
DROP FUNCTION IF EXISTS bni_current_jwt_email();

-- BNI admin roles on legacy multi-tenant site (if present)
DELETE FROM user_roles WHERE site_id = 'bni-ateam-2026';
`;

async function main() {
  if (!KEY) {
    console.error('Set LEGACY_INSFORGE_API_KEY (admin ik_ for the OLD InsForge project).');
    process.exit(1);
  }
  console.log('Cleaning legacy InsForge:', BASE);

  const before = await rawSql(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'bni_%'
  `);
  console.log('BNI tables before:', before.rows?.map(r => r.table_name).join(', ') || 'none');

  await rawSql(CLEANUP_SQL);

  const after = await rawSql(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'bni_%'
  `);
  const roles = await rawSql(`
    SELECT count(*)::int as c FROM user_roles WHERE site_id = 'bni-ateam-2026'
  `);

  console.log('BNI tables after:', after.rows?.length ? after.rows : 'none');
  console.log('bni-ateam-2026 user_roles remaining:', roles.rows?.[0]?.c ?? '?');
  console.log('Legacy cleanup complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
