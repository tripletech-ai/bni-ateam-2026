// Members data is loaded via classic <script> tag as window.BNI_MEMBERS

import { getMembersByIndustry as filterMembersByIndustry, INDUSTRY_CATEGORIES, inferIndustriesFromText } from '../data/industries.js';
import { normalizeBranchName } from '../data/branches.js';
import { normalizeIntent } from './searchIntent.js';
import { getMark, memberKey, isMutuallyConnected } from './storage.js';
import { hasIncomingOneMark } from './connectionCache.js';

function getMyMemberKey() {
  return (typeof window !== 'undefined' && window.BNI_MY_MEMBER_KEY) || '';
}

function normalizeKey(key) {
  return String(key || '').replace(/\s+/g, '').toLowerCase();
}

function isSelfMember(member) {
  const myKey = getMyMemberKey();
  const key = memberKey(member);
  if (myKey && key === myKey) return true;
  if (myKey && normalizeKey(key) === normalizeKey(myKey)) return true;

  const myId = typeof window !== 'undefined' ? window.BNI_MY_MEMBER_ID : '';
  if (myId && (member.dbId === myId || member.id === myId)) return true;

  const myName = typeof window !== 'undefined' ? window.BNI_MY_NAME : '';
  const myBranch = getMyBranch();
  if (myName && member.name === myName && myBranch
      && normalizeBranchName(member.branch) === normalizeBranchName(myBranch)) {
    return true;
  }
  return false;
}

function getMembers() {
  return window.BNI_MEMBERS || [];
}

const memberId = m => m.id || m.name;

const SYNONYM_GROUPS = [
  ['律師', '法律', '訴訟', '法務'],
  ['會計', '會計師', '記帳', '記帳士', '稅務', '報稅'],
  ['保險', '壽險', '產險', '保經', '保代'],
  ['不動產', '房地產', '房仲', '仲介', '房屋'],
  ['室內設計', '裝修', '裝潢', '室內裝修', '統包'],
  ['建設', '建商', '營造'],
  ['行銷', '廣告', '數位行銷'],
  ['品牌', '品牌設計', '品牌策略'],
  ['老闆', '企業主', '負責人', '總經理', '董事長', '創辦人', '中小企業', '創業者', '經營者'],
  ['家族企業', '二代', '接班', '傳承'],
  ['人資', '人力資源', '招募', '獵頭'],
  ['物理治療', '復健'],
  ['醫美', '醫學美容', '微整'],
  ['醫療', '醫學', '醫師', '診所', '美容', '美容醫學', '整形', '健康', '保健', '長照', '預防醫學', '牙科', '牙醫', '醫療器材', '醫療設備', '醫療用品'],
  ['美業', '美髮', '美甲', '美睫', '沙龍'],
  ['理財', '財務規劃', '資產配置', '財富傳承'],
  ['投資', '融資', '貸款'],
  ['攝影', '攝影師', '拍攝', '錄影'],
  ['教育', '培訓', '課程', '講師'],
  ['餐飲', '餐廳', '美食'],
  ['電商', '網路購物', '網購'],
  ['高資產', '高淨值'],
];

const DECISION_MAKER_RE = /企業主|老闆|創辦人|董事長|總經理|負責人|經營者|創業者|二代|接班人|家族企業主/;

const SYN_INDEX = (() => {
  const m = new Map();
  for (const group of SYNONYM_GROUPS) {
    const lower = group.map(t => t.toLowerCase());
    for (const t of lower) {
      if (!m.has(t)) m.set(t, new Set());
      lower.forEach(x => m.get(t).add(x));
    }
  }
  return m;
})();

const SEEK_SUFFIX_RE = /(廠商|業者|商家|供應商|供應|經銷|代理商|公司|老闆|負責人|決策者)$/u;

function decomposeKeyword(kw) {
  const parts = new Set([kw]);
  const stripped = kw.replace(SEEK_SUFFIX_RE, '').trim();
  if (stripped.length >= 2 && stripped !== kw) parts.add(stripped);
  return [...parts];
}

function expandMedicalCluster(terms) {
  const blob = [...terms].join(' ');
  if (/醫|診所|美容|整形|牙|健康|保健|長照/.test(blob)) {
    ['醫學', '醫美', '醫療', '美容', '診所', '整形', '健康', '保健'].forEach(t => terms.add(t));
  }
}

function expandKeyword(k) {
  const terms = new Set();
  for (const part of decomposeKeyword(k)) {
    const lk = part.toLowerCase().trim();
    if (lk.length < 2) continue;
    terms.add(lk);
    if (SYN_INDEX.has(lk)) SYN_INDEX.get(lk).forEach(t => terms.add(t));
    for (const [term, group] of SYN_INDEX) {
      if (term.length >= 2 && lk.includes(term)) {
        group.forEach(t => terms.add(t));
      }
    }
  }
  expandMedicalCluster(terms);
  return [...terms];
}

function expandTerms(list) {
  return (list || []).map(kw => ({ kw, terms: expandKeyword(kw) }));
}

function cleanTags(tags) {
  return (tags || []).filter(t => {
    const s = String(t || '').trim();
    return s.length > 2 && s !== '▪︎' && !/^[（(▪]/.test(s);
  });
}

function memberIndustryBlob(member) {
  let ids = member.industries?.length ? member.industries : inferIndustriesFromText(member.profession, member.have);
  const kws = [];
  for (const id of ids) {
    const cat = INDUSTRY_CATEGORIES.find(c => c.id === id);
    if (cat) kws.push(...cat.keywords);
  }
  return kws.join(' ').toLowerCase();
}

function memberFields(member) {
  return {
    profession: (member.profession || '').toLowerCase(),
    bio: (member.bio || '').toLowerCase(),
    tags: cleanTags(member.tags).join(' ').toLowerCase(),
    have: (member.have || '').toLowerCase(),
    wantMeet: (member.wantMeet || '').toLowerCase(),
    wantReferral: (member.wantReferral || '').toLowerCase(),
    industries: memberIndustryBlob(member),
  };
}

function fieldHit(text, terms) {
  return terms.some(t => {
    if (t.length < 2) return false;
    if (text.includes(t)) return true;
    // 醫療 ↔ 美容醫學：共用「醫」族根
    if (t.startsWith('醫') && t.length >= 2 && /醫/.test(text)) {
      const tail = t.slice(1);
      if (tail.length >= 1 && text.includes(tail)) return true;
    }
    return false;
  });
}

function professionMatchBonus(member, terms) {
  const prof = (member.profession || '').toLowerCase();
  if (!prof) return 0;
  for (const t of terms) {
    if (t.length >= 2 && prof.includes(t)) return 3;
  }
  return 0;
}

/** 醫療/醫美類搜尋：直接醫療供應方優先於僅引薦或標籤沾醫療字 */
function medicalSeekBonus(member, kw, terms) {
  const blob = [kw, ...terms].join(' ');
  if (!/醫|診所|美容|整形|健康|保健|牙/.test(blob)) return 0;
  const prof = member.profession || '';
  if (/美容醫學|醫美|醫學美容|整形|微整/.test(prof)) return 8;
  if (/牙|診所|醫師|醫療|長照|復健|物理治療|OSA/.test(prof)) return 4;
  if (/保健食品|健康食品|營養品|生活保健/.test(prof)) return -3;
  return 0;
}

function isDecisionMaker(member) {
  const blob = [member.profession, member.have, member.bio].filter(Boolean).join(' ');
  return DECISION_MAKER_RE.test(blob);
}

function isExcluded(f, expandedExclude) {
  for (const { terms } of expandedExclude) {
    if (fieldHit(f.profession, terms) || fieldHit(f.have, terms) || fieldHit(f.tags, terms)) {
      return true;
    }
  }
  return false;
}

function getMyBranch() {
  return (typeof window !== 'undefined' && window.BNI_MY_BRANCH) || '';
}

function scoreMemberByIntent(member, intent) {
  const f = memberFields(member);
  const iAm = expandTerms(intent.iAm);
  const iOffer = expandTerms(intent.iOffer);
  const iSeek = expandTerms(intent.iSeek);
  const iRefer = expandTerms(intent.iRefer);
  const ex = expandTerms(intent.exclude);

  if (ex.length && isExcluded(f, ex)) return null;

  let seekScore = 0;
  let seekSupplyHits = 0;
  let referralScore = 0;
  let networkScore = 0;
  let peerPenalty = 0;
  let contextBonus = 0;
  /** @type {{ type: string, text: string }[]} */
  const matchReasons = [];
  const matchedKeywords = [];

  const allSeek = [...iSeek, ...iRefer];
  if (!allSeek.length && !iAm.length && !iOffer.length) return null;

  for (const { kw, terms } of allSeek) {
    let hit = false;
    if (fieldHit(f.profession, terms)) {
      seekScore += 14;
      seekSupplyHits++;
      hit = true;
      seekScore += professionMatchBonus(member, terms);
      matchReasons.push({ type: 'seek', text: `${kw} ↔ 產業「${member.profession}」` });
    } else if (fieldHit(f.have, terms)) {
      seekScore += 8;
      seekSupplyHits++;
      hit = true;
      matchReasons.push({ type: 'seek', text: `${kw} ↔ 提供的資源` });
    } else if (fieldHit(f.industries, terms)) {
      seekScore += 7;
      seekSupplyHits++;
      hit = true;
      matchReasons.push({ type: 'seek', text: `${kw} ↔ 大產業分類` });
    } else if (fieldHit(f.bio, terms)) {
      seekScore += 5;
      seekSupplyHits++;
      hit = true;
      matchReasons.push({ type: 'seek', text: `${kw} ↔ 自我介紹` });
    } else if (fieldHit(f.tags, terms)) {
      seekScore += 2;
      hit = true;
      matchReasons.push({ type: 'seek', text: `${kw} ↔ 標籤` });
    }

    if (fieldHit(f.wantReferral, terms)) {
      referralScore += 6;
      hit = true;
      matchReasons.push({ type: 'referral', text: `${kw} ↔ 可引薦對象（引薦路徑）` });
    }

    if (!hit && fieldHit(f.wantMeet, terms)) {
      networkScore += 9;
      matchReasons.push({ type: 'network', text: `同客群：對方也想開發「${kw}」— 可結盟一起找客戶` });
    }

    if (hit) matchedKeywords.push(kw);

    const medBonus = medicalSeekBonus(member, kw, terms);
    if (medBonus) contextBonus = Math.max(contextBonus, medBonus);

    if (terms.some(t => DECISION_MAKER_RE.test(t)) && isDecisionMaker(member)) {
      seekScore += 4;
      if (!matchReasons.some(r => r.type === 'decision')) {
        matchReasons.push({ type: 'decision', text: '決策者／企業經營者' });
      }
    }
  }

  for (const { kw, terms } of iAm) {
    if (fieldHit(f.wantMeet, terms)) {
      networkScore += 8;
      matchReasons.push({ type: 'network', text: `業務人脈圈：對方想認識「${kw}」類夥伴，可共同服務客群` });
    }
    if (fieldHit(f.profession, terms)) {
      peerPenalty += 14;
      matchReasons.push({ type: 'peer', text: `同業（${member.profession}）— 已降低排序` });
    }
  }

  for (const { kw, terms } of iOffer) {
    if (fieldHit(f.wantMeet, terms)) {
      networkScore += 6;
      matchReasons.push({ type: 'network', text: `你的「${kw}」↔ 對方想開發的客群，可交叉合作` });
    }
  }

  let socialBonus = 0;
  const incomingMarked = hasIncomingOneMark(member);
  if (incomingMarked) {
    socialBonus += 8;
    matchReasons.unshift({ type: 'incoming', text: '對方已標記想與你 1-1' });
  }
  if (getMark(member).one) {
    socialBonus += 2;
  }
  if (isMutuallyConnected(member)) {
    socialBonus += 4;
    matchReasons.unshift({ type: 'mutual', text: '已互相連結' });
  }

  const myBranch = getMyBranch();
  if (myBranch && normalizeBranchName(member.branch) === normalizeBranchName(myBranch)) {
    socialBonus += 1;
    matchReasons.push({ type: 'branch', text: `同分會（${myBranch}）` });
  }

  const total = seekScore + referralScore + networkScore + socialBonus + contextBonus - peerPenalty;
  if (total < 3 && !referralScore && !networkScore) return null;

  const isPeer = peerPenalty >= 14 && seekSupplyHits === 0;
  const isSameProfessionPeer = peerPenalty >= 14 && iAm.length > 0;

  let tier = 'possible';
  if (seekSupplyHits >= 1 && seekScore >= 8 && !isPeer && !isSameProfessionPeer) {
    tier = 'precise';
  } else if (networkScore >= 7 && !isPeer && !isSameProfessionPeer && seekSupplyHits === 0) {
    tier = 'network';
  } else if (referralScore >= 6 && seekSupplyHits === 0) {
    tier = 'referral';
  } else if (referralScore >= 4) {
    tier = 'referral';
  }

  return {
    ...member,
    matchedKeywords: [...new Set(matchedKeywords)],
    matchReasons: matchReasons.slice(0, 4),
    _score: total,
    _tier: tier,
    _seekSupplyHits: seekSupplyHits,
    _networkScore: networkScore,
  };
}

/**
 * @param {import('./searchIntent.js').SearchIntent | string[]} keywordsOrIntent
 */
export function searchMembersByIntent(keywordsOrIntent) {
  const intent = normalizeIntent(keywordsOrIntent);
  const buckets = { precise: [], network: [], referral: [], possible: [] };

  for (const member of getMembers()) {
    if (isSelfMember(member)) continue;
    const hit = scoreMemberByIntent(member, intent);
    if (!hit) continue;
    if (hit._tier === 'precise') buckets.precise.push(hit);
    else if (hit._tier === 'network') buckets.network.push(hit);
    else if (hit._tier === 'referral') buckets.referral.push(hit);
    else buckets.possible.push(hit);
  }

  const sortHits = (a, b) =>
    b._score - a._score ||
    b._seekSupplyHits - a._seekSupplyHits ||
    (b.matchReasons?.length || 0) - (a.matchReasons?.length || 0) ||
    a.name.localeCompare(b.name, 'zh-TW');

  const sortNetwork = (a, b) =>
    b._networkScore - a._networkScore ||
    b._score - a._score ||
    a.name.localeCompare(b.name, 'zh-TW');

  buckets.precise.sort(sortHits);
  buckets.network.sort(sortNetwork);
  buckets.referral.sort(sortHits);
  buckets.possible.sort(sortHits);

  return buckets;
}

/** @param {import('./searchIntent.js').SearchIntent | string[]} keywordsOrIntent */
export function searchMembersTiered(keywordsOrIntent) {
  const { precise, network, possible, referral } = searchMembersByIntent(keywordsOrIntent);
  return { precise, network, possible, referral };
}

export function searchMembers(keywordsOrIntent) {
  return searchMembersByIntent(keywordsOrIntent).precise;
}

/** @deprecated No longer pads with weak suggestions — kept for API compat */
export function getSuggestions() {
  return [];
}

export function getMembersByBranch(branchName) {
  return getMembers().filter(m => m.branch === branchName);
}

export function getMembersByIndustry(industryId) {
  return filterMembersByIndustry(getMembers(), industryId);
}

export function getAllMembers() {
  return [...getMembers()];
}
