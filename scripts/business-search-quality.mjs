/**
 * 商務媒合搜尋品質測試 — 模擬週六現場真實搜尋句
 * 流程：使用者輸入 → localExtract（AI 失敗時 fallback）→ searchMembers
 *
 * Run: node scripts/business-search-quality.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STOP_WORDS = new Set([
  '我', '是', '做', '的', '想', '找', '認識', '有', '可以', '幫', '也', '或', '和', '以及',
  '需要', '提供', '給', '對', '這', '那', '什麼', '樣', '公司', '廠商', '了', '就', '都',
  '才', '會', '要', '在', '一', '個', '人', '很', '不', '大', '小', '多', '少', '高', '低',
  '希望', '想要', '尋找', '合作', '推薦', '引薦', '了解', '接觸', '我是', '我做', '我在',
  '我有', '我想', '我需', '也想', '或是', '以及', '並且', '客戶', '裝修',
]);

const BNI_KEYWORDS = [
  '律師', '會計師', '記帳士', '稅務', '保險', '不動產', '室內設計', '廣告', '行銷', '科技',
  '醫療', '健康', '美業', '餐飲', '教育', '培訓', '顧問', '金融', '理財', '建設', '開發',
  '貿易', '人力資源', '活動企劃', '企業主', '老闆', '董事長', '總經理', '高資產', '財務',
  '創業', '新創', '中小企業', '家族企業', '二代', '接班', '傳承', '投資', '融資', '貸款',
  '電商', '網路', '數位', '品牌', '公關', '媒體', '設計', '工程', '製造', '進出口', '建商',
  '財務規劃', '財務顧問', '人資', '獵頭', '房仲', '裝潢', '裝修',
];

function localExtract(input) {
  if (!input) return [];
  const found = BNI_KEYWORDS.filter(kw => input.includes(kw));
  const splitWords = input
    .replace(/[，。！？,.!?、；：\s\n\r]/g, ' ')
    .split(' ')
    .map(w => w.trim())
    .filter(w => w.length >= 2 && w.length <= 8 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
  return [...new Set([...found, ...splitWords])].slice(0, 6);
}

function loadMembers() {
  const membersJs = readFileSync(join(__dirname, '../src/data/members.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(membersJs, sandbox);
  return sandbox.window.BNI_MEMBERS || [];
}

/** 週六現場典型搜尋 + 預期應出現在前列的關鍵產業/字 */
const SCENARIOS = [
  {
    query: '我是律師，想認識高資產客戶和財務顧問',
    expectAny: ['律師', '法律', '理財', '財務', '保險', '會計'],
    minResults: 3,
  },
  {
    query: '我做室內設計，想找建商或企業主裝修客戶',
    expectAny: ['室內', '設計', '裝修', '裝潢', '建設', '營造', '統包'],
    minResults: 3,
  },
  {
    query: '我是人力資源顧問，想認識中小企業主',
    expectAny: ['人資', '人力', '獵頭', '招募', '企業', '老闆', '顧問'],
    minResults: 3,
  },
  {
    query: '我是做保險的，想找企業主或會計師',
    expectAny: ['保險', '壽險', '理財', '會計', '企業', '老闆'],
    minResults: 3,
  },
  {
    query: '我是做財務規劃的，想找有傳承需求的家族企業',
    expectAny: ['理財', '財務', '保險', '傳承', '家族', '會計', '稅務'],
    minResults: 3,
  },
  {
    query: '想找室內設計的會員',
    expectAny: ['室內', '設計', '裝修', '裝潢'],
    minResults: 2,
  },
  {
    query: '我是餐飲業，想找行銷或品牌合作',
    expectAny: ['餐飲', '行銷', '品牌', '廣告', '餐廳'],
    minResults: 3,
  },
  {
    query: '想認識不動產仲介',
    expectAny: ['不動產', '房仲', '房地', '地政'],
    minResults: 2,
  },
];

function memberText(m) {
  return [m.name, m.profession, m.have, m.wantMeet, (m.tags || []).join(' ')].join(' ');
}

function topMatchesExpectation(results, expectAny, topN = 5) {
  const top = results.slice(0, topN);
  const hits = top.filter(m => {
    const text = memberText(m).toLowerCase();
    return expectAny.some(k => text.includes(k.toLowerCase()));
  });
  return { top, hits, hitRate: hits.length / Math.max(top.length, 1) };
}

async function main() {
  globalThis.window = { BNI_MEMBERS: loadMembers() };
  const { searchMembers, getSuggestions } = await import('../src/utils/search.js');
  const members = window.BNI_MEMBERS;

  console.log('商務媒合搜尋品質測試');
  console.log(`名單：${members.length} 人（與 DB 種子同源）\n`);

  let passed = 0;
  let failed = 0;

  for (const s of SCENARIOS) {
    const keywords = localExtract(s.query);
    const results = searchMembers(keywords);
    const { top, hits, hitRate } = topMatchesExpectation(results, s.expectAny);

    const okCount = results.length >= s.minResults;
    const okQuality = hitRate >= 0.4; // 前 5 名至少 40% 語意相關
    const ok = okCount && okQuality;

    if (ok) passed++;
    else failed++;

    const icon = ok ? '✓' : '✗';
    console.log(`${icon} 「${s.query}」`);
    console.log(`   關鍵字：${keywords.join('、') || '(空)'}`);
    console.log(`   命中 ${results.length} 人 | 前5相關率 ${Math.round(hitRate * 100)}%`);
    if (top.length) {
      console.log(`   前3：${top.slice(0, 3).map(m =>
        `${m.name}（${m.profession}）`).join(' · ')}`);
    } else {
      const sug = getSuggestions(keywords, new Set(), 3);
      console.log(`   ⚠ 無精準結果，fallback 建議：${sug.map(m => m.name).join('、')}`);
    }
    console.log('');
  }

  // 資料覆蓋度：名單裡實際有哪些常見產業
  const professions = new Set(members.map(m => m.profession).filter(Boolean));
  const checks = [
    { label: '律師/法律', ok: [...professions].some(p => /律|法律|法務/.test(p)) || members.some(m => /律師|法律/.test(memberText(m))) },
    { label: '室內設計/裝修', ok: members.some(m => /室內|裝修|裝潢|設計/.test(memberText(m))) },
    { label: '會計/稅務', ok: members.some(m => /會計|記帳|稅/.test(memberText(m))) },
    { label: '保險/理財', ok: members.some(m => /保險|理財|壽險/.test(memberText(m))) },
  ];
  console.log('── 名單資料覆蓋 ──');
  checks.forEach(c => console.log(`${c.ok ? '✓' : '✗'} ${c.label}`));

  console.log(`\n═══ 結果：${passed}/${SCENARIOS.length} 情境通過品質門檻 ═══`);
  if (failed > 0) {
    console.log('（門檻：≥minResults 且 前5名≥40%語意相關）');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
