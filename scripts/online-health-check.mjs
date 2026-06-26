const SITE = 'https://bni-ateam-2026.netlify.app';
const BACKEND = 'https://a-team9204.zeabur.app';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTM4NzR9.b4G5qu2-t9QGM3TIkAO_2LLTWBPztLBMDC4q0Cf0m8g';

const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
  }
}

await check('前端首頁', async () => {
  const r = await fetch(SITE);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  if (!html.includes('src/main.js')) throw new Error('缺少 main.js');
  return `HTTP ${r.status}`;
});

await check('白屏修復 (appUrl.js)', async () => {
  const r = await fetch(`${SITE}/src/utils/appUrl.js`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const js = await r.text();
  if (!js.includes('normalizeAppUrl')) throw new Error('未部署 normalizeAppUrl');
  return '已部署';
});

await check('靜態名單 members.js', async () => {
  const r = await fetch(`${SITE}/src/data/members.js`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const kb = Math.round((await r.text()).length / 1024);
  return `${kb} KB`;
});

await check('AI 媒合 API', async () => {
  const r = await fetch(`${SITE}/api/ai-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: '【想找】會計師、記帳士' }),
  });
  const data = await r.json();
  if (!r.ok || !data.ok) throw new Error(data.message || `HTTP ${r.status}`);
  return `iSeek: ${(data.iSeek || []).slice(0, 4).join('、')}`;
});

await check('InsForge 健康檢查', async () => {
  const r = await fetch(`${BACKEND}/api/health`);
  const data = await r.json();
  if (data.status !== 'ok') throw new Error(JSON.stringify(data));
  return data.version;
});

await check('公開統計 (800 人)', async () => {
  const r = await fetch(`${BACKEND}/api/database/rpc/bni_get_public_stats`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return `${data.total_members} 人 · ${data.branch_count} 分會`;
});

await check('聊天室讀取', async () => {
  const r = await fetch(`${BACKEND}/api/database/rpc/bni_get_feed`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_limit: 5 }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  const n = Array.isArray(data) ? data.length : 0;
  return `${n} 則訊息`;
});

await check('裝置登入 (認領用)', async () => {
  const email = `probe-${Date.now()}@ateam2026.local`;
  const r = await fetch(`${BACKEND}/api/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'ProbePass123!', name: 'Probe' }),
  });
  const data = await r.json();
  if (!r.ok || !data.accessToken) throw new Error(data.message || `HTTP ${r.status}`);
  return '可建立 session';
});

await check('聊天限速 10 秒 (後端)', async () => {
  const r = await fetch(`${BACKEND}/api/database/advance/rawsql`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `SELECT CASE WHEN pg_get_functiondef(p.oid) LIKE '%interval ''10 seconds''%' THEN '10s' ELSE 'other' END AS rate
        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
        WHERE n.nspname='public' AND proname='bni_post_feed_message'`,
      params: [],
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  const rate = data.rows?.[0]?.rate;
  if (rate !== '10s') throw new Error(`目前是 ${rate}`);
  return '10 秒';
});

await check('重複認領 (後端 bind)', async () => {
  const r = await fetch(`${BACKEND}/api/database/advance/rawsql`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `SELECT CASE WHEN pg_get_functiondef(p.oid) LIKE '%auth_user_id IS NOT NULL%' THEN 'yes' ELSE 'no' END AS dup
        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
        WHERE n.nspname='public' AND proname='bni_bind_existing_member'`,
      params: [],
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  if (data.rows?.[0]?.dup !== 'yes') throw new Error('未啟用');
  return '已啟用';
});

console.log('\n=== 線上可用性檢查 ===');
console.log(`網站: ${SITE}`);
console.log(`後端: ${BACKEND}\n`);
for (const row of results) {
  console.log(`${row.ok ? '✅' : '❌'} ${row.name} — ${row.detail}`);
}
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通過`);
process.exit(failed.length ? 1 : 0);
