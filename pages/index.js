import { useState, useRef } from "react";
import Head from "next/head";

const MODELS = [
  { id: "wan-t2v", label: "Wan 2.1", icon: "🌊", desc: "8s", color: "#00f5d4", maxSec: 8, supports: ["text"], path: "wan-ai/wan2.1-t2v-480p", inp: ({ p, n, f }) => ({ prompt: p, negative_prompt: n, num_frames: f }) },
  { id: "wan-i2v", label: "Wan I2V", icon: "🖼️", desc: "8s", color: "#a855f7", maxSec: 8, supports: ["image"], path: "wan-ai/wan2.1-i2v-480p", inp: ({ p, n, f, img }) => ({ prompt: p, negative_prompt: n, num_frames: f, image: img }) },
  { id: "kling", label: "Kling 1.6", icon: "⚡", desc: "10s", color: "#ff6b35", maxSec: 10, supports: ["text", "image"], path: "kwaivgi/kling-v1.6-pro", inp: ({ p, n, img, ar }) => ({ prompt: p, negative_prompt: n, duration: "10", aspect_ratio: ar, ...(img ? { image: img } : {}) }) },
  { id: "kling-ext", label: "Kling×2", icon: "🎬", desc: "20s", color: "#ffd700", maxSec: 20, supports: ["text", "image"], extended: true, path: "kwaivgi/kling-v1.6-pro", inp: ({ p, n, img, ar }) => ({ prompt: p, negative_prompt: n, duration: "10", aspect_ratio: ar, ...(img ? { image: img } : {}) }) },
];

function wc(s) { return s.trim() === "" ? 0 : s.trim().split(/\s+/).length; }

export default function Home() {
  const [key, setKey] = useState("");
  const [showK, setShowK] = useState(false);
  const [mode, setMode] = useState("text");
  const [mid, setMid] = useState("kling-ext");
  const [prompt, setPrompt] = useState("");
  const [neg, setNeg] = useState("blurry, low quality, distorted, watermark");
  const [img, setImg] = useState(null);
  const [imgP, setImgP] = useState(null);
  const [ar, setAr] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [pct, setPct] = useState(0);
  const [seg, setSeg] = useState(0);
  const [clips, setClips] = useState([]);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const fRef = useRef();

  const model = MODELS.find(m => m.id === mid);
  const words = wc(prompt);

  function pickM(id) {
    setMid(id);
    const m = MODELS.find(x => x.id === id);
    if (!m.supports.includes(mode)) setMode(m.supports[0]);
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = e => { setImg(e.target.result); setImgP(e.target.result); };
    r.readAsDataURL(file);
  }

  async function callAPI(path, input) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key, modelPath: path, input }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "API error");
    return data.url;
  }

  async function generate() {
    if (!key.trim()) { setErr("Add your Replicate API key first!"); setShowK(true); return; }
    if (!prompt.trim()) { setErr("Please enter a prompt!"); return; }
    if (mode === "image" && !img) { setErr("Please upload an image!"); return; }
    setLoading(true); setErr(""); setClips([]); setPct(0); setSeg(0);
    const args = { p: prompt, n: neg, img: mode === "image" ? img : undefined, f: 121, ar };
    try {
      if (model.extended) {
        const out = [];
        for (let i = 0; i < 2; i++) {
          setSeg(i); setStatus("Generating clip " + (i + 1) + " of 2..."); setPct(i * 50);
          const url = await callAPI(model.path, model.inp(args));
          out.push({ url, label: "Clip " + (i + 1) + " · 10s" });
          setClips([...out]); setPct(i === 0 ? 50 : 100);
        }
        setStatus("Both clips ready — 20 seconds!");
      } else {
        setStatus("Generating your video...");
        const url = await callAPI(model.path, model.inp(args));
        setClips([{ url, label: model.label + " · " + model.maxSec + "s" }]);
        setPct(100); setStatus("Video ready!");
      }
    } catch (e) {
      setErr(e.message || "Something went wrong");
      setStatus("");
    }
    setLoading(false);
  }

  const S = {
    app: { minHeight: "100vh", background: "#050508", fontFamily: "system-ui, sans-serif", color: "#e8e8f0", padding: "0 16px 60px" },
    wrap: { maxWidth: 800, margin: "0 auto" },
    header: { padding: "24px 0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    logoBox: { display: "flex", alignItems: "center", gap: 12 },
    logoIcon: { width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#00f5d4,#7928ca)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
    logoText: { fontWeight: 900, fontSize: 22, color: "#fff" },
    logoSub: { fontSize: 9, color: "#555", letterSpacing: 3 },
    card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 22, marginBottom: 14 },
    lbl: { fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 },
    mgrid: { display: "flex", gap: 8 },
    mcard: (active, color) => ({ flex: 1, padding: "12px 6px", borderRadius: 12, border: "2px solid " + (active ? color : "rgba(255,255,255,0.08)"), background: active ? "rgba(0,245,212,0.07)" : "transparent", cursor: "pointer", textAlign: "center", fontFamily: "inherit" }),
    mrow: { display: "flex", gap: 8, marginBottom: 14 },
    mbtn: (active) => ({ flex: 1, padding: 11, border: "1px solid " + (active ? "#00f5d4" : "rgba(255,255,255,0.1)"), borderRadius: 12, background: active ? "rgba(0,245,212,0.1)" : "transparent", color: active ? "#00f5d4" : "#666", fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer" }),
    uzone: (d) => ({ border: "2px dashed " + (d ? "rgba(0,245,212,0.7)" : "rgba(0,245,212,0.25)"), borderRadius: 16, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: d ? "rgba(0,245,212,0.06)" : "transparent" }),
    pta: { width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#e8e8f0", fontFamily: "inherit", fontSize: 14, resize: "vertical", outline: "none", minHeight: 200, lineHeight: 1.7 },
    extb: { background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 11, padding: "11px 14px", marginBottom: 16, display: "flex", gap: 9, alignItems: "center" },
    bgen: (dis) => ({ width: "100%", padding: 16, border: "none", borderRadius: 14, background: dis ? "#2a2a3a" : "linear-gradient(135deg,#00f5d4,#7928ca,#ff0080)", color: "#fff", fontFamily: "inherit", fontWeight: 800, fontSize: 15, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.5 : 1 }),
    ebox: { background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.25)", borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 13, color: "#ff8080" },
    badge: { display: "inline-flex", padding: "3px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", background: "rgba(255,215,0,0.1)", color: "#ffd700", border: "1px solid rgba(255,215,0,0.25)" },
    dlbtn: { padding: "6px 14px", borderRadius: 9, fontSize: 11, fontWeight: 700, background: "rgba(0,245,212,0.12)", border: "1px solid rgba(0,245,212,0.25)", color: "#00f5d4", textDecoration: "none" },
  };

  return (
    <>
      <Head>
        <title>VGENAI Studio</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>
      <div style={S.app}>
        <div style={S.wrap}>

          <div style={S.header}>
            <div style={S.logoBox}>
              <div style={S.logoIcon}>⚡</div>
              <div>
                <div style={S.logoText}><span style={{ color: "#00f5d4" }}>VGEN</span>AI</div>
                <div style={S.logoSub}>VIDEO GENERATION STUDIO</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={S.badge}>🎬 20s</span>
              <button onClick={() => setShowK(!showK)} style={{ width: 38, height: 38, borderRadius: 10, cursor: "pointer", fontSize: 16, border: "1px solid " + (key ? "rgba(0,245,212,0.3)" : "rgba(255,80,80,0.3)"), background: key ? "rgba(0,245,212,0.1)" : "rgba(255,80,80,0.1)" }}>🔑</button>
            </div>
          </div>

          {showK && (
            <div style={{ ...S.card, borderColor: "rgba(255,80,80,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#ff7070" }}>🔑 Replicate API Key</span>
                <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer" style={{ marginLeft: "auto", fontSize: 12, color: "#00f5d4", textDecoration: "none" }}>Get free →</a>
              </div>
              <input type="password" placeholder="r8_xxx..." value={key} onChange={e => setKey(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 11, color: "#e8e8f0", fontSize: 12, outline: "none", fontFamily: "monospace" }} />
              <p style={{ fontSize: 11, color: "#555", marginTop: 7 }}>🔒 Memory only. Free account = ~$5 credits</p>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={S.lbl}>SELECT MODEL</div>
            <div style={S.mgrid}>
              {MODELS.map(m => (
                <button key={m.id} style={S.mcard(mid === m.id, m.color)} onClick={() => pickM(m.id)}>
                  <div style={{ fontSize: 20, marginBottom: 3 }}>{m.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: mid === m.id ? m.color : "#777" }}>{m.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: m.id === "kling-ext" ? "#ffd700" : "#555", marginTop: 2 }}>{m.desc}</div>
                  {m.id === "kling-ext" && <div style={{ fontSize: 9, color: "#ffd700", letterSpacing: 1 }}>2 CLIPS</div>}
                </button>
              ))}
            </div>
          </div>

          {model && model.supports.length > 1 && (
            <div style={S.mrow}>
              <button style={S.mbtn(mode === "text")} onClick={() => setMode("text")}>✍️ Text → Video</button>
              <button style={S.mbtn(mode === "image")} onClick={() => setMode("image")}>🖼️ Image → Video</button>
            </div>
          )}

          <div style={S.card}>
            {mode === "image" && (
              <div style={{ marginBottom: 18 }}>
                <div style={S.lbl}>UPLOAD IMAGE</div>
                {imgP ? (
                  <div style={{ position: "relative" }}>
                    <img src={imgP} alt="preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(0,245,212,0.3)", display: "block" }} />
                    <button onClick={() => { setImg(null); setImgP(null); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.75)", border: "none", borderRadius: 7, color: "#fff", padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
                  </div>
                ) : (
                  <div style={S.uzone(drag)}
                    onClick={() => fRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}>
                    <div style={{ fontSize: 36 }}>📷</div>
                    <div style={{ fontWeight: 700, color: "#bbb", marginTop: 8 }}>Drop or click to upload</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>PNG · JPG · WEBP</div>
                    <input ref={fRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                <div style={S.lbl}>PROMPT · max 1000 words</div>
                <span style={{ fontSize: 12, color: words > 900 ? "#ff6464" : words > 600 ? "#ffd700" : "#00f5d4", fontWeight: 700 }}>{words} words</span>
              </div>
              <textarea style={S.pta}
                placeholder={mode === "text" ? "Write detailed prompt... e.g. A lone samurai at cliff edge, cherry blossoms drifting, camera slowly tilts up to reveal vast mountain range, golden sunset, cinematic 8K slow motion..." : "Describe how image should animate... e.g. Person slowly turns head, warm smile appears, hair moves in breeze, camera slowly zooms in, golden lighting..."}
                value={prompt}
                onChange={e => setPrompt(e.target.value.slice(0, 7000))}
              />
              <div style={{ height: 3, borderRadius: 3, background: "rgba(255,255,255,0.06)", marginTop: 7, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: Math.min(100, (words / 1000) * 100) + "%", background: words > 900 ? "#ff6464" : "linear-gradient(90deg,#00f5d4,#7928ca)", transition: "width 0.3s" }} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={S.lbl}>ASPECT RATIO</div>
              <select value={ar} onChange={e => setAr(e.target.value)} style={{ padding: "9px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#ccc", fontFamily: "inherit", fontSize: 13, cursor: "pointer", outline: "none" }}>
                <option value="16:9">16:9 Landscape (YouTube)</option>
                <option value="9:16">9:16 Portrait (Reels/Shorts)</option>
                <option value="1:1">1:1 Square (Instagram)</option>
              </select>
            </div>

            {model?.extended && (
              <div style={S.extb}>
                <span style={{ fontSize: 20 }}>🎬</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd700" }}>Extended Mode — 20 Seconds</div>
                  <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>2×10s clips via Kling 1.6 Pro. Join in CapCut for 20s video.</div>
                </div>
              </div>
            )}

            <button style={S.bgen(loading)} onClick={generate} disabled={loading}>
              {loading ? "⏳ Generating" + (model?.extended ? " Clip " + (seg + 1) + "/2" : "") + "..." : "⚡ Generate " + model?.maxSec + "s Video"}
            </button>
          </div>

          {err && <div style={S.ebox}>⚠️ {err}</div>}

          {loading && (
            <div style={{ ...S.card, textAlign: "center" }}>
              <div style={{ width: 40, height: 40, border: "3px solid rgba(0,245,212,0.15)", borderTopColor: "#00f5d4", borderRadius: "50%", animation: "spin 0.85s linear infinite", margin: "0 auto 14px" }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: "#00f5d4", marginBottom: 10 }}>{status}</div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, height: 5, overflow: "hidden", maxWidth: 300, margin: "0 auto" }}>
                <div style={{ height: "100%", borderRadius: 20, background: "linear-gradient(90deg,#00f5d4,#7928ca)", width: pct + "%", transition: "width 1s" }} />
              </div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 10 }}>⏱️ Takes 5–10 min per clip. Please wait.</div>
            </div>
          )}

          {clips.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, fontWeight: 700, fontSize: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00f5d4" }} />
                {clips.length === 2 ? "🎬 20s Video — 2 Clips Ready!" : "✅ Video Ready!"}
              </div>
              {clips.map((c, i) => (
                <div key={i} style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={S.badge}>{c.label}</span>
                    <a href={c.url} download={"clip-" + (i + 1) + ".mp4"} target="_blank" rel="noreferrer" style={S.dlbtn}>⬇️ Download</a>
                  </div>
                  <video src={c.url} controls autoPlay={i === 0} loop style={{ width: "100%", maxHeight: 450, background: "#000", display: "block" }} />
                </div>
              ))}
              {clips.length === 2 && (
                <div style={{ background: "rgba(0,245,212,0.04)", border: "1px solid rgba(0,245,212,0.15)", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#00f5d4", marginBottom: 5 }}>✂️ Join for 20s Video</div>
                  <div style={{ fontSize: 12, color: "#666" }}>Download both → Open CapCut → Add Clip 1 + Clip 2 → Export 🎉</div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 32, padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", fontSize: 11, color: "#333", textAlign: "center" }}>
            Powered by <span style={{ color: "#ff6b35" }}>Kling v1.6</span> & <span style={{ color: "#00f5d4" }}>Wan 2.1</span> · replicate.com
          </div>

        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
