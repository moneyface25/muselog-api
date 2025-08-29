// muselog-api/api/museums-near.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

async function geocodeCity(city: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", city);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  // polite usage
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "muselog/1.0 (education app)" },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const arr = await res.json();
  if (!arr?.length) throw new Error("CITY_NOT_FOUND");
  return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), display_name: arr[0].display_name };
}

async function overpassMuseums(lat: number, lon: number, radius: number) {
  // tourism=museum を半径内で検索（node/way/relation）
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
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const json = await res.json();
  const items = (json.elements || []).map((el: any) => {
    const latlon = el.type === "node" ? { lat: el.lat, lon: el.lon } : { lat: el.center?.lat, lon: el.center?.lon };
    return {
      id: `${el.type}/${el.id}`,
      name: el.tags?.name || el.tags?.["name:en"] || el.tags?.["name:ja"] || "（名称不明）",
      lat: latlon.lat,
      lng: latlon.lon,
      addr: el.tags?.["addr:city"] || el.tags?.["addr:full"] || "",
      website: el.tags?.website || el.tags?.url || "",
      wikipedia: el.tags?.wikipedia || "",
      wikidata: el.tags?.wikidata || "",
      opening_hours: el.tags?.opening_hours || "",
    };
  }).filter((x: any) => x.lat && x.lng);
  // 重複名を軽くまとめる
  const uniq = new Map<string, any>();
  for (const it of items) {
    const key = `${it.name}-${Math.round(it.lat*1000)}-${Math.round(it.lng*1000)}`;
    if (!uniq.has(key)) uniq.set(key, it);
  }
  return Array.from(uniq.values());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const city = (req.query.city as string) || "";
    const radius = Math.min(parseInt((req.query.radius as string) || "5000", 10) || 5000, 20000); // 最大20km
    if (!city) return res.status(400).json({ error: "city is required" });

    const geo = await geocodeCity(city);
    const list = await overpassMuseums(geo.lat, geo.lon, radius);

    res.status(200).json({
      city: geo.display_name,
      center: { lat: geo.lat, lon: geo.lon },
      radius,
      count: list.length,
      museums: list,
    });
  } catch (e: any) {
    const msg = e?.message || "UNKNOWN";
    const code = msg === "CITY_NOT_FOUND" ? 404 : 500;
    res.status(code).json({ error: msg });
  }
}
