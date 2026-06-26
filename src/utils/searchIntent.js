/** @typedef {{ iAm: string[], iOffer: string[], iSeek: string[], iRefer: string[], exclude: string[] }} SearchIntent */

export const EMPTY_INTENT = /** @type {SearchIntent} */ ({
  iAm: [],
  iOffer: [],
  iSeek: [],
  iRefer: [],
  exclude: [],
});

const KW = (list) =>
  (list || [])
    .map(k => String(k || '').trim())
    .filter(k => k.length >= 2 && k.length <= 24);

/** Normalize AI / legacy payloads into SearchIntent */
export function normalizeIntent(raw) {
  if (!raw) return { ...EMPTY_INTENT };
  if (Array.isArray(raw)) {
    return { ...EMPTY_INTENT, iSeek: KW(raw) };
  }
  const intent = {
    iAm: KW(raw.iAm || raw.myRole || raw.identity || []),
    iOffer: KW(raw.iOffer || raw.myOffer || raw.offer || raw.customers || []),
    iSeek: KW(raw.iSeek || raw.seekRole || raw.seek || raw.keywords || []),
    iRefer: KW(raw.iRefer || raw.referral || raw.refer || []),
    exclude: KW(raw.exclude || raw.avoid || raw.not || []),
  };
  if (!intent.iSeek.length && Array.isArray(raw.keywords)) {
    intent.iSeek = KW(raw.keywords);
  }
  return intent;
}

const SECTION_PATTERNS = [
  { key: 'iAm', re: /(?:【?\s*我是\s*】?|^我是[：:]\s*|^I'm\s*[:：]\s*)/i },
  { key: 'iOffer', re: /(?:【?\s*(?:我提供|客群|資源|我有的)\s*】?|^(?:我提供|客群|資源)[：:]\s*)/i },
  { key: 'iSeek', re: /(?:【?\s*(?:想找|想合作|想認識|合作對象|尋找)\s*】?|^(?:想找|想合作|想認識|合作對象|尋找)[：:]\s*)/i },
  { key: 'iRefer', re: /(?:【?\s*(?:引薦|可引薦)\s*】?|^(?:引薦|可引薦)[：:]\s*)/i },
  { key: 'exclude', re: /(?:【?\s*(?:不要|排除|勿)\s*】?|^(?:不要|排除|勿)[：:]\s*)/i },
];

function splitList(text) {
  return text
    .split(/[，,、；;\/\n|｜]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2);
}

/** Parse user-structured textarea (【我是】…【想找】…) */
export function parseStructuredInput(input) {
  const intent = { ...EMPTY_INTENT };
  if (!input?.trim()) return intent;

  const text = input.trim();
  const hits = [];

  for (const { key, re } of SECTION_PATTERNS) {
    const m = text.match(re);
    if (m) hits.push({ key, index: m.index ?? 0, len: m[0].length });
  }

  if (hits.length) {
    hits.sort((a, b) => a.index - b.index);
    for (let i = 0; i < hits.length; i++) {
      const start = hits[i].index + hits[i].len;
      const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
      intent[hits[i].key].push(...splitList(text.slice(start, end)));
    }
    return normalizeIntent(intent);
  }

  return heuristicSplit(text);
}

const SEEK_SPLIT = /(?:想找|想認識|想合作|尋找|需要找|我要找|找)/;
const EXCLUDE_SPLIT = /(?:不要|排除|勿)/;

function heuristicSplit(text) {
  const intent = { ...EMPTY_INTENT };

  let body = text;
  const exParts = body.split(EXCLUDE_SPLIT);
  if (exParts.length > 1) {
    intent.exclude.push(...splitList(exParts.slice(1).join('不要')));
    body = exParts[0];
  }

  const parts = body.split(SEEK_SPLIT);
  if (parts.length > 1) {
    intent.iAm.push(...splitList(parts[0].replace(/^我是|^我做|^我從事|^我在做/, '')));
    intent.iSeek.push(...splitList(parts.slice(1).join(' ')));
  } else {
    intent.iSeek.push(...splitList(body));
  }

  return normalizeIntent(intent);
}

/** Flat keywords for legacy callers / display fallback */
export function intentKeywords(intent) {
  const n = normalizeIntent(intent);
  return [...new Set([...n.iAm, ...n.iOffer, ...n.iSeek, ...n.iRefer])];
}

export function intentIsEmpty(intent) {
  const n = normalizeIntent(intent);
  return !n.iAm.length && !n.iOffer.length && !n.iSeek.length && !n.iRefer.length;
}

export function mergeIntent(primary, fallback) {
  const a = normalizeIntent(primary);
  const b = normalizeIntent(fallback);
  return normalizeIntent({
    iAm: a.iAm.length ? a.iAm : b.iAm,
    iOffer: a.iOffer.length ? a.iOffer : b.iOffer,
    iSeek: a.iSeek.length ? a.iSeek : b.iSeek,
    iRefer: a.iRefer.length ? a.iRefer : b.iRefer,
    exclude: [...new Set([...a.exclude, ...b.exclude])],
  });
}
