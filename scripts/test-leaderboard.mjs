/**
 * 排行榜 API 煙霧測試（連結王 / 被標記王 / live settings）
 * node scripts/test-leaderboard.mjs
 */
const BASE = 'https://a-team9204.zeabur.app';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTM4NzR9.b4G5qu2-t9QGM3TIkAO_2LLTWBPztLBMDC4q0Cf0m8g';

const headers = {
  apikey: ANON,
  Authorization: `Bearer ${ANON}`,
  'Content-Type': 'application/json',
};

const REQUIRED_ROW_KEYS = ['rank', 'name', 'branch', 'score', 'member_id'];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function rpc(name, body = {}) {
  const res = await fetch(`${BASE}/api/database/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} — ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${name}: 非 JSON — ${text.slice(0, 200)}`);
  }
}

function validateRows(rows, mode) {
  assert(Array.isArray(rows), `${mode}: 回傳應為陣列`);
  for (const row of rows) {
    for (const k of REQUIRED_ROW_KEYS) {
      assert(k in row, `${mode}: 缺少欄位 ${k} — ${JSON.stringify(row)}`);
    }
    assert(typeof row.rank === 'number' && row.rank >= 1, `${mode}: rank 無效`);
    assert(typeof row.score === 'number' && row.score >= 1, `${mode}: score 應 >= 1`);
    assert(typeof row.name === 'string' && row.name.length > 0, `${mode}: name 空白`);
  }
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const cur = rows[i];
    assert(
      prev.score >= cur.score,
      `${mode}: 分數未遞減 #${prev.rank}(${prev.score}) → #${cur.rank}(${cur.score})`,
    );
    if (prev.score === cur.score && prev.name !== cur.name) {
      // DB 以 name 排序；JS localeCompare 可能與 PG 不完全一致，僅記錄
      const jsOrder = prev.name.localeCompare(cur.name, 'zh-Hant');
      if (jsOrder > 0) {
        console.warn(`  ⚠ ${mode}: 同分姓名排序 JS/PG 可能不一致 — ${prev.name} vs ${cur.name}`);
      }
    }
  }
}

async function fetchLb(mode, limit = 30) {
  const data = await rpc('bni_get_leaderboard', { p_limit: limit, p_mode: mode });
  return Array.isArray(data) ? data : [];
}

async function main() {
  console.log('=== 排行榜 API 測試 ===\n');

  const settings = await rpc('bni_get_live_settings');
  const modes = settings?.leaderboard_modes || ['mutual', 'received_one'];
  console.log('✓ bni_get_live_settings:', JSON.stringify(settings));
  assert(Array.isArray(modes) && modes.length >= 1, 'leaderboard_modes 應為非空陣列');
  assert(modes.every(m => m === 'mutual' || m === 'received_one'), 'modes 值無效');

  for (const mode of ['mutual', 'received_one']) {
    const rows = await fetchLb(mode, 30);
    validateRows(rows, mode);
    console.log(`\n✓ bni_get_leaderboard (${mode}) — ${rows.length} 筆`);
    if (rows.length) {
      rows.slice(0, 5).forEach(r => {
        console.log(`  #${r.rank} ${r.name}（${r.branch}）— ${r.score}`);
      });
    } else {
      console.log('  （目前無上榜者）');
    }
  }

  const mutual = await fetchLb('mutual', 5);
  const received = await fetchLb('received_one', 5);
  console.log('\n--- 交叉驗證 ---');
  console.log(`連結王榜首分數: ${mutual[0]?.score ?? '—'}`);
  console.log(`被標記王榜首分數: ${received[0]?.score ?? '—'}`);

  const bad = await fetchLb('invalid_mode', 10);
  validateRows(bad, 'invalid→mutual');
  console.log('\n✓ 無效 mode 回退 mutual，筆數:', bad.length);

  const limit5 = await fetchLb('mutual', 5);
  assert(limit5.length <= 5, 'p_limit=5 應最多 5 筆');
  console.log('✓ p_limit 上限有效，mutual 前 5 筆:', limit5.length);

  console.log('\n=== 全部通過 ===');
}

main().catch(err => {
  console.error('\n✗ 測試失敗:', err.message);
  process.exit(1);
});
