import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你是 BNI 年會現場的商務媒合助理。使用者會描述自己的身分、客群、想合作的對象；請拆成結構化搜尋意圖（不是混在一起的一包關鍵字）。

名單涵蓋：法律、會計記帳、稅務、保險、不動產、室內設計裝修、廣告行銷、科技 IT、醫療健康美業、餐飲、教育培訓、金融理財、建設、貿易、人資、活動企劃等。

回傳規則（嚴格遵守）：
1. 只回傳純 JSON，不含 markdown 或其他文字
2. 格式：
{
  "iAm": ["我的專業/身分，1-3 個"],
  "iOffer": ["我提供的服務或資源，0-3 個，可空陣列"],
  "iSeek": ["我想找的合作對象或客群，2-5 個，最重要"],
  "iRefer": ["希望被引薦給誰，0-2 個，可空陣列"],
  "exclude": ["不要的行業，0-3 個，可空陣列"]
}
3. iAm = 使用者自己是誰（用於排除同業、做互補媒合）
4. iSeek = 使用者想見的「人」的類型（比對對方的 profession / have / 大產業），權重最高
5. iOffer = 使用者提供的價值（比對對方的 wantMeet — 對方是否在找這類人）
6. exclude = 使用者明確不要的行業（如保險、直銷）
7. 每個詞 2-6 個中文字，台灣商業慣用語
8. 若使用者已用【我是】【想找】【不要】分段，請尊重該結構
9. 「醫療廠商／醫療業者」在 BNI 語境常指診所、醫美、醫師、健康產業夥伴 — 請展開為 iSeek：醫療、醫美、診所、美容醫學、醫學、健康（不要只回「醫療廠商」一字）
10. 口語「我是帥哥／我是 XX 想要找 YY」：iAm 只留商業身分；YY 全部放 iSeek

範例 1：
輸入：「我是律師，提供商業法律顧問，想找企業主和創業者，不要保險」
→ {"iAm":["律師","法律顧問"],"iOffer":["商業法律","契約審閱"],"iSeek":["企業主","創業者","中小企業"],"iRefer":[],"exclude":["保險"]}

範例 2：
輸入：「我做室內設計，想找建商跟企業主裝修案源」
→ {"iAm":["室內設計"],"iOffer":["商空設計","住宅設計"],"iSeek":["建商","企業主","裝修"],"iRefer":[],"exclude":[]}

範例 3：
輸入：「我是理財顧問，想被引薦給有家族傳承需求的高資產家庭」
→ {"iAm":["理財顧問","財務規劃"],"iOffer":["資產配置","保單規劃"],"iSeek":["高資產","家族企業","傳承"],"iRefer":["家族企業主","二代"],"exclude":[]}

範例 4（醫療口語）：
輸入：「我是帥哥 想要找醫療廠商」
→ {"iAm":[],"iOffer":[],"iSeek":["醫療","醫美","診所","美容醫學","健康"],"iRefer":[],"exclude":[]}

範例 5（只填想找也可以）：
輸入：「【想找】醫美、診所、企業主」
→ {"iAm":[],"iOffer":[],"iSeek":["醫美","診所","企業主"],"iRefer":[],"exclude":[]}`;

function sanitizeTerms(arr, max = 8) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(k => typeof k === "string" && k.length >= 2 && k.length <= 20)
    .slice(0, max);
}

function normalizePayload(parsed) {
  const intent = {
    iAm: sanitizeTerms(parsed.iAm, 5),
    iOffer: sanitizeTerms(parsed.iOffer, 5),
    iSeek: sanitizeTerms(parsed.iSeek, 8),
    iRefer: sanitizeTerms(parsed.iRefer, 4),
    exclude: sanitizeTerms(parsed.exclude, 5),
  };
  if (!intent.iSeek.length && Array.isArray(parsed.keywords)) {
    intent.iSeek = sanitizeTerms(parsed.keywords, 8);
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

  const sanitizedInput = input.trim().substring(0, 400).replace(/[\x00-\x1F\x7F]/g, " ");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 220,
      temperature: 0.15,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: sanitizedInput },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    let intent = { iAm: [], iOffer: [], iSeek: [], iRefer: [], exclude: [] };

    try {
      const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
      intent = normalizePayload(parsed);
    } catch {
      intent.iSeek = sanitizedInput
        .replace(/[，。！？,.!?\s]/g, " ")
        .split(" ")
        .filter(w => w.length >= 2)
        .slice(0, 6);
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
