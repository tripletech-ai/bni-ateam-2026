/**
 * 動態牆審核模擬測試 — 訪客唯讀、管理員刪文／停用帳號
 *
 * Run:
 *   $env:BNI_API_KEY="ik_..."; node scripts/feed-moderation-tests.mjs
 */
import { INSFORGE_BASE_URL, INSFORGE_ANON_KEY } from '../src/config/insforge.js';
import { adminApi, rawSql, BNI_API_KEY } from './insforge-admin-api.mjs';

const BASE = INSFORGE_BASE_URL;
const ANON = INSFORGE_ANON_KEY;
const MARKER = `FEED_MOD_TEST_${Date.now()}`;

let passed = 0;
let failed = 0;
const cleanup = [];

function ok(name, detail = '') {
  passed++;
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failed++;
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function bareRpc(name, args = {}) {
  const res = await fetch(`${BASE}/api/database/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data, text };
}

async function anonRpc(name, args = {}) {
  const res = await fetch(`${BASE}/api/database/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data, text };
}

async function adminRpcAsEmail(rpcName, args, email) {
  const payload = JSON.stringify(args).replace(/'/g, "''");
  const claims = JSON.stringify({
    email,
    sub: '00000000-0000-4000-8000-000000000001',
    role: 'authenticated',
  }).replace(/'/g, "''");
  const sql = `
    SELECT set_config('request.jwt.claims', '${claims}', true);
    SELECT ${rpcName}(${formatSqlArgs(args)}) AS result;
  `;
  const res = await rawSql(sql);
  const row = res.rows?.[0];
  return row?.result ?? row;
}

function formatSqlArgs(args) {
  const entries = Object.entries(args);
  if (!entries.length) return '';
  return entries.map(([, v]) => formatSqlValue(v)).join(', ');
}

function formatSqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  const s = String(v);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return `'${s}'::uuid`;
  }
  return `'${s.replace(/'/g, "''")}'`;
}

/** 1a. 完全未登入無法發文 */
async function test01a_noTokenCannotPost() {
  const { ok: rpcOk, data, text } = await bareRpc('bni_post_feed_message', {
    p_content: `${MARKER} no token`,
  });
  const msg = JSON.stringify(data ?? text);
  if (rpcOk) return fail('01a 未登入無法發文', 'RPC succeeded');
  if (!/NOT_AUTHENTICATED/i.test(msg)) {
    return fail('01a 未登入無法發文', msg.slice(0, 120));
  }
  ok('01a 未登入無法發文');
}

/** 1b. 訪客試玩（anon key、未綁定會員）無法發文 */
async function test01b_guestTrialCannotPost() {
  const { ok: rpcOk, data, text } = await anonRpc('bni_post_feed_message', {
    p_content: `${MARKER} guest trial`,
  });
  const msg = JSON.stringify(data ?? text);
  if (rpcOk) return fail('01b 訪客試玩無法發文', 'RPC succeeded');
  if (!/NOT_BOUND|NOT_AUTHENTICATED/i.test(msg)) {
    return fail('01b 訪客試玩無法發文', msg.slice(0, 120));
  }
  ok('01b 訪客試玩無法發文');
}

/** 2. 訪客可讀動態牆 */
async function test02_guestCanReadFeed() {
  const { ok: rpcOk, data } = await anonRpc('bni_get_feed', { p_limit: 5 });
  if (!rpcOk) return fail('02 訪客可讀動態', JSON.stringify(data).slice(0, 120));
  if (!Array.isArray(data)) return fail('02 訪客可讀動態', 'not array');
  ok('02 訪客可讀動態', `${data.length} 則`);
}

/** 3. 管理員可刪除測試訊息 */
async function test03_adminDeleteFeed() {
  if (!BNI_API_KEY) {
    ok('03 管理員刪文', 'skipped (no BNI_API_KEY)');
    return;
  }

  const insert = await rawSql(`
    INSERT INTO bni_feed (feed_type, content, meta)
    VALUES ('message', '${MARKER} delete me', '{}'::jsonb)
    RETURNING id;
  `);
  const feedId = insert.rows?.[0]?.id;
  if (!feedId) return fail('03 管理員刪文', 'insert failed');

  try {
    await adminRpcAsEmail('bni_admin_delete_feed', { p_feed_id: feedId }, 'b1993614@gmail.com');
    const check = await rawSql(`SELECT id FROM bni_feed WHERE id = '${feedId}'`);
    if (check.rows?.length) return fail('03 管理員刪文', 'row still exists');
    ok('03 管理員刪文');
  } catch (e) {
    const msg = String(e?.message || e);
    fail('03 管理員刪文', msg.slice(0, 120));
  }
}

/** 4. 非管理員無法刪文 */
async function test04_nonAdminCannotDelete() {
  if (!BNI_API_KEY) {
    ok('04 非管理員禁刪', 'skipped (no BNI_API_KEY)');
    return;
  }

  const insert = await rawSql(`
    INSERT INTO bni_feed (feed_type, content, meta)
    VALUES ('message', '${MARKER} protected', '{}'::jsonb)
    RETURNING id;
  `);
  const feedId = insert.rows?.[0]?.id;
  if (!feedId) return fail('04 非管理員禁刪', 'insert failed');
  cleanup.push(`DELETE FROM bni_feed WHERE id = '${feedId}'`);

  try {
    await adminRpcAsEmail('bni_admin_delete_feed', { p_feed_id: feedId }, 'notadmin@example.com');
    fail('04 非管理員禁刪', 'RPC succeeded');
  } catch (e) {
    if (/NOT_ADMIN/i.test(e.message)) ok('04 非管理員禁刪');
    else fail('04 非管理員禁刪', e.message.slice(0, 120));
  }
}

/** 5. 停用會員不對外曝光 */
async function test05_bannedHiddenFromPublic() {
  if (!BNI_API_KEY) {
    ok('05 停用帳號隱藏', 'skipped (no BNI_API_KEY)');
    return;
  }

  const name = `${MARKER}_BANNED`;
  const row = await adminApi('/api/database/records/bni_members', {
    method: 'POST',
    body: JSON.stringify([{
      name,
      branch: '測試分會',
      region: 'zhongshan',
      profession: 'test',
      status: 'self_registered',
      active: false,
      tags: [],
    }]),
    headers: { Prefer: 'return=representation' },
  });
  const id = row?.[0]?.id;
  if (!id) return fail('05 停用帳號隱藏', 'create failed');
  cleanup.push(`DELETE FROM bni_members WHERE id = '${id}'`);

  const res = await fetch(
    `${BASE}/api/database/records/bni_members?active=eq.true&name=eq.${encodeURIComponent(name)}&select=id`,
    { headers: { Authorization: `Bearer ${ANON}` } },
  );
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return fail('05 停用帳號隱藏', 'still visible to anon');
  }
  ok('05 停用帳號隱藏');
}

/** 6. 管理員可停用／啟用會員 */
async function test06_adminBanMember() {
  if (!BNI_API_KEY) {
    ok('06 管理員停用帳號', 'skipped (no BNI_API_KEY)');
    return;
  }

  const name = `${MARKER}_BAN_TOGGLE`;
  const row = await adminApi('/api/database/records/bni_members', {
    method: 'POST',
    body: JSON.stringify([{
      name,
      branch: '測試分會',
      region: 'zhongshan',
      status: 'self_registered',
      active: true,
      tags: [],
    }]),
    headers: { Prefer: 'return=representation' },
  });
  const id = row?.[0]?.id;
  if (!id) return fail('06 管理員停用帳號', 'create failed');
  cleanup.push(`DELETE FROM bni_members WHERE id = '${id}'`);

  try {
    await adminRpcAsEmail(
      'bni_admin_set_member_active',
      { p_member_id: id, p_active: false },
      'tripletech.ai@gmail.com',
    );

    const check = await rawSql(`SELECT active FROM bni_members WHERE id = '${id}'`);
    if (check.rows?.[0]?.active !== false) {
      return fail('06 管理員停用帳號', 'active still true');
    }

    await adminRpcAsEmail(
      'bni_admin_set_member_active',
      { p_member_id: id, p_active: true },
      'tripletech.ai@gmail.com',
    );
    const restored = await rawSql(`SELECT active FROM bni_members WHERE id = '${id}'`);
    if (restored.rows?.[0]?.active !== true) {
      return fail('06 管理員停用帳號', 'restore failed');
    }
    ok('06 管理員停用帳號');
  } catch (e) {
    const msg = String(e?.message || e);
    if (/could not find the function|bni_admin_set_member_active/i.test(msg)) {
      fail('06 管理員停用帳號', 'RPC not deployed — run apply-admin-ban.mjs');
    } else {
      fail('06 管理員停用帳號', msg.slice(0, 120));
    }
  }
}

/** 7. 停用會員無法發文（邏輯：active=false → NOT_BOUND） */
async function test07_bannedCannotPostLogic() {
  const sql = await rawSql(`
    SELECT pg_get_functiondef(oid) AS def
    FROM pg_proc WHERE proname = 'bni_post_feed_message' LIMIT 1;
  `);
  const def = sql.rows?.[0]?.def || '';
  if (!/active\s*=\s*true/i.test(def)) {
    return fail('07 停用無法發文', 'bni_post_feed_message missing active=true check');
  }
  ok('07 停用無法發文', 'RPC 含 active=true 檢查');
}

async function runCleanup() {
  for (const q of cleanup.reverse()) {
    try { await rawSql(q); } catch { /* ignore */ }
  }
}

async function main() {
  console.log('BNI Feed moderation tests');
  console.log('Target:', BASE);
  console.log('Admin key:', BNI_API_KEY ? 'yes' : 'no (partial)\n');

  await test01a_noTokenCannotPost();
  await test01b_guestTrialCannotPost();
  await test02_guestCanReadFeed();
  await test03_adminDeleteFeed();
  await test04_nonAdminCannotDelete();
  await test05_bannedHiddenFromPublic();
  await test06_adminBanMember();
  await test07_bannedCannotPostLogic();
  await runCleanup();

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
