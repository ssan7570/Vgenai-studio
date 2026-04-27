export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { apiKey, modelPath, input } = req.body;
  if (!apiKey) return res.status(400).json({ error: "API key required" });
  try {
    const createRes = await fetch(
      `https://api.replicate.com/v1/models/${modelPath}/predictions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      }
    );
    const prediction = await createRes.json();
    if (prediction.error || prediction.detail) {
      return res.status(400).json({ error: prediction.error || prediction.detail });
    }
    const predId = prediction.id;
    for (let i = 0; i < 150; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${predId}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      const data = await pollRes.json();
      if (data.status === "succeeded") {
        const url = Array.isArray(data.output) ? data.output[0] : data.output;
        return res.status(200).json({ url });
      }
      if (data.status === "failed") {
        return res.status(500).json({ error: data.error || "Generation failed" });
      }
    }
    return res.status(500).json({ error: "Timeout" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}

export const config = {
  api: { responseLimit: false, bodyParser: { sizeLimit: "10mb" } },
};
