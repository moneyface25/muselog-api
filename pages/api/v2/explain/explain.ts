// pages/api/v2/explain.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ marker: "EXPLAIN v2.1 - alive (pages)" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { title = "", artist = "" } = (req.body ?? {}) as { title?: string; artist?: string };
  return res.status(200).json({
    author: artist,
    era: "Unknown",
    art_info: `ECHO: "${title}" by "${artist}"`,
    _received: { title, artist },
    marker: "EXPLAIN v2.1 - echo (pages)",
  });
}
