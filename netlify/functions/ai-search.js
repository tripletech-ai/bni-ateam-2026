import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你是 BNI 年會現場的商務媒合助理。根據使用者輸入，提取最適合搜尋 BNI 夥伴名單的中文關鍵字。

名單涵蓋行業：法律、會計記帳、稅務、保險、不動產、室內設計裝修、廣告行銷、科技IT、醫療健康美業、餐飲、教育培訓企業顧問、金融理財、建設開發、進出口貿易、人力資源、活動企劃。

回傳規則（請嚴格遵守）：
1. 只回傳純 JSON：{"keywords":["關鍵字1","關鍵字2",...]}，不含任何其他文字
2. 提取 4 到 6 個關鍵字
3. 同時涵蓋：使用者的身分/專業 + 使用者想找的對象類型
4. 每個關鍵字 2 到 5 個中文字，使用台灣商業慣用語
5. 優先選擇能比對到「我有的資源」「想認識的對象」欄位的詞彙
6. 範例：用戶說「我是做財務規劃的，想找有傳承需求的家族企業」→ {"keywords":["財務規劃","理財","家族企業","資產傳承","企業主","高資產"]}`;

export default async (req) => {
  // CORS headers
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

  // Sanitize input — limit length, strip control characters
  const sanitizedInput = input.trim().substring(0, 300).replace(/[\x00-\x1F\x7F]/g, " ");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 150,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: sanitizedInput }
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    let keywords = [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.keywords)) {
        // Validate and sanitize each keyword
        keywords = parsed.keywords
          .filter(k => typeof k === "string" && k.length >= 2 && k.length <= 20)
          .slice(0, 8);
      }
    } catch {
      // JSON parse failed — basic fallback
      keywords = sanitizedInput
        .replace(/[，。！？,.!?\s]/g, " ")
        .split(" ")
        .filter(w => w.length >= 2)
        .slice(0, 5);
    }

    if (keywords.length === 0) {
      return Response.json(
        { ok: false, message: "無法提取關鍵字" },
        { status: 422, headers: corsHeaders }
      );
    }

    return Response.json(
      { ok: true, keywords },
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
