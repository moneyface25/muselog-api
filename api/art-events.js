export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const city = (url.searchParams.get("city") || "Tokyo").trim();
  return res.status(200).json({
    city,
    events: [{ id:"evt1", city, title:"ダミー展", museum:`${city} Museum`, date:"開催中", url:"https://example.com" }]
  });
}
