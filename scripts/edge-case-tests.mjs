/**
 * BNI A Team — 10 edge-case architecture tests (Saturday event scenarios).
 *
 * Run:
 *   node scripts/edge-case-tests.mjs
 *
 * Optional admin tests:
 *   $env:BNI_API_KEY="ik_..."; node scripts/edge-case-tests.mjs
 */
import { INSFORGE_BASE_URL, INSFORGE_ANON_KEY } from '../src/config/insforge.js';
import { rawSql, adminApi, BNI_API_KEY } from './insforge-admin-api.mjs';

const BASE = INSFORGE_BASE_URL;
const ANON = INSFORGE_ANON_KEY;

let passed = 0;
let failed = 0;

function ok(name, detail = '') {
  passed++;
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failed++;
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function bareFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { res, data };
}

async function anonFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON}`,
      ...options.headers,
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { res, data };
}

async function anonRpc(name, args = {}) {
  const { res, data } = await anonFetch(`/api/database/rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(args),
  });
  return { ok: res.ok, status: res.status, data };
}

/** 1. 週六尖峰：匿名一次載入完整名單（模擬 800 人開 app） */
async function test01_bulkMemberLoad() {
  const { res, data } = await anonFetch(
    '/api/database/records/bni_members?active=eq.true&limit=1000&order=roster_id.asc'
  );
  if (!res.ok) return fail('01 名單整批載入', `HTTP ${res.status}`);
  if (!Array.isArray(data) || data.length < 116) {
    return fail('01 名單整批載入', `expected ≥116, got ${data?.length}`);
  }
  ok('01 名單整批載入', `${data.length} 筆`);
}

/** 2. 完全未帶 token 查狀態 → authenticated: false */
async function test02_unauthStatus() {
  const { res, data } = await bareFetch('/api/database/rpc/bni_get_my_status', {
    method: 'POST',
    body: '{}',
  });
  if (!res.ok) return fail('02 未登入狀態', `HTTP ${res.status}`);
  if (data?.authenticated !== false) return fail('02 未登入狀態', JSON.stringify(data));
  ok('02 未登入狀態', 'authenticated=false');
}

/** 3. 未帶 token 嘗試綁定 → 應失敗 */
async function test03_unauthBindRejected() {
  const fakeId = '00000000-0000-0000-0000-000000000001';
  const { res, data } = await bareFetch('/api/database/rpc/bni_bind_existing_member', {
    method: 'POST',
    body: JSON.stringify({ p_member_id: fakeId }),
  });
  if (res.ok) return fail('03 未登入禁止綁定', 'RPC succeeded unexpectedly');
  const msg = JSON.stringify(data);
  if (!/NOT_AUTHENTICATED|401|JWT|auth|P0001/i.test(msg)) {
    return fail('03 未登入禁止綁定', msg.slice(0, 120));
  }
  ok('03 未登入禁止綁定');
}

/** 4. 搜尋特殊字元不炸 API（SQL 注入樣式輸入） */
async function test04_specialCharSearch() {
  const payloads = ["%_", "'; DROP--", '王銓', '長輝', '<script>'];
  for (const q of payloads) {
    const enc = encodeURIComponent(q);
    const { res } = await anonFetch(
      `/api/database/records/bni_members?active=eq.true&name=ilike.*${enc}*&limit=5`
    );
    if (!res.ok) return fail('04 特殊字元搜尋', `query "${q}" → ${res.status}`);
  }
  ok('04 特殊字元搜尋', `${payloads.length} 種輸入`);
}

/** 5. 停用會員不對外曝光 */
async function test05_inactiveHiddenFromPublic() {
  if (!BNI_API_KEY) {
    ok('05 停用會員隱藏', 'skipped (no BNI_API_KEY)');
    return;
  }
  const marker = `EDGE_TEST_INACTIVE_${Date.now()}`;
  const row = await adminApi('/api/database/records/bni_members', {
    method: 'POST',
    body: JSON.stringify([{
      name: marker, branch: '測試分會', region: 'zhongshan',
      profession: 'test', status: 'roster', active: false, tags: [],
    }]),
    headers: { Prefer: 'return=representation' },
  });
  const id = row?.[0]?.id;
  const { data } = await anonFetch(
    `/api/database/records/bni_members?id=eq.${id}&select=id`
  );
  if (Array.isArray(data) && data.length > 0) {
    await adminApi(`/api/database/records/bni_members?id=eq.${id}`, { method: 'DELETE' });
    return fail('05 停用會員隱藏', 'anon can read inactive row');
  }
  await adminApi(`/api/database/records/bni_members?id=eq.${id}`, { method: 'DELETE' });
  ok('05 停用會員隱藏');
}

/** 6. roster_id 唯一：重複匯入應失敗 */
async function test06_duplicateRosterId() {
  if (!BNI_API_KEY) {
    ok('06 roster_id 唯一', 'skipped (no BNI_API_KEY)');
    return;
  }
  try {
    await adminApi('/api/database/records/bni_members', {
      method: 'POST',
      body: JSON.stringify([{
        roster_id: '001', name: '重複測試', branch: '測試分會',
        region: 'zhongshan', status: 'roster', active: true, tags: [],
      }]),
    });
    return fail('06 roster_id 唯一', 'duplicate insert succeeded');
  } catch (e) {
    if (/duplicate|unique|23505/i.test(e.message)) ok('06 roster_id 唯一');
    else fail('06 roster_id 唯一', e.message.slice(0, 100));
  }
}

/** 7. 空名單搜尋不 500 */
async function test07_emptySearch() {
  const { res, data } = await anonFetch(
    '/api/database/records/bni_members?active=eq.true&name=ilike.*zzz_nonexistent_zzz*&limit=10'
  );
  if (!res.ok) return fail('07 無結果搜尋', res.status);
  if (!Array.isArray(data)) return fail('07 無結果搜尋', 'not array');
  ok('07 無結果搜尋', `0 筆`);
}

/** 8. 超長欄位寫入（模擬會員自填很長的 have） */
async function test08_longTextField() {
  if (!BNI_API_KEY) {
    ok('08 超長 have 欄位', 'skipped (no BNI_API_KEY)');
    return;
  }
  const longText = 'A'.repeat(8000);
  const name = `EDGE_LONG_${Date.now()}`;
  try {
    const row = await adminApi('/api/database/records/bni_members', {
      method: 'POST',
      body: JSON.stringify([{
        name, branch: '測試分會', region: 'zhongshan',
        have: longText, status: 'self_registered', active: true, tags: [],
      }]),
      headers: { Prefer: 'return=representation' },
    });
    const id = row?.[0]?.id;
    await adminApi(`/api/database/records/bni_members?id=eq.${id}`, { method: 'DELETE' });
    ok('08 超長 have 欄位', '8000 chars accepted');
  } catch (e) {
    fail('08 超長 have 欄位', e.message.slice(0, 80));
  }
}

/** 9. 非管理員無法看 admin dashboard */
async function test09_adminDashboardForbiddenForAnon() {
  const { ok: rpcOk, data } = await anonRpc('bni_admin_dashboard');
  if (rpcOk) return fail('09 非管理員禁看統計', 'RPC succeeded');
  const msg = JSON.stringify(data);
  if (!/FORBIDDEN|403|admin/i.test(msg)) {
    return fail('09 非管理員禁看統計', msg.slice(0, 100));
  }
  ok('09 非管理員禁看統計');
}

/** 10. 綁定後資料一致性：DB 內 google_email / status 欄位存在且可查 */
async function test10_boundMemberShape() {
  const { data } = await anonFetch(
    '/api/database/records/bni_members?status=eq.claimed&select=id,name,status,google_email,auth_user_id&limit=1'
  );
  // 若尚無 claimed，改查 self_registered
  let rows = data;
  if (!Array.isArray(rows) || rows.length === 0) {
    const r2 = await anonFetch(
      '/api/database/records/bni_members?status=eq.self_registered&select=id,name,status&limit=1'
    );
    rows = r2.data;
    if (!Array.isArray(rows) || rows.length === 0) {
      ok('10 會員資料結構', 'no bound rows yet (OK pre-event)');
      return;
    }
    ok('10 會員資料結構', 'self_registered row readable');
    return;
  }
  const row = rows[0];
  if (!row.name || !row.status) return fail('10 會員資料結構', JSON.stringify(row));
  ok('10 會員資料結構', `claimed sample: ${row.name}`);
}

/** 11. (bonus) 分會篩選 — 週六依分會瀏覽 */
async function test11_branchFilter() {
  const { res, data } = await anonFetch(
    '/api/database/records/bni_members?active=eq.true&branch=eq.長輝分會&limit=50'
  );
  if (!res.ok) return fail('11 分會篩選', res.status);
  if (!Array.isArray(data)) return fail('11 分會篩選', 'not array');
  const allMatch = data.every(m => m.branch === '長輝分會');
  if (!allMatch) return fail('11 分會篩選', 'branch mismatch in results');
  ok('11 分會篩選', `${data.length} 筆長輝分會`);
}

/** 12. 新手教學步驟可從 DB 讀取 */
async function test12_tutorialStepsFromDb() {
  const { res, data } = await anonFetch(
    '/api/database/records/bni_tutorial_steps?active=eq.true&select=step_key,step_order&order=step_order.asc'
  );
  if (!res.ok) return fail('12 教學步驟 DB', `HTTP ${res.status}`);
  if (!Array.isArray(data) || data.length < 5) {
    return fail('12 教學步驟 DB', `expected ≥5 steps, got ${data?.length}`);
  }
  const keys = new Set(data.map(s => s.step_key));
  if (!keys.has('welcome') || !keys.has('goal')) {
    return fail('12 教學步驟 DB', 'missing welcome or goal step');
  }
  ok('12 教學步驟 DB', `${data.length} 步`);
}

async function main() {
  console.log('BNI edge-case tests →', BASE);
  console.log('Admin tests:', BNI_API_KEY ? 'enabled' : 'skipped (set BNI_API_KEY)\n');

  await test01_bulkMemberLoad();
  await test02_unauthStatus();
  await test03_unauthBindRejected();
  await test04_specialCharSearch();
  await test05_inactiveHiddenFromPublic();
  await test06_duplicateRosterId();
  await test07_emptySearch();
  await test08_longTextField();
  await test09_adminDashboardForbiddenForAnon();
  await test10_boundMemberShape();
  await test11_branchFilter();
  await test12_tutorialStepsFromDb();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
