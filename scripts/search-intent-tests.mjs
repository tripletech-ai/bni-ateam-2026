/**
 * Smoke-test intent-based matching (no AI — local parse only).
 * Run: node scripts/search-intent-tests.mjs
 */
import { readFileSync } from 'fs';
import { parseStructuredInput } from '../src/utils/searchIntent.js';

eval(readFileSync('src/data/members.js', 'utf8').replace('window.BNI_MEMBERS', 'globalThis.BNI_MEMBERS'));
globalThis.window = { BNI_MEMBERS: globalThis.BNI_MEMBERS };

const { searchMembersByIntent } = await import('../src/utils/search.js');

const CASES = [
  {
    name: '律師找企業主（排除同業）',
    input: '【我是】律師\n【想找】企業主、創業者\n【不要】保險',
    assert: (r) => {
      const top = r.precise[0];
      const names = r.precise.slice(0, 5).map(m => m.name);
      const hasLawyerFirst = top && /律師/.test(top.profession || '');
      return !hasLawyerFirst && r.precise.length > 0;
    },
  },
  {
    name: '會計師精準',
    input: '【想找】會計師、記帳士',
    assert: (r) => r.precise.some(m => /記帳|會計/.test(m.profession || '')),
  },
  {
    name: '室內設計找建商',
    input: '【我是】室內設計\n【想找】建商、統包',
    assert: (r) => r.precise.length >= 2,
  },
  {
    name: '口語：想要找醫療廠商 → 張松源',
    input: '我是帥哥 想要找醫療廠商',
    assert: (r) => {
      const z = [...r.precise, ...r.network, ...r.possible, ...r.referral].find(m => m.name === '張松源');
      return z && (z._tier === 'precise' || z._seekSupplyHits >= 1);
    },
  },
  {
    name: '結構化：想找醫美',
    input: '【想找】醫美、診所、醫療健康',
    assert: (r) => r.precise.some(m => m.name === '張松源'),
  },
  {
    name: '律師找企業主 → 業務人脈圈',
    input: '【我是】律師\n【想找】企業主、創業者',
    assert: (r) => r.network.length > 0 && r.network.some(m => /行銷|會計|設計|顧問/.test(m.profession || '')),
  },
  {
    name: '排除保險',
    input: '【想找】企業主\n【不要】保險',
    assert: (r) => !r.precise.some(m => /^保險|壽險/.test(m.profession || '')),
  },
];

let pass = 0;
for (const c of CASES) {
  const intent = parseStructuredInput(c.input);
  const result = searchMembersByIntent(intent);
  const ok = c.assert(result);
  console.log(ok ? '✓' : '✗', c.name);
  if (!ok) {
    console.log('  intent:', intent);
    console.log('  precise top3:', result.precise.slice(0, 3).map(m => `${m.name}/${m.profession}`));
  }
  if (ok) pass++;
}
console.log(`\n${pass}/${CASES.length} passed`);
process.exit(pass === CASES.length ? 0 : 1);
