#!/usr/bin/env node
import { CARD_LINKS, getCardLink } from '../src/data/cardLinks.js';
import { LEADERS } from '../src/data/leaders.js';

const API_BASE = process.env.API_BASE_URL || process.env.BNI_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.BNI_API_KEY;

const QUERY = `
SELECT name, branch, roster_id, active
FROM bni_members
WHERE active = true
  AND (
    branch LIKE '%長悅%' OR branch LIKE '%長佑%' OR branch LIKE '%長翔%' OR branch LIKE '%長城%'
    OR branch LIKE '%長輝%' OR branch LIKE '%長翼%' OR branch LIKE '%長利%' OR branch LIKE '%長和%'
    OR branch LIKE '%金鑫%' OR branch LIKE '%金虎%' OR branch LIKE '%金暘%' OR branch LIKE '%金利%'
    OR branch LIKE '%金澎湃%' OR branch LIKE '%金鈺%' OR branch LIKE '%金安%' OR branch LIKE '%金佑%'
    OR branch LIKE '%金盟%' OR branch LIKE '%金美%' OR branch LIKE '%金英%' OR branch LIKE '%金合%'
  )
ORDER BY branch, roster_id NULLS LAST, name;
`;

async function runSql(query) {
  const res = await fetch(`${API_BASE}/api/database/advance/rawsql`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params: [] }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body.rows || [];
}

function cjk(name) {
  return String(name || '').replace(/[^㐀-鿿]/g, '');
}

const leaders = [
  LEADERS.primary,
  LEADERS.secondary,
  ...LEADERS.zhongshan,
  ...LEADERS.sanlu,
];

const members = await runSql(QUERY);

console.log('=== 楊董區 A Team 20 分會 — 名片連結稽核 ===\n');
console.log(`DB 在籍會員: ${members.length} 人`);

const noCard = [];
const hasCard = [];
for (const m of members) {
  const link = getCardLink(m.name);
  if (link) hasCard.push(m);
  else noCard.push(m);
}

console.log(`cardLinks.js 已設定: ${hasCard.length} 人`);
console.log(`cardLinks.js 缺連結: ${noCard.length} 人\n`);

if (noCard.length) {
  console.log('【缺名片連結 — 依分會】');
  const byBranch = {};
  for (const m of noCard) {
    (byBranch[m.branch] ||= []).push(`${m.name}${m.roster_id ? ` (#${m.roster_id})` : ''}`);
  }
  for (const [b, names] of Object.entries(byBranch).sort()) {
    console.log(`  ${b}: ${names.join('、')}`);
  }
}

console.log('\n【領導層】');
for (const l of leaders) {
  const link = getCardLink(l.name) || l.cardLink || '';
  const tag = l.branch || l.title || l.region || '';
  console.log(`  ${link ? '✓' : '✗'} ${l.name} — ${tag}`);
}

// Google Sheet 接龍：Sheet 空白欄位
const sheetEmpty = [
  ['金利分會', '吳騏祥'],
  ['金虎分會', '李凱傑'],
  ['金澎湃分會', '譚愷悌'],
  ['長輝分會', '顧心芝'],
  ['長翔分會', '陳士懿'],
  ['金鑫分會', '林揚智'],
  ['金美分會', '林佩冠'],
  ['金暘分會', '莊博權'],
  ['長佑分會', '盧冠臻'],
];
console.log('\n【Google Sheet 接龍空白 vs cardLinks】');
for (const [branch, name] of sheetEmpty) {
  const link = getCardLink(name);
  const inDb = members.find(m => cjk(m.name) === cjk(name));
  const dbBranch = inDb?.branch || '—';
  console.log(`  ${link ? 'cardLinks 已有' : '兩邊皆缺'} | Sheet:${branch} / DB:${dbBranch} | ${name}`);
}

// Sheet 有但 cardLinks 可能缺
const sheetHasNames = [
  '徐翠蓮', '郭紜熙', '劉邵桓', '陳琳雅', '鄧子翼', '劉玓岡', '駱湘樺',
  '張秀卿', '王煜明', '謝承諺', '李維恩',
];
console.log('\n【Sheet 有連結、cardLinks 未收錄】');
let sheetGap = 0;
for (const name of sheetHasNames) {
  const link = getCardLink(name);
  const inDb = members.find(m => cjk(m.name) === cjk(name));
  if (inDb && !link) {
    sheetGap++;
    console.log(`  ✗ ${inDb.branch} ${name}`);
  }
}
if (!sheetGap) console.log('  （無 — 或不在 DB 名單）');

// 游姿菱：Sheet 空白但 cardLinks 有
const you = getCardLink('游姿菱');
console.log(`\n【特例】游姿菱 — Sheet 空白，cardLinks ${you ? '已有' : '無'}`);

// 楊日陞
console.log(`【特例】楊日陞 — Sheet/ cardLinks 皆無（楊董本人）`);

console.log('\n【cardLinks 有、DB 無對應在籍會員】');
const dbCjk = new Set(members.map(m => cjk(m.name)));
const leaderCjk = new Set(leaders.map(l => cjk(l.name)));
for (const name of Object.keys(CARD_LINKS)) {
  if (!dbCjk.has(cjk(name)) && !leaderCjk.has(cjk(name))) {
    console.log(`  ${name}`);
  }
}
