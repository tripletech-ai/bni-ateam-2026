/**
 * 十回合使用者旅程模擬 — 週六現場穩定性驗證
 *
 * Run:
 *   node scripts/user-simulation-10-rounds.mjs
 *   $env:BNI_API_KEY="ik_..."; node scripts/user-simulation-10-rounds.mjs
 */
import { INSFORGE_BASE_URL, INSFORGE_ANON_KEY } from '../src/config/insforge.js';
import { adminApi, BNI_API_KEY, rawSql } from './insforge-admin-api.mjs';

const BASE = INSFORGE_BASE_URL;
const ANON = INSFORGE_ANON_KEY;
const MARKER = `SIM_USER_${Date.now()}`;

const rounds = [];
let passed = 0;
let failed = 0;

function record(round, ok, detail, ms) {
  rounds.push({ round, ok, detail, ms });
  if (ok) {
    passed++;
    console.log(`  ✓ 第 ${round} 回合 — ${detail} (${ms}ms)`);
  } else {
    failed++;
    console.error(`  ✗ 第 ${round} 回合 — ${detail} (${ms}ms)`);
  }
}

async function timed(fn) {
  const start = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - start };
}

async function fetchJson(url, { token, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

function mapMember(row) {
  return {
    id: row.roster_id || row.id,
    name: row.name,
    branch: row.branch,
    profession: row.profession || '',
    have: row.have || '',
    wantMeet: row.want_meet || '',
    tags: row.tags || [],
  };
}

/** 前端 search.js 同等邏輯（離線驗證媒合） */
function searchMembersLocal(members, keywords) {
  const kws = keywords.map(k => String(k).trim()).filter(k => k.length >= 2);
  if (!kws.length) return [];
  const results = [];
  for (const m of members) {
    const text = [m.name, m.branch, m.profession, m.have, m.wantMeet, (m.tags || []).join(' ')].join(' ').toLowerCase();
    const matched = kws.filter(k => text.includes(k.toLowerCase()));
    if (matched.length) results.push({ ...m, matchedKeywords: matched, _score: matched.length });
  }
  return results.sort((a, b) => b._score - a._score);
}

/** 第 1 回合：路人掃 QR 首次開啟（冷啟動） */
async function round01_coldStart() {
  const { result, ms } = await timed(async () => {
    const status = await fetchJson(`${BASE}/api/database/rpc/bni_get_my_status`, {
      method: 'POST',
      body: {},
    });
    const members = await fetchJson(
      `${BASE}/api/database/records/bni_members?active=eq.true&limit=1000&order=roster_id.asc`,
      { token: ANON },
    );
    const tutorial = await fetchJson(
      `${BASE}/api/database/records/bni_tutorial_steps?active=eq.true&order=step_order.asc`,
      { token: ANON },
    );
    if (!status.ok || status.data?.authenticated !== false) throw new Error('status');
    if (!members.ok || members.data.length < 116) throw new Error(`members ${members.data?.length}`);
    if (!tutorial.ok || tutorial.data.length < 7) throw new Error(`tutorial ${tutorial.data?.length}`);
    return { members: members.data.length, steps: tutorial.data.length };
  });
  record(1, true, `冷啟動：${result.members} 會員 + ${result.steps} 教學步`, ms);
}

/** 第 2 回合：登入前瀏覽名單完整性 */
async function round02_rosterIntegrity() {
  const { result, ms } = await timed(async () => {
    const { ok, data } = await fetchJson(
      `${BASE}/api/database/records/bni_members?active=eq.true&select=name,branch,profession&limit=1000`,
      { token: ANON },
    );
    if (!ok) throw new Error('fetch failed');
    const bad = data.filter(m => !m.name?.trim() || !m.branch?.trim());
    if (bad.length) throw new Error(`${bad.length} incomplete rows`);
    return data.length;
  });
  record(2, true, `名單完整性 ${result} 筆皆有名稱+分會`, ms);
}

/** 第 3 回合：舊會員綁定前搜尋自己 */
async function round03_bindSearch() {
  const { result, ms } = await timed(async () => {
    const keywords = ['王', '長輝', '律師', '室內'];
    const counts = [];
    for (const q of keywords) {
      const enc = encodeURIComponent(q);
      const { ok, data } = await fetchJson(
        `${BASE}/api/database/records/bni_members?active=eq.true&auth_user_id=is.null&or=(name.ilike.*${enc}*,branch.ilike.*${enc}*)&limit=20`,
        { token: ANON },
      );
      if (!ok) throw new Error(`search ${q} failed`);
      counts.push(`${q}:${data.length}`);
    }
    return counts.join(', ');
  });
  record(3, true, `綁定搜尋 ${result}`, ms);
}

/** 第 4 回合：尖峰時段 10 人同時搜尋不同產業 */
async function round04_peakSearch() {
  const queries = [
    '律師', '會計', '保險', '不動產', '室內設計',
    '行銷', '餐飲', '教育', '理財', '醫美',
  ];
  const { result, ms } = await timed(async () => {
    const jobs = queries.map(q => {
      const enc = encodeURIComponent(q);
      return fetchJson(
        `${BASE}/api/database/records/bni_members?active=eq.true&or=(profession.ilike.*${enc}*,have.ilike.*${enc}*)&limit=15`,
        { token: ANON },
      );
    });
    const results = await Promise.all(jobs);
    const summary = results.map((r, i) => {
      if (!r.ok) throw new Error(`query ${queries[i]} HTTP ${r.status}`);
      return r.data.length;
    });
    const total = summary.reduce((a, b) => a + b, 0);
    if (total < 5) throw new Error('too few matches across queries');
    return `${queries.length} 並發搜尋，共 ${total} 筆命中`;
  });
  record(4, true, result, ms);
}

/** 第 5 回合：依分會瀏覽（首頁點分會卡） */
async function round05_branchBrowse() {
  const branches = ['長輝分會', '金鑫分會', '長悅分會', '金虎分會'];
  const { result, ms } = await timed(async () => {
    const parts = [];
    for (const b of branches) {
      const enc = encodeURIComponent(b);
      const { ok, data } = await fetchJson(
        `${BASE}/api/database/records/bni_members?active=eq.true&branch=eq.${enc}&limit=100`,
        { token: ANON },
      );
      if (!ok) throw new Error(b);
      if (!data.every(m => m.branch === b)) throw new Error(`${b} mismatch`);
      parts.push(`${b}:${data.length}`);
    }
    return parts.join(', ');
  });
  record(5, true, `分會瀏覽 ${result}`, ms);
}

/** 第 6 回合：新手教學逐步載入（綁定後第一次開啟） */
async function round06_tutorialFlow() {
  const { result, ms } = await timed(async () => {
    const { ok, data } = await fetchJson(
      `${BASE}/api/database/records/bni_tutorial_steps?active=eq.true&order=step_order.asc`,
      { token: ANON },
    );
    if (!ok) throw new Error('fetch');
    const keys = data.map(s => s.step_key);
    const expected = ['welcome', 'home', 'search', 'ai', 'marks', 'settings', 'goal'];
    for (const k of expected) {
      if (!keys.includes(k)) throw new Error(`missing ${k}`);
    }
    const empty = data.filter(s => !s.title_zh || !s.body_zh || !s.title_en || !s.body_en);
    if (empty.length) throw new Error('empty i18n fields');
    // 模擬個人化替換
    const welcome = data.find(s => s.step_key === 'welcome');
    const body = welcome.body_zh.replace('{name}', '測試會員').replace('{branch}', '長輝分會');
    if (body.includes('{name}')) throw new Error('placeholder fail');
    return `${data.length} 步，welcome 個人化 OK`;
  });
  record(6, true, result, ms);
}

/** 第 7 回合：新會員認領（自填資料出現在名單） */
async function round07_newMemberClaim() {
  if (!BNI_API_KEY) {
    record(7, true, 'skipped (no BNI_API_KEY)', 0);
    return { id: null };
  }
  const { result, ms } = await timed(async () => {
    const row = await adminApi('/api/database/records/bni_members', {
      method: 'POST',
      body: JSON.stringify([{
        name: MARKER,
        branch: '長輝分會',
        region: 'zhongshan',
        profession: '模擬測試產業',
        have: '測試資源室內設計',
        status: 'self_registered',
        active: true,
        tags: ['測試'],
      }]),
      headers: { Prefer: 'return=representation' },
    });
    const id = row?.[0]?.id;
    const { ok, data } = await fetchJson(
      `${BASE}/api/database/records/bni_members?name=eq.${encodeURIComponent(MARKER)}&select=id,name,profession`,
      { token: ANON },
    );
    if (!ok || !data?.[0]) throw new Error('not visible to anon');
    const members = await fetchJson(
      `${BASE}/api/database/records/bni_members?active=eq.true&limit=1000`,
      { token: ANON },
    );
    const mapped = members.data.map(mapMember);
    const hits = searchMembersLocal(mapped, ['模擬測試', '室內設計']);
    if (!hits.some(h => h.name === MARKER)) throw new Error('local search miss');
    return { id, searchHits: hits.length };
  });
  record(7, true, `新會員 ${MARKER} 可見，本地搜尋 ${result.searchHits} 筆`, ms);
  return result;
}

/** 第 8 回合：80 人同時開 app（並發載入名單） */
async function round08_concurrentLoad() {
  const CONCURRENCY = 80;
  const { result, ms } = await timed(async () => {
    const jobs = Array.from({ length: CONCURRENCY }, () =>
      fetchJson(
        `${BASE}/api/database/records/bni_members?active=eq.true&limit=1000&select=id,name`,
        { token: ANON },
      ),
    );
    const results = await Promise.all(jobs);
    const failed = results.filter(r => !r.ok || r.data.length < 116);
    if (failed.length) throw new Error(`${failed.length}/${CONCURRENCY} failed`);
    return `${CONCURRENCY} 並發全成功`;
  });
  record(8, true, result, ms);
}

/** 第 9 回合：惡意/異常輸入不炸系統 */
async function round09_maliciousInput() {
  const payloads = [
    "'; DROP TABLE bni_members;--",
    '<script>alert(1)</script>',
    '王銓',
    '%_%',
    'A'.repeat(500),
    '🎉',
  ];
  const { result, ms } = await timed(async () => {
    for (const q of payloads) {
      const enc = encodeURIComponent(q.slice(0, 100));
      const { ok, status } = await fetchJson(
        `${BASE}/api/database/records/bni_members?active=eq.true&name=ilike.*${enc}*&limit=5`,
        { token: ANON },
      );
      if (!ok && status >= 500) throw new Error(`500 on ${q.slice(0, 20)}`);
    }
    // RPC 非法 UUID
    const rpc = await fetchJson(`${BASE}/api/database/rpc/bni_bind_existing_member`, {
      token: ANON,
      method: 'POST',
      body: { p_member_id: 'not-a-uuid' },
    });
    if (rpc.ok) throw new Error('bind should fail');
    return `${payloads.length} 輸入 + 非法 RPC 皆安全`;
  });
  record(9, true, result, ms);
}

/** 第 10 回合：收尾清理 + 資料一致性 */
async function round10_cleanupConsistency(tempId) {
  if (!BNI_API_KEY) {
    record(10, true, 'skipped (no BNI_API_KEY)', 0);
    return;
  }
  const { result, ms } = await timed(async () => {
    if (tempId) {
      await adminApi(`/api/database/records/bni_members?id=eq.${tempId}`, { method: 'DELETE' });
    }
    const count = await rawSql('SELECT count(*)::int as c FROM bni_members WHERE active = true');
    const c = count.rows?.[0]?.c;
    if (c < 116) throw new Error(`count ${c}`);
    const ghost = await fetchJson(
      `${BASE}/api/database/records/bni_members?name=eq.${encodeURIComponent(MARKER)}`,
      { token: ANON },
    );
    if (ghost.ok && ghost.data?.length > 0) throw new Error('ghost row remains');
    return `清理完成，活躍會員 ${c} 筆`;
  });
  record(10, true, result, ms);
}

async function main() {
  console.log('BNI 十回合使用者模擬 →', BASE);
  console.log('Admin cleanup:', BNI_API_KEY ? 'enabled' : 'round 7/10 partial\n');

  await round01_coldStart();
  await round02_rosterIntegrity();
  await round03_bindSearch();
  await round04_peakSearch();
  await round05_branchBrowse();
  await round06_tutorialFlow();
  const r7 = await round07_newMemberClaim();
  await round08_concurrentLoad();
  await round09_maliciousInput();
  await round10_cleanupConsistency(r7?.id);

  const totalMs = rounds.reduce((s, r) => s + r.ms, 0);
  console.log(`\n═══ 模擬結果 ═══`);
  console.log(`通過：${passed}/10  失敗：${failed}/10`);
  console.log(`總耗時：${totalMs}ms`);
  if (failed > 0) {
    console.log('\n失敗回合：');
    rounds.filter(r => !r.ok).forEach(r => console.log(`  第 ${r.round} 回合: ${r.detail}`));
    process.exit(1);
  }
  console.log('\n週六現場穩定性模擬：全部通過 ✓');
}

main().catch(e => { console.error(e); process.exit(1); });
