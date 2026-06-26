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



const SEEK_MARKER_RE = /(?:想要找|想找|想認識|想合作|尋找|需要找|我要找)[：:，、\s]*/;

const SEEK_SPLIT_RE = /(?:想要找|想找|想認識|想合作|尋找|需要找|我要找)/;

const EXCLUDE_SPLIT = /(?:不要|排除|勿)/;

const IAM_PREFIX_RE = /^我是|^我做|^我從事|^我在做|^I'm\s*[:：]?\s*/i;



/** 口語身分，不算有效「我是」商業標籤 */

const IAM_NOISE_RE = /^(帥哥|美女|帥|美|新人|小白|路過|測試|試試|大家好|哈囉|你好)$/;



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

  return sanitizeIam(intent);

}



const SECTION_PATTERNS = [

  { key: 'iAm', re: /(?:【?\s*我是\s*】?|^我是[：:]\s*|^I'm\s*[:：]\s*)/i },

  { key: 'iOffer', re: /(?:【?\s*(?:我提供|客群|資源|我有的)\s*】?|^(?:我提供|客群|資源)[：:]\s*)/i },

  { key: 'iSeek', re: /(?:【?\s*(?:想要找|想找|想合作|想認識|合作對象|尋找)\s*】?|^(?:想要找|想找|想合作|想認識|合作對象|尋找)[：:]\s*)/i },

  { key: 'iRefer', re: /(?:【?\s*(?:引薦|可引薦)\s*】?|^(?:引薦|可引薦)[：:]\s*)/i },

  { key: 'exclude', re: /(?:【?\s*(?:不要|排除|勿)\s*】?|^(?:不要|排除|勿)[：:]\s*)/i },

];



function splitList(text) {

  return text

    .split(/[，,、；;\/\n|｜]+/)

    .map(s => s.trim())

    .filter(s => s.length >= 2);

}



/** 從整段文字拆出「我是」與「想找」區段（口語句型） */

export function extractSeekFromPlainText(text) {

  const intent = { ...EMPTY_INTENT };

  if (!text?.trim()) return intent;



  let body = text.trim();

  const exParts = body.split(EXCLUDE_SPLIT);

  if (exParts.length > 1) {

    intent.exclude.push(...splitList(exParts.slice(1).join('不要')));

    body = exParts[0];

  }



  const seekMatch = body.match(SEEK_MARKER_RE);

  if (seekMatch && seekMatch.index != null) {

    const before = body.slice(0, seekMatch.index).replace(IAM_PREFIX_RE, '').trim();

    const after = body.slice(seekMatch.index + seekMatch[0].length);

    if (before) intent.iAm.push(...splitList(before));

    intent.iSeek.push(...splitList(after));

  } else {

    const stripped = body.replace(IAM_PREFIX_RE, '').trim();

    if (/^我是/.test(body) && stripped) {

      intent.iAm.push(...splitList(stripped));

    } else {

      intent.iSeek.push(...splitList(body));

    }

  }



  return sanitizeIam(normalizeIntent(intent));

}



/** 清理 iAm 雜訊、把誤塞進 iAm 的「想找」拆回 iSeek */

export function sanitizeIam(intent) {

  const out = { ...EMPTY_INTENT, ...intent };

  const fixedIam = [];

  const extraSeek = [];



  for (const term of out.iAm) {

    if (IAM_NOISE_RE.test(term)) continue;

    if (SEEK_SPLIT_RE.test(term)) {

      const parts = term.split(SEEK_SPLIT_RE);

      const head = parts[0]?.trim();

      if (head && head.length >= 2 && !IAM_NOISE_RE.test(head)) fixedIam.push(head);

      extraSeek.push(...splitList(parts.slice(1).join(' ')));

      continue;

    }

    fixedIam.push(term);

  }



  out.iAm = KW(fixedIam);

  out.iSeek = KW([...out.iSeek, ...extraSeek]);

  out.iOffer = KW(out.iOffer);

  out.iRefer = KW(out.iRefer);

  out.exclude = KW(out.exclude);

  return out;

}



function repairSeekIfEmpty(intent, fullText) {

  if (intent.iSeek.length) return sanitizeIam(intent);

  const extracted = extractSeekFromPlainText(fullText);

  if (!extracted.iSeek.length) return sanitizeIam(intent);

  return sanitizeIam(normalizeIntent({

    iAm: intent.iAm.length ? intent.iAm : extracted.iAm,

    iOffer: intent.iOffer,

    iSeek: extracted.iSeek,

    iRefer: intent.iRefer.length ? intent.iRefer : extracted.iRefer,

    exclude: [...new Set([...intent.exclude, ...extracted.exclude])],

  }));

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

    return repairSeekIfEmpty(normalizeIntent(intent), text);

  }



  return extractSeekFromPlainText(text);

}



function heuristicSplit(text) {

  return extractSeekFromPlainText(text);

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


