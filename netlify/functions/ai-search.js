import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你是 BNI 年會現場的資深商務媒合顧問。使用者會用口語或分段格式描述身分與想找的人；請先仔細分析，再拆成結構化搜尋意圖。

名單涵蓋：法律、會計記帳、稅務、保險、不動產、室內設計裝修、廣告行銷、科技 IT、醫療健康美業、餐飲、教育培訓（含魔術方塊、才藝、企業培訓）、金融理財、建設、貿易、人資、活動企劃等。

## 你的思考步驟（寫在 analysis 欄位，給使用者看）
1. 使用者「真正想找誰」？是決策者、供應商、還是同客群夥伴？
2. 口語詞要展開成 BNI 名單會出現的產業詞（例：醫療廠商 → 醫美、診所、醫師、美容醫學、健康）
3. 區分「直接對接」（對方 profession/have 是目標）vs「同客群結盟」（不同專業、比對 wantMeet）— 前端會合併顯示為「找合作」
4. 使用者自己是誰？用於排除同業（iAm）與互補媒合（iOffer ↔ 對方 wantMeet）
5. 有無明確排除（保險、直銷、同業）？

## 回傳規則（嚴格遵守）
1. 只回傳純 JSON，不含 markdown
2. 格式：
{
  "thinking_steps": [
    "第一層：一句話，說明你如何理解使用者真正想找誰",
    "第二層：一句話，列出你展開了哪些產業同義詞",
    "第三層：一句話，說明會怎麼媒合（直接對接／同客群結盟／引薦）"
  ],
  "analysis": "3-5 句繁體中文，綜合說明媒合策略（可與 thinking_steps 呼應但更完整）",
  "iAm": ["我的專業/身分，1-4 個"],
  "iOffer": ["我提供的服務或資源，0-4 個"],
  "iSeek": ["我想找的合作對象或客群，3-8 個，最重要，含同義展開"],
  "iRefer": ["希望被引薦給誰，0-3 個"],
  "exclude": ["不要的行業，0-4 個"]
}
3. thinking_steps 必須剛好 3 句，每句 15-40 字，給使用者看思考過程
4. iSeek 權重最高 — 寧可多展開同義詞，不要只回一個模糊詞
4. iAm 只留商業身分；「帥哥」「測試」等口語不算 iAm
5. 若使用者已用【我是】【想找】【不要】分段，尊重該結構並補充同義展開
6. 每個詞 2-8 個中文字，台灣商業慣用語

範例：
輸入：「我是律師，想找企業主，不要保險」
→ {"thinking_steps":["第一層：你是法律服務方，想找決策者客群。","第二層：展開企業主、創業者、中小企業、公司負責人。","第三層：精準媒合決策者，並排除保險同業推銷。"],"analysis":"你是法律服務方，想找決策者客群。展開企業主、創業者、中小企業；排除保險同業推銷。","iAm":["律師","法律顧問"],"iOffer":["商業法律","契約審閱"],"iSeek":["企業主","創業者","中小企業","公司負責人"],"iRefer":[],"exclude":["保險"]}

輸入：「我是帥哥 想要找醫療廠商」
→ {"thinking_steps":["第一層：無有效商業身分，核心需求是醫療健康產業夥伴。","第二層：展開醫美、診所、醫師、美容醫學、健康等同義詞。","第三層：以 iSeek 比對 profession/have，找可直接對接的醫療夥伴。"],"analysis":"無有效商業身分。想找醫療健康產業夥伴，展開醫美、診所、醫師、美容醫學等同義詞。","iAm":[],"iOffer":[],"iSeek":["醫療","醫美","診所","美容醫學","醫學","健康","醫師"],"iRefer":[],"exclude":[]}

輸入：「【我是】活動策展 【想找】醫美、企業主」
→ {"thinking_steps":["第一層：你是活動策展方，想找醫美機構與企業決策者。","第二層：展開醫美、診所、美容醫學、企業主、公司負責人。","第三層：精準媒合同客群夥伴，可結盟開發醫美與企業客戶。"],"analysis":"你是活動策展方，想找醫美機構與企業決策者合作，屬精準媒合。","iAm":["活動策展","活動企劃"],"iOffer":["品牌發表會","企業活動"],"iSeek":["醫美","診所","美容醫學","企業主","公司負責人"],"iRefer":[],"exclude":[]}

輸入：「【我是】魔術方塊教學 【我提供】魔術方塊課程、企業Team Building 【想找】教育機構、企業主、才藝補習班」
→ {"thinking_steps":["第一層：你是魔術方塊教育培訓方，想找學校、補習班與企業決策者。","第二層：展開教育、培訓、才藝、企業主、學校、補習班等同義詞。","第三層：精準媒合教育與企業客群，可結盟推廣才藝課程。"],"analysis":"你是魔術方塊教學與企業培訓服務方，想找教育機構與企業主合作。","iAm":["魔術方塊教學","教育培訓"],"iOffer":["魔術方塊課程","企業Team Building"],"iSeek":["教育機構","學校","補習班","才藝","企業主","公司負責人","企業培訓"],"iRefer":[],"exclude":[]}`;

function sanitizeTerms(arr, max = 10) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(k => typeof k === "string" && k.length >= 2 && k.length <= 24)
    .slice(0, max);
}

function sanitizeAnalysis(text) {
  if (typeof text !== "string") return "";
  return text.trim().replace(/\s+/g, " ").slice(0, 400);
}

function sanitizeThinkingSteps(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(s => typeof s === "string" && s.trim().length >= 4)
    .map(s => s.trim().replace(/\s+/g, " ").slice(0, 120))
    .slice(0, 3);
}

function normalizePayload(parsed) {
  const intent = {
    thinking_steps: sanitizeThinkingSteps(parsed.thinking_steps),
    analysis: sanitizeAnalysis(parsed.analysis),
    iAm: sanitizeTerms(parsed.iAm, 6),
    iOffer: sanitizeTerms(parsed.iOffer, 6),
    iSeek: sanitizeTerms(parsed.iSeek, 10),
    iRefer: sanitizeTerms(parsed.iRefer, 5),
    exclude: sanitizeTerms(parsed.exclude, 6),
  };
  if (!intent.iSeek.length && Array.isArray(parsed.keywords)) {
    intent.iSeek = sanitizeTerms(parsed.keywords, 10);
  }
  return intent;
}

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12;
const rateBuckets = globalThis.__bniAiSearchRate || new Map();
globalThis.__bniAiSearchRate = rateBuckets;

function clientIp(req) {
  return (
    req.headers.get("x-nf-client-connection-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown"
  );
}

function checkRateLimit(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  return bucket.count <= RATE_MAX;
}

export default async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const ip = clientIp(req);
  if (!checkRateLimit(ip)) {
    return Response.json(
      { ok: false, message: "請求過於頻繁，請稍後再試" },
      { status: 429, headers: corsHeaders }
    );
  }

  let input;
  try {
    const body = await req.json();
    input = body?.input;
  } catch {
    return Response.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400, headers: corsHeaders }
    );
  }

  if (!input || typeof input !== "string" || input.trim().length < 2) {
    return Response.json(
      { ok: false, message: "輸入太短" },
      { status: 400, headers: corsHeaders }
    );
  }

  const sanitizedInput = input.trim().substring(0, 500).replace(/[\x00-\x1F\x7F]/g, " ");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 900,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `請分析以下商務媒合需求，先寫 analysis 再填各欄位：\n\n${sanitizedInput}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    let intent = { thinking_steps: [], analysis: "", iAm: [], iOffer: [], iSeek: [], iRefer: [], exclude: [] };

    try {
      const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
      intent = normalizePayload(parsed);
    } catch {
      intent.iSeek = sanitizedInput
        .replace(/[，。！？,.!?\s]/g, " ")
        .split(" ")
        .filter(w => w.length >= 2)
        .slice(0, 8);
    }

    const hasContent =
      intent.iAm.length ||
      intent.iOffer.length ||
      intent.iSeek.length ||
      intent.iRefer.length;

    if (!hasContent) {
      const fallbackSeek = sanitizedInput
        .replace(/[，。！？,.!?\s【】]/g, ' ')
        .split(' ')
        .map(w => w.trim())
        .filter(w => w.length >= 2 && w.length <= 16)
        .slice(0, 8);
      if (fallbackSeek.length) {
        intent.iSeek = sanitizeTerms(fallbackSeek, 10);
      }
    }

    const hasContentAfterFallback =
      intent.iAm.length ||
      intent.iOffer.length ||
      intent.iSeek.length ||
      intent.iRefer.length;

    if (!hasContentAfterFallback) {
      return Response.json(
        { ok: false, message: "無法提取媒合意圖" },
        { status: 422, headers: corsHeaders }
      );
    }

    return Response.json(
      { ok: true, ...intent },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("OpenAI API error:", err.message);
    return Response.json(
      { ok: false, message: "AI 服務暫時無法使用" },
      { status: 503, headers: corsHeaders }
    );
  }
};

export const config = { path: "/api/ai-search" };
