#!/usr/bin/env node
/**
 * 本次修復回歸測試：鎏金標題、聊天室區域、重複認領、後端 RPC
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BACKEND = process.env.API_BASE_URL || process.env.BNI_API_BASE || 'https://a-team9204.zeabur.app';
const API_KEY = process.env.API_KEY || process.env.BNI_API_KEY;
const ANON = process.env.BNI_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTM4NzR9.b4G5qu2-t9QGM3TIkAO_2LLTWBPztLBMDC4q0Cf0m8g';

const results = [];

function read(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`✅ ${name} — ${detail}`);
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
    console.log(`❌ ${name} — ${e.message}`);
  }
}

async function sql(query) {
  if (!API_KEY) throw new Error('缺少 BNI_API_KEY');
  const res = await fetch(`${BACKEND}/api/database/advance/rawsql`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params: [] }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

async function authUser() {
  const email = `smoke-${crypto.randomUUID()}@ateam2026.local`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const res = await fetch(`${BACKEND}/api/auth/users?client_type=mobile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email, password, name: 'Smoke' }),
  });
  const data = await res.json();
  if (!res.ok || !data.accessToken) throw new Error(data.message || `HTTP ${res.status}`);
  return data.accessToken;
}

async function rpc(token, fn, params) {
  const res = await fetch(`${BACKEND}/api/database/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(async () => ({ raw: await res.text() }));
  return { ok: res.ok, status: res.status, data };
}

console.log('\n=== 本次修復回歸測試 ===\n');

await check('首頁鎏金標題 class', async () => {
  const home = read('src/pages/Home.js');
  const css = read('src/styles/animations.css');
  if (!home.includes('hero-title-gold')) throw new Error('Home.js 缺少 hero-title-gold');
  if (!css.includes('@keyframes goldMetalFlow')) throw new Error('animations.css 缺少 goldMetalFlow');
  if (!css.includes('hero-title-gold::after')) throw new Error('缺少掃光偽元素');
  return 'hero-title-gold + goldMetalFlow';
});

await check('聊天室顯示區域·分會·姓名', async () => {
  const feed = read('src/components/FeedChat.js');
  const css = read('src/styles/main.css');
  for (const needle of ['chat-bubble-region', 'chatActorMetaHTML', 'actor_region', 'getRegionForBranch']) {
    if (!feed.includes(needle)) throw new Error(`FeedChat.js 缺少 ${needle}`);
  }
  if (!css.includes('.chat-bubble-meta')) throw new Error('main.css 缺少 chat-bubble-meta');
  return 'FeedChat + CSS meta 列';
});

await check('認領 RPC 優先 (memberClaim.js)', async () => {
  const js = read('src/utils/memberClaim.js');
  if (!js.includes('bni_claim_by_name_branch')) throw new Error('缺少後端 RPC');
  if (!js.includes('claimViaClientMatch')) throw new Error('缺少 fallback');
  if (!js.includes('registerNewMember')) throw new Error('缺少 duplicate fallback');
  return 'RPC 優先 + fallback';
});

await check('後端 bni_claim_by_name_branch 存在', async () => {
  const r = await sql(`SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND proname='bni_claim_by_name_branch'`);
  if (!r.rows?.[0]?.proname) throw new Error('RPC 未部署');
  return r.rows[0].proname;
});

await check('後端 feed 回傳 actor_region', async () => {
  const r = await sql(`SELECT CASE WHEN pg_get_functiondef(p.oid) LIKE '%actor_region%' THEN 'yes' ELSE 'no' END AS has_region
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
    WHERE n.nspname='public' AND proname='bni_get_feed'`);
  if (r.rows?.[0]?.has_region !== 'yes') throw new Error('bni_get_feed 未含 actor_region');
  return 'actor_region 已加入';
});

await check('後端 bind 允許已認領名單複製', async () => {
  const r = await sql(`SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND proname='bni_bind_existing_member'`);
  const def = r.rows?.[0]?.def || '';
  if (def.includes("RAISE EXCEPTION 'NOT_ROSTER_MEMBER'")) throw new Error('仍會拋 NOT_ROSTER_MEMBER');
  if (!def.includes('auth_user_id IS NOT NULL')) throw new Error('缺少 duplicate 邏輯');
  return '已允許 duplicate bind';
});

await check('重複認領 孫成育+長輝 (RPC)', async () => {
  const token = await authUser();
  const claim = await rpc(token, 'bni_claim_by_name_branch', {
    p_name: '孫成育',
    p_branch: '長輝分會',
    p_region: null,
  });
  if (!claim.ok) throw new Error(JSON.stringify(claim.data));
  if (!claim.data?.ok) throw new Error(JSON.stringify(claim.data));
  if (!claim.data.matched) throw new Error('應匹配既有名單');
  return `duplicate=${claim.data.duplicate} member_id=${claim.data.member_id?.slice(0, 8)}…`;
});

await check('feed API 含 actor_region 欄位', async () => {
  const res = await fetch(`${BACKEND}/api/database/rpc/bni_get_feed`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_limit: 3 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  const item = Array.isArray(data) ? data.find(x => x.feed_type === 'message') : null;
  if (item && !('actor_region' in item)) throw new Error('message 項目缺少 actor_region');
  return item ? `範例: ${item.actor_name} · ${item.actor_region || '(null)'} · ${item.actor_branch}` : '無 message 項目（欄位定義 OK）';
});

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通過`);
process.exit(failed.length ? 1 : 0);
