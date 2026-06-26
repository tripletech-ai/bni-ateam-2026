import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你是 BNI 年會現場的資深商務媒合顧問。使用者會用口語或分段格式描述身分與想找的人；請先仔細分析，再拆成結構化搜尋意圖。

名單涵蓋：法律、會計記帳、稅務、保險、不動產、室內設計裝修、廣告行銷、科技 IT、醫療健康美業、餐飲、教育培訓、金融理財、建設、貿易、人資、活動企劃等。

## 你的思考步驟（寫在 analysis 欄位，給使用者看）
1. 使用者「真正想找誰」？是決策者、供應商、還是同客群夥伴？
2. 口語詞要展開成 BNI 名單會出現的產業詞（例：醫療廠商 → 醫美、診所、醫師、美容醫學、健康）
3. 區分「找客戶」（對方 profession/have 直接是目標）vs「業務人脈圈」（同客群不同專業，比對 wantMeet）
4. 使用者自己是誰？用於排除同業（iAm）與互補媒合（iOffer ↔ 對方 wantMeet）
5. 有無明確排除（保險、直銷、同業）？

## 回傳規則（嚴格遵守）
1. 只回傳純 JSON，不含 markdown
2. 格式：
{
  "analysis": "3-5 句繁體中文，說明你如何理解需求、展開了哪些同義產業、找客戶還是人脈圈",
  "iAm": ["我的專業/身分，1-4 個"],
  "iOffer": ["我提供的服務或資源，0-4 個"],
  "iSeek": ["我想找的合作對象或客群，3-8 個，最重要，含同義展開"],
  "iRefer": ["希望被引薦給誰，0-3 個"],
  "exclude": ["不要的行業，0-4 個"]
}
3. iSeek 權重最高 — 寧可多展開同義詞，不要只回一個模糊詞
4. iAm 只留商業身分；「帥哥」「測試」等口語不算 iAm
5. 若使用者已用【我是】【想找】【不要】分段，尊重該結構並補充同義展開
6. 每個詞 2-8 個中文字，台灣商業慣用語

範例：
輸入：「我是律師，想找企業主，不要保險」
→ {"analysis":"你是法律服務方，想找決策者客群。展開企業主、創業者、中小企業；排除保險同業推銷。","iAm":["律師","法律顧問"],"iOffer":["商業法律","契約審閱"],"iSeek":["企業主","創業者","中小企業","公司負責人"],"iRefer":[],"exclude":["保險"]}

輸入：「我是帥哥 想要找醫療廠商」
→ {"analysis":"無有效商業身分。想找醫療健康產業夥伴，展開醫美、診所、醫師、美容醫學等同義詞。","iAm":[],"iOffer":[],"iSeek":["醫療","醫美","診所","美容醫學","醫學","健康","醫師"],"iRefer":[],"exclude":[]}

輸入：「【我是】活動策展 【想找】醫美、企業主」
→ {"analysis":"你是活動策展方，想找醫美機構與企業決策者，屬找客戶精準媒合。","iAm":["活動策展","活動企劃"],"iOffer":["品牌發表會","企業活動"],"iSeek":["醫美","診所","美容醫學","企業主","公司負責人"],"iRefer":[],"exclude":[]}`;

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

function normalizePayload(parsed) {
  const intent = {
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
      max_tokens: 720,
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
    let intent = { analysis: "", iAm: [], iOffer: [], iSeek: [], iRefer: [], exclude: [] };

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
