const SEARCH_TIMEOUT_MS = 8000;

export async function getKeywordsFromAI(input) {
  if (!input || input.trim().length < 2) return localExtract(input);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: input.trim() }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.keywords) && data.keywords.length > 0) {
      return data.keywords;
    }
    throw new Error("empty keywords");
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('AI search failed, using local extract:', err.message);
    }
    return localExtract(input);
  }
}

const STOP_WORDS = new Set([
  "我","是","做","的","想","找","認識","有","可以","幫","也","或","和","以及",
  "需要","提供","給","對","這","那","什麼","樣","公司","廠商","了","就","都",
  "才","會","要","在","一","個","人","很","不","大","小","多","少","高","低",
  "希望","想要","尋找","合作","推薦","引薦","認識","了解","接觸","一個","可以",
  "我是","我做","我在","我有","我想","我需","也想","或是","以及","並且"
]);

// Common BNI profession/industry keywords for sliding-window extraction
const BNI_KEYWORDS = [
  "律師","會計師","記帳士","稅務","保險","不動產","室內設計","廣告","行銷","科技",
  "醫療","健康","美業","餐飲","教育","培訓","顧問","金融","理財","建設","開發",
  "貿易","人力資源","活動企劃","企業主","老闆","董事長","總經理","高資產","財務",
  "創業","新創","中小企業","家族企業","二代","接班","傳承","投資","融資","貸款",
  "電商","網路","數位","品牌","公關","媒體","設計","工程","製造","進出口"
];

function localExtract(input) {
  if (!input) return [];

  // First: try to find known BNI keywords in the input
  const found = BNI_KEYWORDS.filter(kw => input.includes(kw));

  // Also split by punctuation and filter stop words
  const splitWords = input
    .replace(/[，。！？,.!?、；：\s\n\r]/g, " ")
    .split(" ")
    .map(w => w.trim())
    .filter(w => w.length >= 2 && w.length <= 8 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

  // Combine, deduplicate, prefer shorter/more specific terms
  const combined = [...new Set([...found, ...splitWords])];
  return combined.slice(0, 6);
}
