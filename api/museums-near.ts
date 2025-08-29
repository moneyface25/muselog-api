// api/museums-near.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Non-JSON: ${text.slice(0,200)}`); }
}

async function geocodeCity(city: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", city);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "muselog/1.0 (education app)" },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const arr = await safeJson(res);
  if (!arr?.length) throw new Error("CITY_NOT_FOUND");
  return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), label: arr[0].display_name as string };
}

async function overpassMuseums(lat: number, lon: number, radius: number) {
  const q = `
[out:json][timeout:25];
(
  node["tourism"="museum"](around:${radius},${lat},${lon});
  way["tourism"="museum"](around:${radius},${lat},${lon});
  relation["tourism"="museum"](around:${radius},${lat},${lon});
);
out center tags;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain", "User-Agent": "muselog/1.0 (education app)" },
    body: q,
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const json = await safeJson(res);

  const items = (json.elements || [])
    .map((el: any) => {
      const center = el.type === "node" ? { lat: el.lat, lon: el.lon } : { lat: el.center?.lat, lon: el.center?.lon };
      if (!center.lat || !center.lon) return null;
      const name = el.tags?.name || el.tags?.["name:ja"] || el.tags?.["name:en"];
      return {
        id: `${el.type}/${el.id}`,
        name: name || "（名称不明）",
        lat: center.lat,
        lng: center.lon,
        addr: el.tags?.["addr:city"] || el.tags?.["addr:full"] || "",
        website: el.tags?.website || el.tags?.url || "",
        wikipedia: el.tags?.wikipedia || "",
        opening_hours: el.tags?.opening_hours || "",
      };
    })
    .filter(Boolean);

  // 軽く重複排除
  const uniq = new Map<string, any>();
  for (const it of items) {
    const k = `${it.name}-${Math.round(it.lat * 1000)}-${Math.round(it.lng * 1000)}`;
    if (!uniq.has(k)) uniq.set(k, it);
  }
  return Array.from(uniq.values());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const city = String(req.query.city || "");
  const radius = Math.min(parseInt(String(req.query.radius || "5000"), 10) || 5000, 20000);
  if (!city) return res.status(400).json({ error: "city is required" });

  try {
    const geo = await geocodeCity(city);
    let museums: any[] = [];
    try {
      museums = await overpassMuseums(geo.lat, geo.lon, radius);
    } catch (e: any) {
      console.error("[Overpass] failed:", e?.message);
      // フォールバック：結果なしで返す（クライアントは空一覧を表示）
      return res.status(200).json({
        city: geo.label,
        center: { lat: geo.lat, lon: geo.lon },
        radius,
        count: 0,
        museums: [],
        error: "overpass_failed",
      });
    }

    return res.status(200).json({
      city: geo.label,
      center: { lat: geo.lat, lon: geo.lon },
      radius,
      count: museums.length,
      museums,
    });
  } catch (e: any) {
    console.error("[museums-near] fatal:", e?.message);
    // 落とさない：空で返す
    return res.status(200).json({
      city,
      center: null,
      radius,
      count: 0,
      museums: [],
      error: e?.message || "unknown",
    });
  }
}
