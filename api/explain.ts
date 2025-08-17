// api/explain.ts  (Vercel Serverless Function / Nodeランタイム)
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { imageBase64, memo, locale = "ja" } = req.body || {};
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set" });
    }

    // メッセージ（教育向け・やさしく正確に）
    const system = `あなたは美術の教育ガイドです。初心者にも分かりやすく、推測は推測と明記し、200〜300字で簡潔に解説します。`;
    const userText = `補足メモ: ${memo || "なし"} / 言語: ${locale}`;

    // 画像があれば vision 入力にする（なければテキストのみ）
    const userContent: any = [{ type: "text", text: userText }];
    if (imageBase64) {
      const dataUrl = `data:image/jpeg;base64,${imageBase64}`;
      userContent.push({
        type: "image_url",
        image_url: { url: dataUrl }
      });
    }

    // OpenAI Chat Completions を利用（gpt-4o-mini で高速＆安価）
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent }
        ],
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return res.status(500).json({ error: t || "OpenAI API error" });
    }
    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";

    // アプリ側の期待フォーマット（前回のUIに合わせる）
    // 簡易分解：要点を「見どころ」に3点抽出（失敗時は空配列）
    const lookPoints = (text.match(/・.+/g) || []).slice(0, 3).map(s => s.replace(/^・\s?/, ""));

    return res.status(200).json({
      summary: text,
      look_points: lookPoints,
      certainty: 0.6, // ダミー値（必要ならプロンプトで推定させる）
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "unknown error" });
  }
}
