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
  "希望","想要","尋找","合作","推薦","引薦","認識","了解","接觸"
]);

function localExtract(input) {
  if (!input) return [];
  return [...new Set(
    input
      .replace(/[，。！？,.!?、；：\s\n\r]/g, " ")
      .split(" ")
      .map(w => w.trim())
      .filter(w => w.length >= 2 && !STOP_WORDS.has(w))
  )].slice(0, 5);
}
