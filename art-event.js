// api/art-events.js
export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const city = (url.searchParams.get("city") || "Tokyo").trim();

    // まずはダミーデータ（動作確認用）
    const events = [
      {
        id: "evt1",
        city,
        title: "印象派の光と影展",
        museum: `${city} City Museum`,
        date: "開催中（〜10/31）",
        url: "https://example.com/exhibition-1",
        note: "モネ／ルノワールを中心に約80点。初心者にもおすすめ。",
      },
      {
        id: "evt2",
        city,
        title: "近代写真のはじまり",
        museum: `${city} Photography Center`,
        date: "開催中（〜11/15）",
        url: "https://example.com/exhibition-2",
        note: "19〜20世紀の写真表現の変遷を辿る企画展。",
      },
      {
        id: "evt3",
        city,
        title: "ルネサンスへの旅",
        museum: `${city} Art Gallery`,
        date: "今週末まで",
        url: "https://example.com/exhibition-3",
        note: "フィレンツェ派の素描・版画を含む小企画。",
      },
    ];

    return res.status(200).json({ city, events });
  } catch (e) {
    console.error("[art-events] error", e);
    return res.status(200).json({ city: "unknown", events: [] });
  }
}
