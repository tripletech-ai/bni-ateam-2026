/**
 * 媒合機制模擬測試 — 涵蓋自我排除、分會分布、常見搜尋情境
 * Run: node scripts/search-simulation.mjs
 */
import { readFileSync } from 'fs';
import { parseStructuredInput } from '../src/utils/searchIntent.js';
import { normalizeBranchName } from '../src/data/branches.js';

eval(readFileSync('src/data/members.js', 'utf8').replace('window.BNI_MEMBERS', 'globalThis.BNI_MEMBERS'));

function setupWindow(overrides = {}) {
  globalThis.window = {
    BNI_MEMBERS: globalThis.BNI_MEMBERS,
    BNI_MY_MEMBER_KEY: '',
    BNI_MY_MEMBER_ID: '',
    BNI_MY_NAME: '',
    BNI_MY_BRANCH: '',
    BNI_INCOMING_ONE_KEYS: new Set(),
    localStorage: { getItem: () => null },
    ...overrides,
  };
}

setupWindow();
const { searchMembersByIntent } = await import('../src/utils/search.js');

function branchCounts(members) {
  const c = {};
  for (const m of members) c[m.branch] = (c[m.branch] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

function topSummary(result, n = 8) {
  const all = [...result.precise, ...result.network, ...result.referral, ...result.possible];
  return all.slice(0, n).map(m => ({
    name: m.name,
    branch: m.branch,
    profession: m.profession,
    tier: m._tier,
    score: m._score,
  }));
}

function assert(name, cond, detail = '') {
  const ok = !!cond;
  console.log(ok ? '  ✓' : '  ✗', name, detail ? `— ${detail}` : '');
  return ok;
}

let passed = 0;
let total = 0;
function check(name, cond, detail) {
  total++;
  if (assert(name, cond, detail)) passed++;
}

console.log('=== 資料池 ===');
const members = globalThis.BNI_MEMBERS;
console.log(`  靜態名單：${members.length} 人`);
console.log('  分會分布 TOP5:', branchCounts(members).slice(0, 5).map(([b, n]) => `${b}(${n})`).join(', '));

console.log('\n=== 情境 A：基本媒合（無登入身分）===');
const scenarios = [
  { label: '【想找】醫美、診所', input: '【想找】醫美、診所、企業主' },
  { label: '【我是】律師【想找】企業主', input: '【我是】律師\n【想找】企業主、創業者' },
  { label: '【想找】會計師', input: '【想找】會計師、記帳士' },
  { label: '【我是】室內設計【想找】建商', input: '【我是】室內設計\n【想找】建商、統包' },
  { label: '口語：想要找醫療廠商', input: '想要找醫療廠商' },
  { label: '【想找】企業主【不要】保險', input: '【想找】企業主\n【不要】保險' },
];

for (const s of scenarios) {
  const intent = parseStructuredInput(s.input);
  const r = searchMembersByIntent(intent);
  const collab = [...r.precise, ...r.network];
  const branches = branchCounts(collab);
  const topBranch = branches[0];
  const changhuiShare = collab.filter(m => m.branch === '長輝分會').length / Math.max(collab.length, 1);
  console.log(`\n  ${s.label}`);
  console.log(`    意圖 iSeek: [${intent.iSeek.join('、')}]`);
  console.log(`    結果: 精準${r.precise.length} / 人脈圈${r.network.length} / 引薦${r.referral.length} / 可能${r.possible.length}`);
  console.log(`    TOP3: ${topSummary(r, 3).map(x => `${x.name}(${x.branch}/${x.profession})`).join(' | ')}`);
  console.log(`    分會TOP3: ${branches.slice(0, 3).map(([b, n]) => `${b}:${n}`).join(', ')}`);
  console.log(`    長輝佔比: ${(changhuiShare * 100).toFixed(0)}% (${collab.filter(m => m.branch === '長輝分會').length}/${collab.length})`);

  check(`${s.label} 有結果`, collab.length + r.referral.length + r.possible.length > 0);
  check(`${s.label} 長輝未壟斷(≤50%)`, changhuiShare <= 0.5 || collab.length < 4,
    changhuiShare > 0.5 ? `長輝 ${(changhuiShare * 100).toFixed(0)}%` : '');
}

console.log('\n=== 情境 B：自我排除 ===');
const yang = members.find(m => m.name === '楊哲瑋');
if (yang) {
  setupWindow({
    BNI_MY_MEMBER_KEY: `${yang.name}||${yang.branch}`,
    BNI_MY_NAME: yang.name,
    BNI_MY_BRANCH: yang.branch,
    BNI_MY_MEMBER_ID: yang.id,
  });
  const rSelf = searchMembersByIntent(parseStructuredInput('【想找】工程、律師、建商'));
  const foundSelf = [...rSelf.precise, ...rSelf.network, ...rSelf.referral, ...rSelf.possible]
    .some(m => m.name === '楊哲瑋');
  check('楊哲瑋(金暘)搜尋不會媒合到自己', !foundSelf, foundSelf ? '仍出現在結果中' : '');

  setupWindow({
    BNI_MY_MEMBER_KEY: `${yang.name}||${yang.branch}`,
    BNI_MY_NAME: yang.name,
    BNI_MY_BRANCH: yang.branch,
  });
  const r2 = searchMembersByIntent(parseStructuredInput('【想找】企業主'));
  check('排除自己後仍有其他結果', r2.precise.length + r2.network.length > 0);
} else {
  console.log('  (跳過：名單無楊哲瑋)');
}

console.log('\n=== 情境 C：同分會加分驗證（+1 不應主導排序）===');
setupWindow({
  BNI_MY_MEMBER_KEY: '測試使用者||長輝分會',
  BNI_MY_NAME: '測試使用者',
  BNI_MY_BRANCH: '長輝分會',
});
const rBranch = searchMembersByIntent(parseStructuredInput('【想找】會計師'));
const top5 = [...rBranch.precise, ...rBranch.network].slice(0, 5);
const changhuiInTop5 = top5.filter(m => m.branch === '長輝分會').length;
check('搜會計師 TOP5 非全長輝', changhuiInTop5 < 5, `TOP5 長輝 ${changhuiInTop5}/5`);
console.log('  TOP5:', top5.map(m => `${m.name}(${m.branch})`).join(', '));

console.log('\n=== 情境 D：同業降權 ===');
setupWindow({});
const rLawyer = searchMembersByIntent(parseStructuredInput('【我是】律師\n【想找】企業主'));
const lawyerInPrecise = rLawyer.precise.find(m => /律師/.test(m.profession || ''));
check('律師找企業主：精準區不含律師同業', !lawyerInPrecise,
  lawyerInPrecise ? `${lawyerInPrecise.name}/${lawyerInPrecise.profession}` : '');

console.log('\n=== 情境 E：排除關鍵字 ===');
const rEx = searchMembersByIntent(parseStructuredInput('【想找】企業主\n【不要】保險'));
const insuranceInPrecise = rEx.precise.filter(m => /^保險|壽險/.test(m.profession || ''));
check('排除保險：精準區無保險業', insuranceInPrecise.length === 0,
  insuranceInPrecise.map(m => m.name).join(', '));

console.log('\n=== 情境 F：空/無效輸入 ===');
const rEmpty = searchMembersByIntent(parseStructuredInput('帥哥'));
check('口語雜訊「帥哥」無有效 iSeek → 無結果或極少', 
  rEmpty.precise.length + rEmpty.network.length === 0);

console.log('\n=== 情境 G：醫療同義展開 ===');
const rMed = searchMembersByIntent(parseStructuredInput('【想找】醫療廠商'));
const zhang = [...rMed.precise, ...rMed.network, ...rMed.possible].find(m => m.name === '張松源');
check('「醫療廠商」能媒合到張松源(醫美)', !!zhang && zhang._seekSupplyHits >= 1,
  zhang ? `${zhang.profession} tier=${zhang._tier}` : '未找到');

console.log(`\n=== 總結: ${passed}/${total} 通過 ===`);
process.exit(passed === total ? 0 : 1);
