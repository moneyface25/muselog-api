// api/museums-near.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { city, radius = 5000 } = req.query;

  if (!city) {
    return res.status(400).json({ error: "city is required" });
  }

  try {
    // 本来はここで OSM API 等を呼ぶ処理を実装
    // 今はダミーデータを返す
    res.status(200).json({
      city,
      museums: [
        {
          id: "1",
          name: "ダミー美術館",
          lat: 35.68,
          lng: 139.76,
          addr: "東京都千代田区丸の内1-1",
          website: "https://example.com",
          wikipedia: "Tokyo_National_Museum",
          opening_hours: "9:00-17:00",
        },
      ],
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "internal error" });
  }
}
