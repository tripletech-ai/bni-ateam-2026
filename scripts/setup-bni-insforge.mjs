/**
 * Standalone BNI InsForge setup — a-team9204.zeabur.app only (not UIC project).
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { adminApi, rawSql, BNI_API_BASE } from './insforge-admin-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run(label, query) {
  console.log(label);
  await rawSql(query);
}

async function getAnonToken() {
  const res = await adminApi('/api/auth/tokens/anon', { method: 'POST', body: '{}' });
  return res.accessToken;
}

async function seedMembers() {
  const membersJs = readFileSync(join(__dirname, '../src/data/members.js'), 'utf8');
  const sandbox = { window: {} };
  const fn = new Function('window', membersJs + '\nreturn window.BNI_MEMBERS;');
  const members = fn(sandbox.window);
  const rows = members.map(m => ({
    roster_id: String(m.id ?? ''),
    name: String(m.name ?? ''),
    branch: String(m.branch ?? ''),
    region: String(m.region || 'zhongshan'),
    profession: String(m.profession || ''),
    have: String(m.have || ''),
    want_meet: String(m.wantMeet || ''),
    want_referral: String(m.wantReferral || ''),
    line_id: String(m.lineId || ''),
    line_link: String(m.lineLink || ''),
    tags: Array.isArray(m.tags) ? m.tags : [],
    status: 'roster',
    active: true,
  }));

  const existing = await rawSql('SELECT roster_id FROM bni_members');
  const have = new Set((existing.rows || []).map(r => r.roster_id));
  const todo = rows.filter(r => !have.has(r.roster_id));
  if (!todo.length) {
    console.log('All members already seeded:', have.size);
    return;
  }
  console.log('Seeding', todo.length, 'remaining members...');
  const BATCH = 30;
  for (let i = 0; i < todo.length; i += BATCH) {
    await adminApi('/api/database/records/bni_members', {
      method: 'POST',
      body: JSON.stringify(todo.slice(i, i + BATCH)),
      headers: { Prefer: 'return=minimal' },
    });
    console.log(`Seeded ${Math.min(i + BATCH, todo.length)} / ${todo.length}`);
  }
}

async function main() {
  if (!process.env.BNI_API_KEY) {
    console.error('Set BNI_API_KEY');
    process.exit(1);
  }
  console.log('Target:', BNI_API_BASE);

  await run('tables', `
CREATE TABLE IF NOT EXISTS bni_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id text, name varchar(80) NOT NULL, branch varchar(80) NOT NULL,
  region varchar(30), profession text, have text, want_meet text, want_referral text,
  line_id varchar(100), line_link text, tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  auth_user_id uuid UNIQUE, google_email text,
  status text NOT NULL DEFAULT 'roster' CHECK (status IN ('roster','claimed','self_registered')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bni_members_roster_id_key ON bni_members(roster_id);
CREATE TABLE IF NOT EXISTS bni_onboarding (
  auth_user_id uuid PRIMARY KEY, tutorial_done boolean NOT NULL DEFAULT false,
  bound_member_id uuid REFERENCES bni_members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bni_tutorial_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_order int NOT NULL,
  step_key varchar(40) NOT NULL UNIQUE,
  title_zh varchar(120) NOT NULL,
  title_en varchar(120) NOT NULL,
  body_zh text NOT NULL,
  body_en text NOT NULL,
  tip_zh text,
  tip_en text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bni_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bni_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE bni_tutorial_steps ENABLE ROW LEVEL SECURITY;
  `);

  await run('admin helpers', `
CREATE OR REPLACE FUNCTION bni_current_jwt_email() RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT lower(COALESCE((NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'),
    NULLIF(current_setting('request.jwt.claim.email', true), ''), ''));
$$;
CREATE OR REPLACE FUNCTION bni_is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT bni_current_jwt_email() IN ('b1993614@gmail.com', 'tripletech.ai@gmail.com');
$$;
  `);

  await run('policies', `
DROP POLICY IF EXISTS bni_members_public_read ON bni_members;
CREATE POLICY bni_members_public_read ON bni_members FOR SELECT TO anon, authenticated USING (active = true);
DROP POLICY IF EXISTS bni_members_admin_all ON bni_members;
CREATE POLICY bni_members_admin_all ON bni_members FOR ALL TO authenticated USING (bni_is_admin()) WITH CHECK (bni_is_admin());
DROP POLICY IF EXISTS bni_onboarding_own ON bni_onboarding;
CREATE POLICY bni_onboarding_own ON bni_onboarding FOR ALL TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
DROP POLICY IF EXISTS bni_onboarding_admin_read ON bni_onboarding;
CREATE POLICY bni_onboarding_admin_read ON bni_onboarding FOR SELECT TO authenticated USING (bni_is_admin());
DROP POLICY IF EXISTS bni_onboarding_admin_write ON bni_onboarding;
CREATE POLICY bni_onboarding_admin_write ON bni_onboarding FOR ALL TO authenticated USING (bni_is_admin()) WITH CHECK (bni_is_admin());
DROP POLICY IF EXISTS bni_tutorial_public_read ON bni_tutorial_steps;
CREATE POLICY bni_tutorial_public_read ON bni_tutorial_steps FOR SELECT TO anon, authenticated USING (active = true);
DROP POLICY IF EXISTS bni_tutorial_admin_all ON bni_tutorial_steps;
CREATE POLICY bni_tutorial_admin_all ON bni_tutorial_steps FOR ALL TO authenticated USING (bni_is_admin()) WITH CHECK (bni_is_admin());
  `);

  const rpcSql = readFileSync(join(__dirname, 'bni-rpc-functions.sql'), 'utf8');
  await run('rpc functions', rpcSql);

  const tutorialSeed = readFileSync(join(__dirname, 'tutorial-steps-seed.sql'), 'utf8');
  await run('tutorial steps seed', tutorialSeed);

  await seedMembers();

  const anon = await getAnonToken();
  const verify = await rawSql('SELECT count(*)::int as c FROM bni_members');
  console.log('\n=== Done ===');
  console.log('URL:', BNI_API_BASE);
  console.log('ANON:', anon);
  console.log('Members:', verify.rows?.[0]?.c);
}

main().catch(e => { console.error(e); process.exit(1); });
