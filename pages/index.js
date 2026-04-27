import { useState, useRef } from "react";
import Head from "next/head";

const MODELS = [
  { id:"wan-t2v", label:"Wan 2.1", icon:"🌊", desc:"8 sec", color:"#00f5d4", maxSec:8, supports:["text"], path:"wan-ai/wan2.1-t2v-480p", buildInput:({prompt,neg,frames})=>({prompt,negative_prompt:neg,num_frames:frames}) },
  { id:"wan-i2v", label:"Wan I2V", icon:"🖼️", desc:"8 sec", color:"#a855f7", maxSec:8, supports:["image"], path:"wan-ai/wan2.1-i2v-480p", buildInput:({prompt,neg,frames,image})=>({prompt,negative_prompt:neg,num_frames:frames,image}) },
  { id:"kling", label:"Kling 1.6", icon:"⚡", desc:"10 sec", color:"#ff6b35", maxSec:10, supports:["text","image"], path:"kwaivgi/kling-v1.6-pro", buildInput:({prompt,neg,image,ar})=>({prompt,negative_prompt:neg,duration:"10",aspect_ratio:ar,...(image?{image}:{})}) },
  { id:"kling-ext", label:"Kling ×2", icon:"🎬", desc:"20 sec", color:"#ffd700", maxSec:20, supports:["text","image"], extended:true, path:"kwaivgi/kling-v1.6-pro", buildInput:({prompt,neg,image,ar})=>({prompt,negative_prompt:neg,duration:"10",aspect_ratio:ar,...(image?{image}:{})}) },
];

const MAX_CHARS=7000;
function wc(s){return s.trim()===""?0:s.trim().split(/\s+/).length;}

export default function Home(){
  const [apiKey,setApiKey]=useState("");
  const [showKey,setShowKey]=useState(false);
  const [mode,setMode]=useState("text");
  const [modelId,setModelId]=useState("kling-ext");
  const [prompt,setPrompt]=useState("");
  const [neg,setNeg]=useState("blurry, low quality, distorted, watermark");
  const [image,setImage]=useState(null);
  const [imgPrev,setImgPrev]=useState(null);
  const [ar,setAr]=useState("16:9");
  const [dragOver,setDragOver]=useState(false);
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState("");
  const [pct,setPct]=useState(0);
  const [seg,setSeg]=useState(0);
  const [clips,setClips]=useState([]);
  const [error,setError]=useState("");
  const fileRef=useRef();
  const model=MODELS.find(m=>m.id===modelId);
  const words=wc(prompt);
  const wcCol=words>900?"#ff6464":words>600?"#ffd700":"#00f5d4";

  function pickModel(id){setModelId(id);const m=MODELS.find(x=>x.id===id);if(!m.supports.includes(mode))setMode(m.supports[0]);}
  function handleFile(file){if(!file||!file.type.startsWith("image/"))return;const r=new FileReader();r.onload=e=>{setImage(e.target.result);setImgPrev(e.target.result);};r.readAsDataURL(file);}

  async function callAPI(modelPath,input){
    const res=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey,modelPath,input})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"API error");
    return data.url;
  }

  async function generate(){
    if(!apiKey.trim()){setError("⚠️ Add your Replicate API key");setShowKey(true);return;}
    if(!prompt.trim()){setError("⚠️ Please enter a prompt");return;}
    if(mode==="image"&&!image){setError("⚠️ Please upload an image");return;}
    setLoading(true);setError("");setClips([]);setPct(0);setSeg(0);
    const args={prompt,neg,image:mode==="image"?image:undefined,frames:121,ar};
    try{
      if(model.extended){
        const out=[];
        for(let i=0;i<2;i++){
          setSeg(i);setStatus(`⚡ Generating Clip ${i+1} of 2...`);setPct(i*50);
          const url=await callAPI(model.path,model.buildInput(args));
          out.push({url,label:`Clip ${i+1} · 10s`});
          setClips([...out]);setPct(i===0?50:100);
        }
        setStatus("✅ Both clips ready — 20 seconds!");
      }else{
        setStatus("⚡ Generating your video...");
        const url=await callAPI(model.path,model.buildInput(args));
        setClips([{url,label:`${model.label} · ${model.maxSec}s`}]);
        setPct(100);setStatus("✅ Video ready!");
      }
    }catch(e){setError(e.message||"Something went wrong");setStatus("");}
    setLoading(false);
  }

  return(
    <>
      <Head><title>VGENAI Studio</title><meta name="viewport" content="width=device-width,initial-scale=1"/><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet"/></Head>
      <div className="app">
        <div className="container">
          <div className="header">
            <div className="logo"><div className="logo-icon">⚡</div><div><div className="logo-text"><span className="cyan">VGEN</span>AI</div><div className="logo-sub">VIDEO STUDIO</div></div></div>
            <div className="hright"><span className="badge gold">🎬 20s</span><button className={`kbtn ${apiKey?"on":""}`} onClick={()=>setShowKey(!showKey)}>🔑</button></div>
          </div>

          {showKey&&<div className="card kcard"><div className="kh"><span className="red">🔑 Replicate API Key</span><a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer" className="lnk">Get free →</a></div><input className="ainp" type="password" placeholder="r8_xxx..." value={apiKey} onChange={e=>setApiKey(e.target.value)}/><p className="hint">🔒 Memory only. Free = ~$5 credits</p></div>}

          <div className="sec"><div className="lbl">MODEL & DURATION</div>
            <div className="mgrid">{MODELS.map(m=><button key={m.id} className={`mcard ${modelId===m.id?"active":""}`} onClick={()=>pickModel(m.id)}><div className="mic">{m.icon}</div><div className="mn" style={{color:modelId===m.id?m.color:"#777"}}>{m.label}</div><div className="md" style={{color:m.id==="kling-ext"?"#ffd700":"#555"}}>{m.desc}</div>{m.id==="kling-ext"&&<div className="mbadge">2 CLIPS</div>}</button>)}</div>
          </div>

          {model&&model.supports.length>1&&<div className="mrow"><button className={`mbtn ${mode==="text"?"active":""}`} onClick={()=>setMode("text")}>✍️ Text→Video</button><button className={`mbtn ${mode==="image"?"active":""}`} onClick={()=>setMode("image")}>🖼️ Image→Video</button></div>}

          <div className="card main">
            {mode==="image"&&<div className="sec"><div className="lbl">UPLOAD IMAGE</div>
              {imgPrev?<div className="iprev"><img src={imgPrev} alt="p"/><button className="rmbtn" onClick={()=>{setImage(null);setImgPrev(null);}}>✕</button></div>
              :<div className={`uzone ${dragOver?"drag":""}`} onClick={()=>fileRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}><div style={{fontSize:38}}>📷</div><div className="ut">Drop or click to upload</div><div className="hint">PNG · JPG · WEBP</div><input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/></div>}
            </div>}

            <div className="sec">
              <div className="ph"><div className="lbl">PROMPT <span className="dim">· max 1000 words</span></div><div className="ws"><span style={{color:wcCol,fontWeight:800}}>{words}w</span><span className="dim">{prompt.length}/{MAX_CHARS}</span></div></div>
              <textarea className="pta" placeholder={mode==="text"?"Write detailed prompt up to 1000 words...\n\nExample: A lone samurai at cliff edge, cherry blossoms drifting, slowly sheathes sword, camera tilts up to reveal vast mountain range, golden sunset, cinematic 8K, slow motion...":"Describe how image should animate...\n\nExample: Person slowly turns head, warm smile appears, hair moves in breeze, camera slowly zooms in, background blurs, golden lighting..."} value={prompt} onChange={e=>setPrompt(e.target.value.slice(0,MAX_CHARS))}/>
              <div className="wbw"><div className="wb"><div className="wbf" style={{width:`${Math.min(100,(words/1000)*100)}%`,background:words>900?"#ff6464":words>600?"#ffd700":"linear-gradient(90deg,#00f5d4,#7928ca)"}}/></div><span className="dim">{1000-words} left</span></div>
            </div>

            {model?.extended&&<div className="extb"><span style={{fontSize:20}}>🎬</span><div><div className="ext-t">Extended Mode — 20 Seconds</div><div className="dim">2×10s clips via Kling 1.6 Pro. Join in CapCut.</div></div></div>}
            <button className="bgen" onClick={generate} disabled={loading}>{loading?`⏳ Clip ${seg+1}${model?.extended?"/2":""}...`:`⚡ Generate ${model?.maxSec}s Video`}</button>
          </div>

          {error&&<div className="ebox">{error}</div>}

          {loading&&<div className="card pcrd"><div className="spin"/><div className="stxt">{status}</div>
            {model?.extended&&<div className="sw"><div className="slbl"><span>Clip 1</span><span>Clip 2</span></div><div className="sbar">{[0,1].map(i=><div key={i} className={`sg ${i<seg?"done":i===seg?"act":""}`}/>)}</div></div>}
            <div className="pbw"><div className="pb"><div className="pf" style={{width:`${pct}%`}}/></div></div>
            <div className="hint">⏱️ Takes 5–10 min per clip</div>
          </div>}

          {clips.length>0&&<div className="clwrap">
            <div className="clh"><div className="pdot"/><span>{clips.length===2?"🎬 20s — 2 Clips Ready":"✅ Video Ready"}</span></div>
            {clips.map((c,i)=><div key={i} className="clcard"><div className="clhd"><div className="clm"><span className="badge gold">{c.label}</span>{clips.length===2&&<span className="dim">{i===0?"→ First":"→ Second"}</span>}</div><a href={c.url} download={`clip-${i+1}.mp4`} target="_blank" rel="noreferrer" className="dlbtn">⬇️ Download</a></div><video src={c.url} controls autoPlay={i===0} loop/></div>)}
            {clips.length===2&&<div className="jtip"><div className="jt">✂️ Join for 20s Video</div><div className="dim">Download both → CapCut → Clip1 + Clip2 → Export 🎉</div></div>}
          </div>}

          <div className="footer">Powered by <span className="orange">Kling v1.6</span> & <span className="cyan">Wan 2.1</span> · <span className="cyan">replicate.com</span></div>
        </div>
      </div>

      <style jsx global>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes gS{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes fI{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pu{0%,100%{opacity:.4}50%{opacity:1}}
        @keyframes pr{0%{box-shadow:0 0 0 0 rgba(0,245,212,.5)}70%{box-shadow:0 0 0 10px rgba(0,245,212,0)}100%{box-shadow:0 0 0 0 rgba(0,245,212,0)}}
        body{background:#050508;font-family:'Outfit',sans-serif;color:#e8e8f0}
        .app{min-height:100vh;position:relative}
        .app::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 15% 20%,rgba(0,245,212,.07) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 85% 80%,rgba(120,40,255,.08) 0%,transparent 60%);pointer-events:none;z-index:0}
        .container{max-width:860px;margin:0 auto;padding:0 16px 60px;position:relative;z-index:1}
        .header{padding:24px 0 20px;display:flex;align-items:center;justify-content:space-between}
        .logo{display:flex;align-items:center;gap:12px}
        .logo-icon{width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,#00f5d4,#7928ca);display:flex;align-items:center;justify-content:center;font-size:22px;animation:fl 3s ease infinite;box-shadow:0 0 24px rgba(0,245,212,.3)}
        .logo-text{font-weight:900;font-size:22px;letter-spacing:-.5px;line-height:1}
        .logo-sub{font-size:9px;color:#444;letter-spacing:3px;margin-top:2px}
        .hright{display:flex;gap:8px;align-items:center}
        .kbtn{width:38px;height:38px;border-radius:10px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,80,80,.3);background:rgba(255,80,80,.1)}
        .kbtn.on{border-color:rgba(0,245,212,.3);background:rgba(0,245,212,.1)}
        .card{background:rgba(10,10,18,.88);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:22px;margin-bottom:14px;animation:fI .3s ease}
        .kcard{border-color:rgba(255,80,80,.2)}
        .main{padding:26px}
        .kh{display:flex;align-items:center;margin-bottom:10px}
        .red{font-size:14px;font-weight:700;color:#ff7070}
        .lnk{margin-left:auto;font-size:12px;color:#00f5d4;text-decoration:none}
        .ainp{width:100%;padding:11px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,80,80,.3);border-radius:11px;color:#e8e8f0;font-size:12px;outline:none;font-family:monospace}
        .hint{font-size:11px;color:#444;margin-top:7px}
        .sec{margin-bottom:18px}
        .lbl{font-size:11px;color:#444;letter-spacing:2px;text-transform:uppercase;margin-bottom:9px}
        .dim{color:#3a3a4a;font-size:11px}
        .mgrid{display:flex;gap:8px}
        .mcard{flex:1;padding:13px 7px;border-radius:13px;border:2px solid rgba(255,255,255,.08);background:transparent;cursor:pointer;text-align:center;font-family:'Outfit',sans-serif;transition:all .2s}
        .mcard.active{border-color:rgba(0,245,212,.6);background:rgba(0,245,212,.07)}
        .mic{font-size:20px;margin-bottom:3px}
        .mn{font-size:12px;font-weight:700}
        .md{font-size:11px;font-weight:800;margin-top:2px}
        .mbadge{font-size:9px;color:#ffd700;margin-top:1px;letter-spacing:1px}
        .mrow{display:flex;gap:8px;margin-bottom:14px}
        .mbtn{flex:1;padding:11px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:transparent;color:#666;font-family:'Outfit',sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s}
        .mbtn.active{background:rgba(0,245,212,.1);border-color:#00f5d4;color:#00f5d4}
        .iprev{position:relative}
        .iprev img{width:100%;max-height:200px;object-fit:cover;border-radius:13px;border:1px solid rgba(0,245,212,.3);display:block}
        .rmbtn{position:absolute;top:9px;right:9px;background:rgba(0,0,0,.75);border:1px solid rgba(255,255,255,.2);border-radius:7px;color:#fff;padding:3px 10px;cursor:pointer;font-size:12px;font-family:'Outfit',sans-serif}
        .uzone{border:2px dashed rgba(0,245,212,.22);border-radius:16px;padding:32px 20px;text-align:center;cursor:pointer;transition:all .3s;background:rgba(0,245,212,.01)}
        .uzone:hover,.uzone.drag{border-color:rgba(0,245,212,.6);background:rgba(0,245,212,.06)}
        .ut{font-weight:700;font-size:13px;color:#bbb;margin:8px 0 4px}
        .ph{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}
        .ws{display:flex;gap:10px;align-items:center}
        .pta{width:100%;padding:15px 16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:15px;color:#e8e8f0;font-family:'Outfit',sans-serif;font-size:13px;resize:vertical;outline:none;min-height:200px;max-height:500px;line-height:1.7;transition:border-color .3s}
        .pta:focus{border-color:rgba(0,245,212,.5);box-shadow:0 0 0 3px rgba(0,245,212,.07)}
        .pta::placeholder{color:#2e2e42}
        .wbw{display:flex;align-items:center;gap:7px;margin-top:7px}
        .wb{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden}
        .wbf{height:100%;border-radius:3px;transition:width .4s,background .4s}
        .extb{background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.18);border-radius:11px;padding:11px 14px;margin-bottom:16px;display:flex;gap:9px;align-items:center}
        .ext-t{font-size:13px;font-weight:700;color:#ffd700}
        .bgen{width:100%;padding:16px;border:none;border-radius:15px;background:linear-gradient(135deg,#00f5d4,#7928ca,#ff0080);background-size:200% 200%;animation:gS 3s ease infinite;color:#fff;font-family:'Outfit',sans-serif;font-weight:800;font-size:15px;cursor:pointer;transition:all .3s;letter-spacing:.5px}
        .bgen:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,245,212,.3)}
        .bgen:disabled{opacity:.45;cursor:not-allowed;animation:none;background:#2a2a3a;transform:none;box-shadow:none}
        .ebox{background:rgba(255,60,60,.07);border:1px solid rgba(255,60,60,.25);border-radius:13px;padding:14px;margin-bottom:14px;font-size:13px;color:#ff8080;animation:fI .3s ease}
        .pcrd{text-align:center}
        .spin{width:42px;height:42px;border:3px solid rgba(0,245,212,.12);border-top-color:#00f5d4;border-radius:50%;animatio
