// api/explain.js
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { memo, country, title, museum, locale } = req.body ?? {};
    const prompt = `
出力は必ずJSONのみ:
{"author":"…","era":"…","art_info":"…"}
- author: 作者（不明なら"不明"）
- era: 時代（制作年代・流派。推定可）
- art_info: 技法・特徴・見どころ（80〜150字）
手掛かり:
タイトル:${title ?? ""} / 美術館:${museum ?? ""} / メモ:${memo ?? ""} / 国:${country ?? ""}
`;
    const c = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "出力はJSONオブジェクトのみ。前置き禁止。" },
        { role: "user", content: prompt },
      ],
    });
    const text = c.choices[0]?.message?.content?.trim() || "{}";
    let json; try { json = JSON.parse(text); } catch { json = { author: "不明", era: "不明", art_info: text }; }
    res.status(200).json({
      author: json.author ?? "不明",
      era: json.era ?? "不明",
      art_info: json.art_info ?? "不明",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed", detail: String(e?.message ?? e) });
  }
}
