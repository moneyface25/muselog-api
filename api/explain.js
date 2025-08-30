// api/explain.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { memo = "", country = "", locale = "ja" } = req.body || {};

    // APIキーがない場合はフォールバックで返す
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return res.status(200).json({
        author: "不明",
        era: "不明",
        art_info: "（AIキー未設定のため、解説は生成できませんでした）",
      });
    }

    const client = new OpenAI({ apiKey: key });

    const sys = `あなたは美術史の専門家です。ユーザーのメモと国情報を手がかりに、
以下の3項目を必ずJSONで返してください:
- author: 作者名（不明なら"不明"）
- era: 時代（例: ルネサンス / 印象派 / 不明）
- art_info: 100〜200字の解説`;
    const user = `メモ: ${memo}\n国: ${country}\n言語: ${locale}`;

    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.3,
    });

    const text = chat.choices?.[0]?.message?.content?.trim() || "";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { author: "不明", era: "不明", art_info: text || "（解説生成に失敗）" };
    }

    return res.status(200).json({
      author: parsed.author ?? "不明",
      era: parsed.era ?? "不明",
      art_info: parsed.art_info ?? "（解説生成に失敗）",
    });
  } catch (e) {
    console.error("[explain] error", e);
    return res.status(200).json({
      author: "不明",
      era: "不明",
      art_info: "（AI解説生成に失敗しました）",
    });
  }
}
