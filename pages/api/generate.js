export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { apiKey, modelPath, input } = req.body;
  if (!apiKey) return res.status(400).json({ error: "API key required" });
  try {
    const submitRes = await fetch(`https://queue.fal.run/${modelPath}`, {
      method: "POST",
      headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const submitted = await submitRes.json();
    if (submitted.error) throw new Error(submitted.error);
    const requestId = submitted.request_id;
    for (let i = 0; i < 150; i++) {
      await new Promise(r => setTimeout(r, 4000));
      const pollRes = await fetch(`https://queue.fal.run/${modelPath}/requests/${requestId}/status`, {
        headers: { "Authorization": `Key ${apiKey}` },
      });
      const status = await pollRes.json();
      if (status.status === "COMPLETED") {
        const resultRes = await fetch(`https://queue.fal.run/${modelPath}/requests/${requestId}`, {
          headers: { "Authorization": `Key ${apiKey}` },
        });
        const result = await resultRes.json();
        const url = result.video?.url || result.videos?.[0]?.url;
        if (!url) throw new Error("No video URL in response");
        return res.status(200).json({ url });
      }
      if (status.status === "FAILED") throw new Error("Generation failed");
    }
    throw new Error("Timeout");
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
export const config = { api: { responseLimit: false, bodyParser: { sizeLimit: "10mb" } } };
