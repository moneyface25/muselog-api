// pages/api/v2/explain.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ```json ... ``` を剥がす
const unwrapJson = (s: string) => {
  const m = s?.match(/^[\s]*```(?:json)?\s*([\s\S]*?)\s*```[\s]*$/i);
  return m ? m[1] : s;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ marker: "EXPLAIN v2 - alive (pages)" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { title = "", artist = "", locale = "ja" } =
      (req.body ?? {}) as { title?: string; artist?: string; locale?: string };

    if (!title || !artist) {
      return res.status(400).json({ error: "title and artist are required" });
    }

    const system =
`あなたは美術解説の専門家です。
必ず JSON オブジェクトのみ（author, era, art_info）を返してください。
解説は与えられたタイトルと作家に厳密に紐づく内容のみ。国の一般論だけの説明は禁止。
不確かな場合は era="Unknown"、art_info="作品情報を特定できませんでした。" とする。
art_info は${locale}で150〜220字。余計な文章やコードフェンスは禁止。`;

    const user =
`Title: ${title}
Artist: ${artist}
Output JSON keys: author (string), era (short string), art_info (${locale}).`;

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    let text = r.choices[0]?.message?.content ?? "{}";
    try { text = unwrapJson(text); } catch {}
    let data: any;
    try { data = JSON.parse(text); } catch { data = {}; }

    // フォールバックと“国の一般論”対策
    let author = (data.author ?? artist).toString().trim();
    let era = (data.era ?? "Unknown").toString().trim();
    let art_info = (data.art_info ?? "").toString().trim();

    const generic = /美術史において|国の美術|多様な美術運動|提供された情報が不足/i.test(art_info);
    if (!art_info || generic) {
      art_info = "作品情報を特定できませんでした。タイトルと作家名をご確認ください。";
    }

    return res.status(200).json({ author, era, art_info, _received: { title, artist } });
  } catch (err: any) {
    console.error("[API ERROR]", err);
    return res.status(500).json({ error: "AI request failed", detail: err?.message });
  }
}
