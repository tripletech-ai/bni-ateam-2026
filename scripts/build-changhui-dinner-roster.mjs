/**
 * Build Changhui dinner roster (no meal fields) + evershine prefills.
 * Run: node scripts/build-changhui-dinner-roster.mjs
 */
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRANCH_MEMBER = '長輝白金分會';
const BRANCH_GUEST = '長輝晚會來賓';
const REGION = 'zhongshan';

const MEMBER_NAMES = [
  '鄭雅菁', '洪智威', '王執定', '李孟一', '郭家宏', '孫成育', '王年煜', '江學洋',
  '何子翊', '吳貞妮', '湯益承', '顧心芝', '吳儀沂', '李彥慶', '楊明翰', '洪儀君',
  '江心怡', '李維恩', '施秉辰', '彭顯智', '游凱地', '劉弼凱', '宋兆禮', '陳亭儒',
  '李秉誠', '蘇子超', '宋岳霖', '邱翰城', '廖涌辰', '王祈', '何昇軒', '陳育文',
  '吳介輝', '王慕煾', '王銓', '李慰祖', '林修賢', '王冠勛', '江沛璇', '劉懿德',
  '呂學承', '陳夗媃', '游姿菱Rita', '林昱璋', '楊日陞',
];

/** @type {{ name: string, profession: string, invitedBy: string, joinIntent: string }[]} */
const GUESTS = [
  { name: '顧桂榮', profession: '保健品odm', invitedBy: '廖涌辰', joinIntent: '中' },
  { name: '胡宇駿', profession: '沙發家具', invitedBy: '江學洋', joinIntent: '中' },
  { name: '洪瑄憶', profession: '律師', invitedBy: '陳亭儒', joinIntent: '低' },
  { name: '劉囍兒', profession: '富邦保險', invitedBy: '江學洋', joinIntent: '低' },
  { name: '蔡坤達', profession: '行銷總監', invitedBy: '王執定', joinIntent: '低' },
  { name: '邱淮紳', profession: '法拍屋顧問', invitedBy: '李秉誠', joinIntent: '低' },
  { name: '劉睿杰', profession: '廣告投放', invitedBy: '李秉誠', joinIntent: '低' },
  { name: '林品爵', profession: 'ai系統整合', invitedBy: '陳夗媃', joinIntent: '中' },
  { name: '廖家頡', profession: '大圖輸出展場設計', invitedBy: '多多', joinIntent: '低' },
  { name: '葉宛昀', profession: '共享空間', invitedBy: '多多', joinIntent: '低' },
  { name: '陳柏旭 Wilson', profession: 'AI 智慧名片CRM系統', invitedBy: 'Darren', joinIntent: '中' },
  { name: '李逸強', profession: '地政士', invitedBy: '王執定', joinIntent: '低' },
  { name: '陳志信', profession: '生命禮儀', invitedBy: '王執定', joinIntent: '低' },
  { name: '尚明', profession: '光波貼片', invitedBy: '王執定', joinIntent: '中' },
  { name: '符嘉尹', profession: 'AI資訊顧問', invitedBy: '李孟一', joinIntent: '低' },
  { name: '邱裕峯', profession: '燈具照明', invitedBy: '王執定', joinIntent: '低' },
  { name: '鄭崇皓', profession: '職能治療與兒童手作百貨', invitedBy: '李孟一', joinIntent: '低' },
  { name: '施冠彰Eric', profession: '瓦斯瓶系統平台', invitedBy: '李彥慶', joinIntent: '中' },
  { name: '林宜穎', profession: '活動互動體驗', invitedBy: '鄭雅菁', joinIntent: '中' },
  { name: '陳柔羽', profession: '整合行銷', invitedBy: '何子翊', joinIntent: '低' },
  { name: '陳玉惠', profession: '安心超市', invitedBy: '何子翊', joinIntent: '低' },
  { name: '林映辰 Stan', profession: '餐具租借', invitedBy: '王慕煾', joinIntent: '中' },
  { name: '游欣憓', profession: '生態復育', invitedBy: '李彥慶', joinIntent: '中' },
  { name: '嚴弘智', profession: '空調師傅', invitedBy: '陳育文', joinIntent: '中' },
  { name: '張錦鎰', profession: '展覽製作', invitedBy: '多多', joinIntent: '低' },
  { name: '吳俊慶', profession: '草木堂道場負責人', invitedBy: '多多', joinIntent: '低' },
  { name: '林思瑀', profession: '能量風水畫', invitedBy: '多多', joinIntent: '低' },
  { name: '蔡清淵', profession: '戰略顧問', invitedBy: '何子翊', joinIntent: '低' },
  { name: '陳以恩', profession: '派遣醫療', invitedBy: '江沛璇', joinIntent: '低' },
  { name: '張亦玎', profession: '數位行銷', invitedBy: '多多', joinIntent: '低' },
  { name: '謝穎翾', profession: '國際不動產', invitedBy: '陳育文', joinIntent: '中' },
  { name: '李維培', profession: '無痛整復', invitedBy: '江學洋', joinIntent: '中' },
  { name: '張婕', profession: '齒模', invitedBy: '李維培', joinIntent: '中' },
  { name: '鄭偉銘', profession: '非營利組織（兒少與家庭服務）', invitedBy: '何子翊', joinIntent: '低' },
  { name: '羅文全', profession: '牙體技術', invitedBy: '江學洋', joinIntent: '中' },
];

function normName(n) {
  return String(n || '').replace(/\s+/g, '').replace(/[（(].*?[）)]/g, '').trim();
}

function displayName(n) {
  return String(n || '').replace(/\s+/g, ' ').trim();
}

function coreName(n) {
  // 游姿菱Rita → 游姿菱 ; 陳柏旭 Wilson → 陳柏旭
  return displayName(n).replace(/\s+[A-Za-z].*$/, '').trim() || displayName(n);
}

function extractWantMeet(fullIntro = '') {
  const m = String(fullIntro).match(/【理想引薦對象】\s*([\s\S]*?)(?:【|$)/);
  if (!m) return '';
  return m[1].replace(/\n+/g, '、').replace(/\s+/g, ' ').trim().slice(0, 200);
}

function extractLine(links) {
  if (!links) return '';
  if (Array.isArray(links)) {
    const hit = links.find(l => /line/i.test(l?.type || l?.icon || '') && l.url && l.url !== '#');
    return hit?.url || '';
  }
  if (typeof links === 'object' && links.line && links.line !== '#') return links.line;
  return '';
}

const evershine = JSON.parse(
  fs.readFileSync(join(__dirname, '_evershine-clean.json'), 'utf8'),
);
const byName = new Map();
for (const m of evershine) {
  byName.set(normName(m.name), m);
}

function enrichFromEvershine(name) {
  const keys = [normName(name), normName(coreName(name))];
  let src = null;
  for (const k of keys) {
    if (byName.has(k)) { src = byName.get(k); break; }
  }
  if (!src) return null;
  const services = Array.isArray(src.services) ? src.services.filter(Boolean) : [];
  return {
    profession: src.industry || src.position || '',
    company: src.company || src.Company || '',
    have: services.join('、') || src.shortIntro || '',
    wantMeet: extractWantMeet(src.fullIntro) || '',
    bio: (src.shortIntro || '').slice(0, 400),
    photo: src.photo || '',
    phone: src.phone || '',
    email: src.email || '',
    lineLink: extractLine(src.links),
    tags: services.slice(0, 6),
    evershineMatched: true,
  };
}

const members = MEMBER_NAMES.map((name, i) => {
  const enrich = enrichFromEvershine(name) || {};
  return {
    id: `dinner-m-${i + 1}`,
    type: 'member',
    name: displayName(name),
    branch: BRANCH_MEMBER,
    region: REGION,
    profession: enrich.profession || '',
    company: enrich.company || '',
    have: enrich.have || '',
    wantMeet: enrich.wantMeet || '',
    bio: enrich.bio || '',
    photo: enrich.photo || '',
    phone: enrich.phone || '',
    email: enrich.email || '',
    lineLink: enrich.lineLink || '',
    tags: enrich.tags || [],
    invitedBy: '',
    joinIntent: '',
    evershineMatched: !!enrich.evershineMatched,
  };
});

const guests = GUESTS.map((g, i) => ({
  id: `dinner-g-${i + 1}`,
  type: 'guest',
  name: displayName(g.name),
  branch: BRANCH_GUEST,
  region: 'guest',
  profession: g.profession || '',
  company: '',
  have: g.profession || '',
  wantMeet: '',
  bio: g.invitedBy ? `由 ${g.invitedBy} 邀約參加長輝擴大商機晚會` : '',
  photo: '',
  phone: '',
  email: '',
  lineLink: '',
  tags: g.profession ? [g.profession] : [],
  invitedBy: g.invitedBy || '',
  joinIntent: g.joinIntent || '',
  evershineMatched: false,
}));

const event = {
  id: 'changhui-2026-0723',
  title: '長輝擴大商機晚會',
  dateLabel: '2026/7/23（四）',
  timeEntry: '17:30 入場交流',
  timeStart: '19:00 晚會正式開始',
  venue: '晶宴會館－民生館',
  address: '臺北市中山區民生東路三段8號',
  note: '長輝會員免費參加',
  memberBranch: BRANCH_MEMBER,
  guestBranch: BRANCH_GUEST,
};

const roster = { event, members, guests };
const matched = members.filter(m => m.evershineMatched).length;

const outJs = `/** Auto-generated by scripts/build-changhui-dinner-roster.mjs — do not edit by hand */
export const CHANGHUI_DINNER_EVENT = ${JSON.stringify(event, null, 2)};

export const CHANGHUI_DINNER_MEMBERS = ${JSON.stringify(members, null, 2)};

export const CHANGHUI_DINNER_GUESTS = ${JSON.stringify(guests, null, 2)};

export function getChanghuiDinnerRoster() {
  return [...CHANGHUI_DINNER_MEMBERS, ...CHANGHUI_DINNER_GUESTS];
}

export function findDinnerPersonById(id) {
  return getChanghuiDinnerRoster().find(p => p.id === id) || null;
}

export function dinnerRosterStats() {
  return {
    members: CHANGHUI_DINNER_MEMBERS.length,
    guests: CHANGHUI_DINNER_GUESTS.length,
    total: CHANGHUI_DINNER_MEMBERS.length + CHANGHUI_DINNER_GUESTS.length,
    evershineMatched: CHANGHUI_DINNER_MEMBERS.filter(m => m.evershineMatched).length,
  };
}
`;

fs.writeFileSync(join(__dirname, '../src/data/changhuiDinner.js'), outJs, 'utf8');
console.log(`Wrote src/data/changhuiDinner.js`);
console.log(`members=${members.length} guests=${guests.length} evershineMatched=${matched}`);
const miss = members.filter(m => !m.evershineMatched).map(m => m.name);
if (miss.length) console.log('no evershine match:', miss.join(', '));
