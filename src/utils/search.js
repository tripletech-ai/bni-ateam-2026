// Members data is loaded via classic <script> tag as window.BNI_MEMBERS
// This avoids ES module cache issues across Netlify deployments

function getMembers() {
  return window.BNI_MEMBERS || [];
}

const memberId = m => m.id || m.name;

// ── Synonym groups — TIGHT clusters that bridge vocabulary gaps ──
// Only true near-synonyms where the user's word differs from the data's
// word (e.g. 法律→律師, 老闆→企業主). Broad substring cases (設計→室內設計)
// are already handled by substring matching, so they are NOT grouped here —
// over-broad groups hurt precision.
const SYNONYM_GROUPS = [
  ['律師', '法律', '訴訟', '法務'],
  ['會計', '會計師', '記帳', '記帳士', '稅務', '報稅'],
  ['保險', '壽險', '產險', '保經', '保代'],
  ['不動產', '房地產', '房仲', '仲介', '房屋'],
  ['室內設計', '裝修', '裝潢', '室內裝修'],
  ['建設', '建商', '營造'],
  ['行銷', '廣告', '數位行銷'],
  ['品牌', '品牌設計', '品牌策略'],
  ['老闆', '企業主', '負責人', '總經理', '董事長', '創辦人', '中小企業'],
  ['家族企業', '二代', '接班', '傳承'],
  ['人資', '人力資源', '招募', '獵頭'],
  ['物理治療', '復健'],
  ['醫美', '醫學美容', '微整'],
  ['美業', '美髮', '美甲', '美睫', '沙龍'],
  ['芳療', '精油'],
  ['理財', '財務規劃', '資產配置', '財富傳承'],
  ['投資', '融資', '貸款'],
  ['攝影', '攝影師', '拍攝', '錄影'],
  ['教育', '培訓', '課程', '講師'],
  ['餐飲', '餐廳', '美食'],
  ['電商', '網路購物', '網購'],
  ['禮品', '禮贈品', '贈品'],
  ['高資產', '高淨值'],
];

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

// Expand a query keyword into itself + tight synonym terms.
//  • exact group membership:        法律 → {律師, 訴訟, 法務}
//  • query CONTAINS a group term:   法律服務 → 法律 → {律師, …}
// We deliberately do NOT expand when a group term merely contains the
// query (e.g. 設計 ⊂ 室內設計) — substring matching already covers that,
// and expanding it would over-broaden the results.
function expandKeyword(k) {
  const lk = k.toLowerCase().trim();
  const terms = new Set([lk]);
  if (SYN_INDEX.has(lk)) SYN_INDEX.get(lk).forEach(t => terms.add(t));
  for (const [term, group] of SYN_INDEX) {
    if (term.length >= 2 && lk.includes(term)) {
      group.forEach(t => terms.add(t));
    }
  }
  return [...terms];
}

// Field weighting. profession = the strongest "this person IS X" signal,
// so it must outrank tags / wants. tags & wantMeet are noisier (they often
// hold *desired-client* keywords — a mover tagging "裝潢" because he wants
// renovation clients), so they sit lower; wantReferral is lowest.
const FIELD_WEIGHTS = [
  ['profession', 5],
  ['have', 3],
  ['tags', 2], ['wantMeet', 2],
  ['name', 1], ['branch', 1], ['wantReferral', 1],
];

function memberFields(member) {
  return {
    profession:   (member.profession || '').toLowerCase(),
    tags:         (member.tags || []).join(' ').toLowerCase(),
    have:         (member.have || '').toLowerCase(),
    wantMeet:     (member.wantMeet || '').toLowerCase(),
    name:         (member.name || '').toLowerCase(),
    branch:       (member.branch || '').toLowerCase(),
    wantReferral: (member.wantReferral || '').toLowerCase(),
  };
}

export function searchMembers(keywords) {
  if (!keywords || keywords.length === 0) return [];
  const kws = keywords.map(k => String(k).trim()).filter(k => k.length >= 2);
  if (kws.length === 0) return [];
  const expanded = kws.map(k => ({ kw: k, terms: expandKeyword(k) }));

  const results = [];
  for (const member of getMembers()) {
    const f = memberFields(member);
    let score = 0;
    const matched = [];
    for (const { kw, terms } of expanded) {
      let best = 0;
      for (const [field, w] of FIELD_WEIGHTS) {
        if (w > best && terms.some(t => f[field].includes(t))) best = w;
      }
      if (best > 0) { score += best; matched.push(kw); }
    }
    if (matched.length > 0) {
      results.push({ ...member, matchedKeywords: matched, _score: score });
    }
  }

  return results.sort((a, b) =>
    b._score - a._score ||
    b.matchedKeywords.length - a.matchedKeywords.length ||
    a.name.localeCompare(b.name, 'zh-TW')
  );
}

// Soft fallback so the user is NEVER shown an empty screen.
// Ranks by single-character overlap with the query (loose thematic link),
// then fills with profession-diverse members. Deterministic.
export function getSuggestions(keywords = [], excludeIds = new Set(), need = 3) {
  const chars = new Set();
  keywords.forEach(k => {
    for (const c of String(k)) if (/[㐀-鿿]/.test(c)) chars.add(c.toLowerCase());
  });

  const avail = getMembers().filter(m => !excludeIds.has(memberId(m)));
  const softScore = m => {
    const text = [m.profession, (m.tags || []).join(' '), m.have, m.wantMeet]
      .join(' ').toLowerCase();
    let s = 0;
    chars.forEach(c => { if (text.includes(c)) s++; });
    return s;
  };
  const ranked = avail
    .map(m => ({ m, s: softScore(m) }))
    .sort((a, b) => b.s - a.s || a.m.name.localeCompare(b.m.name, 'zh-TW'));

  const picked = [];
  const profs = new Set();
  for (const { m } of ranked) {                 // first pass: diverse professions
    if (picked.length >= need) break;
    if (profs.has(m.profession)) continue;
    picked.push(m); profs.add(m.profession);
  }
  for (const { m } of ranked) {                 // top up if dedupe left us short
    if (picked.length >= need) break;
    if (!picked.includes(m)) picked.push(m);
  }
  return picked.slice(0, need).map(m => ({ ...m, matchedKeywords: [] }));
}

export function getMembersByBranch(branchName) {
  return getMembers().filter(m => m.branch === branchName);
}

export function getAllMembers() {
  return [...getMembers()];
}
