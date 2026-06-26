import {
  normalizeIntent,
  parseStructuredInput,
  mergeIntent,
  intentIsEmpty,
  extractSeekFromPlainText,
} from './searchIntent.js';

const SEARCH_TIMEOUT_MS = 28000;
const MIN_THINKING_MS = 4500;

/**
 * @param {string} input
 * @returns {Promise<import('./searchIntent.js').SearchIntent>}
 */
export async function getSearchIntentFromAI(input) {
  const structured = parseStructuredInput(input);
  if (!input || input.trim().length < 2) return structured;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    const res = await fetch('/api/ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: input.trim() }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.ok && !intentIsEmpty(data)) {
      const merged = mergeIntent(data, structured);
      if (typeof data.analysis === 'string' && data.analysis.trim()) {
        merged.analysis = data.analysis.trim().slice(0, 400);
      }
      if (Array.isArray(data.thinking_steps) && data.thinking_steps.length) {
        merged.thinking_steps = data.thinking_steps
          .filter(s => typeof s === 'string' && s.trim().length >= 4)
          .map(s => s.trim().slice(0, 120))
          .slice(0, 3);
      }
      return merged;
    }
    throw new Error('empty intent');
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('AI search failed, using local intent:', err.message);
    }
    return mergeIntent(structured, localExtractIntent(input));
  }
}

/** @deprecated use getSearchIntentFromAI */
export async function getKeywordsFromAI(input) {
  const intent = await getSearchIntentFromAI(input);
  return [...intent.iSeek, ...intent.iAm, ...intent.iOffer].slice(0, 8);
}

export { MIN_THINKING_MS };

const STOP_WORDS = new Set([
  '我', '是', '做', '的', '想', '找', '認識', '有', '可以', '幫', '也', '或', '和', '以及',
  '需要', '提供', '給', '對', '這', '那', '什麼', '樣', '了', '就', '都',
  '才', '會', '要', '在', '一', '個', '人', '很', '不', '大', '小', '多', '少', '高', '低',
  '希望', '想要', '尋找', '合作', '推薦', '引薦', '了解', '接觸', '我是', '我做', '我在',
  '我有', '我想', '我需', '也想', '或是', '並且', '以及', '類型', '對象', '夥伴',
]);

const BNI_KEYWORDS = [
  '律師', '會計師', '記帳士', '稅務', '保險', '不動產', '室內設計', '廣告', '行銷', '科技',
  '醫療', '醫美', '診所', '健康', '美業', '餐飲', '教育', '培訓', '顧問', '金融', '理財', '建設', '開發',
  '貿易', '人力資源', '活動企劃', '企業主', '老闆', '董事長', '總經理', '高資產', '財務',
  '創業', '新創', '中小企業', '家族企業', '二代', '接班', '傳承', '投資', '融資', '貸款',
  '電商', '網路', '數位', '品牌', '公關', '媒體', '設計', '工程', '製造', '進出口', '統包',
  '裝修', '建商', '創辦人', '負責人', '決策者', '保健食品', '餐廳', '室內裝修', '美容醫學', '整形',
];

function localExtractIntent(input) {
  const fromStructure = parseStructuredInput(input);
  if (fromStructure.iSeek.length) return fromStructure;

  const extracted = extractSeekFromPlainText(input);
  if (extracted.iSeek.length) return mergeIntent(fromStructure, extracted);

  const found = BNI_KEYWORDS.filter(kw => input.includes(kw));
  const splitWords = input
    .replace(/[，。！？,.!?、；：\s\n\r【】]/g, ' ')
    .split(' ')
    .map(w => w.trim())
    .filter(w => w.length >= 2 && w.length <= 8 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

  const seek = [...new Set([...found, ...splitWords])].slice(0, 6);
  const iAm = [];
  const beforeSeek = input.split(/想要找|想找|想認識|想合作|尋找|我要找|需要找/)[0] || '';
  for (const kw of BNI_KEYWORDS) {
    if (beforeSeek.includes(kw) && /我是|我做|我從事|我的專業/.test(beforeSeek)) {
      iAm.push(kw);
    }
  }

  const exclude = [];
  const exMatch = input.match(/不要([^。\n]+)/);
  if (exMatch) {
    exclude.push(...exMatch[1].split(/[，,、]/).map(s => s.trim()).filter(s => s.length >= 2));
  }

  return normalizeIntent({ iAm, iSeek: seek, exclude });
}
