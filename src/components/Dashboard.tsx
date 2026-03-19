"use client";
import { useState, useEffect, useMemo } from "react";

// ═══════════════════════════════════════════════════════════
// AUTH CONFIG — Change these to your desired credentials
// ═══════════════════════════════════════════════════════════
const AUTH_USER = "unrwa";
const AUTH_PASS = "Monitor2026!";

// ═══════════════════════════════════════════════════════════
// DATA DEFAULTS (used before API loads)
// ═══════════════════════════════════════════════════════════
const COVERAGE = [
  {l:"Jan 24",v:28},{l:"Feb",v:35},{l:"Mar",v:42},{l:"Apr",v:38},{l:"May",v:31},{l:"Jun",v:22},{l:"Jul",v:19},{l:"Aug",v:16},
  {l:"Sep",v:29},{l:"Oct",v:33},{l:"Nov",v:20},{l:"Dec",v:25},{l:"Jan 25",v:30},{l:"Feb",v:27},{l:"Mar",v:39},{l:"Aug",v:22},
  {l:"Jan 26",v:18},{l:"Feb",v:21},{l:"Mar",v:16},
];

const DEFAULT_COUNTRIES = [
  { code: "AT", name: "Austria", flag: "\uD83C\uDDE6\uD83C\uDDF9", on: true },
  { code: "CH", name: "Switzerland", flag: "\uD83C\uDDE8\uD83C\uDDED", on: true },
  { code: "DE", name: "Germany", flag: "\uD83C\uDDE9\uD83C\uDDEA", on: false },
  { code: "UK", name: "United Kingdom", flag: "\uD83C\uDDEC\uD83C\uDDE7", on: false },
  { code: "US", name: "United States", flag: "\uD83C\uDDFA\uD83C\uDDF8", on: false },
  { code: "FR", name: "France", flag: "\uD83C\uDDEB\uD83C\uDDF7", on: false },
  { code: "IL", name: "Israel", flag: "\uD83C\uDDEE\uD83C\uDDF1", on: false },
  { code: "JO", name: "Jordan", flag: "\uD83C\uDDEF\uD83C\uDDF4", on: false },
  { code: "LB", name: "Lebanon", flag: "\uD83C\uDDF1\uD83C\uDDE7", on: false },
  { code: "SE", name: "Sweden", flag: "\uD83C\uDDF8\uD83C\uDDEA", on: false },
  { code: "NO", name: "Norway", flag: "\uD83C\uDDF3\uD83C\uDDF4", on: false },
];

/* ═══ PIE ═══ */
function Pie({data,size=130}: {data: {n:string,v:number,c:string}[], size?:number}){const total=data.reduce((s,d)=>s+d.v,0);if(!total)return null;const r=size/2,ir=r*.55;let cum=-90;const rd=(d:number)=>(d*Math.PI)/180;const sl=data.map(d=>{const a=(d.v/total)*360,s=cum;cum+=a;const lg=a>180?1:0;return{...d,p:`M${r+ir*Math.cos(rd(s))},${r+ir*Math.sin(rd(s))} L${r+r*Math.cos(rd(s))},${r+r*Math.sin(rd(s))} A${r},${r} 0 ${lg} 1 ${r+r*Math.cos(rd(cum))},${r+r*Math.sin(rd(cum))} L${r+ir*Math.cos(rd(cum))},${r+ir*Math.sin(rd(cum))} A${ir},${ir} 0 ${lg} 0 ${r+ir*Math.cos(rd(s))},${r+ir*Math.sin(rd(s))}Z`,pct:Math.round((d.v/total)*100)}});return(<div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",justifyContent:"center"}}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{sl.map((s,i)=><path key={i} d={s.p} fill={s.c} stroke="var(--bg)" strokeWidth="1.5"/>)}<text x={r} y={r-4} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--t1)">{total}</text><text x={r} y={r+10} textAnchor="middle" fontSize="8" fill="var(--t3)">total</text></svg><div style={{display:"flex",flexDirection:"column",gap:5}}>{sl.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}><span style={{width:9,height:9,borderRadius:3,background:s.c,flexShrink:0}}/><span style={{color:"var(--t1)",fontWeight:500}}>{s.n}</span><span style={{color:"var(--t2)"}}>({s.pct}%)</span></div>))}</div></div>)}

/* ═══ BARS ═══ */
function Bars({data}: {data: {l:string,v:number}[]}){const mx=Math.max(...data.map(d=>d.v));return(<div style={{display:"flex",alignItems:"flex-end",gap:2,height:110,paddingTop:6}}>{data.map((d,i)=>(<div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,minWidth:0}}><span style={{fontSize:8,color:"#a5b4d4",marginBottom:2,fontWeight:500}}>{d.v}</span><div style={{width:"68%",minHeight:2,borderRadius:"2px 2px 0 0",height:`${Math.max((d.v/mx)*85,3)}px`,background:i>=data.length-3?"#60a5fa":"#3b6fc0",transition:"height .4s"}}/><span style={{fontSize:7,color:"#8899bb",marginTop:2,whiteSpace:"nowrap"}}>{d.l}</span></div>))}</div>)}

/* ═══ WIDGET ═══ */
function W({title,children}: {title:string,children:React.ReactNode}){return(<div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",height:"100%",display:"flex",flexDirection:"column",minHeight:160}}><div style={{fontSize:11,fontWeight:700,color:"#94a8c8",textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>{title}</div><div style={{flex:1}}>{children}</div></div>)}

/* ═══ ARTICLE ROW ═══ */
const sC = (s:string) => s==="positive"?"#22c55e":s==="negative"?"#ef4444":"#eab308";
const sB = (s:string) => s==="positive"?"rgba(34,197,94,.1)":s==="negative"?"rgba(239,68,68,.1)":"rgba(234,179,8,.1)";
const rC = (r:number) => r>=90?"#60a5fa":r>=75?"#a78bfa":r>=60?"#fbbf24":"#94a3b8";

function Row({a,rank}: {a:any,rank?:number}){const[open,setOpen]=useState(false);return(<div style={{borderBottom:"1px solid var(--border)"}}><button onClick={()=>setOpen(!open)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:open?"rgba(96,165,250,.04)":"none",border:"none",cursor:"pointer",textAlign:"left",color:"var(--t1)",fontSize:13,fontFamily:"var(--sans)"}}>{rank!=null&&<span style={{width:22,height:22,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",background:rC(a.relevance)}}>{rank}</span>}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8899bb" strokeWidth="2" style={{flexShrink:0,transform:open?"rotate(90deg)":"",transition:"transform .15s"}}><polyline points="9 18 15 12 9 6"/></svg><span style={{flex:1,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12}}>{a.title}</span><span style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:600,color:sC(a.sentiment),background:sB(a.sentiment),textTransform:"uppercase",flexShrink:0}}>{a.sentiment}</span><span style={{fontSize:10,color:"var(--t2)",flexShrink:0}}>{a.date}</span></button>{open&&(<div style={{padding:"2px 12px 14px 46px",animation:"fi .2s"}}><div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>{(a.keywords||[]).map((k:string,i:number)=><span key={i} style={{padding:"2px 7px",borderRadius:99,fontSize:9,background:"rgba(96,165,250,.1)",color:"#60a5fa",fontWeight:500}}>{k}</span>)}</div><div style={{display:"flex",gap:10,fontSize:10,color:"var(--t2)",marginBottom:6}}><span>{a.source}</span><span>{a.country==="Austria"?"\uD83C\uDDE6\uD83C\uDDF9":"\uD83C\uDDE8\uD83C\uDDED"} {a.country}</span><span style={{fontWeight:600,color:rC(a.relevance)}}>Relevance {a.relevance}%</span></div><p style={{margin:"0 0 10px",fontSize:12,color:"var(--t2)",lineHeight:1.65,whiteSpace:"pre-line"}}>{a.summary_en}</p><a href={a.url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,color:"#60a5fa",textDecoration:"none"}}>Read original <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a></div>)}</div>)}

/* ═══ LOGIN SCREEN ═══ */
function LoginScreen({onLogin}: {onLogin: ()=>void}){
  const[user,setUser]=useState("");
  const[pass,setPass]=useState("");
  const[error,setError]=useState("");

  const handleLogin = () => {
    if(user===AUTH_USER && pass===AUTH_PASS){
      if(typeof window!=="undefined") sessionStorage.setItem("unrwa-auth","true");
      onLogin();
    } else {
      setError("Invalid credentials");
      setTimeout(()=>setError(""),3000);
    }
  };

  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#090b10",fontFamily:"'DM Sans',-apple-system,system-ui,sans-serif",padding:20}}>
      <div style={{width:"100%",maxWidth:380,background:"#0f1219",border:"1px solid #1a2030",borderRadius:16,padding:32}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#60a5fa,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:"#fff"}}>U</div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#e4e8f0"}}>UNRWA Media Monitor</div>
            <div style={{fontSize:11,color:"#4e5670"}}>Sign in to access the dashboard</div>
          </div>
        </div>

        <label style={{fontSize:11,fontWeight:600,color:"#94a8c8",display:"block",marginBottom:4}}>Username</label>
        <input value={user} onChange={e=>setUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #1a2030",background:"#090b10",color:"#e4e8f0",fontSize:13,outline:"none",marginBottom:12,fontFamily:"inherit",boxSizing:"border-box"}}/>

        <label style={{fontSize:11,fontWeight:600,color:"#94a8c8",display:"block",marginBottom:4}}>Password</label>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #1a2030",background:"#090b10",color:"#e4e8f0",fontSize:13,outline:"none",marginBottom:16,fontFamily:"inherit",boxSizing:"border-box"}}/>

        {error&&<div style={{fontSize:12,color:"#ef4444",marginBottom:12}}>{error}</div>}

        <button onClick={handleLogin} style={{width:"100%",padding:"10px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#60a5fa,#a78bfa)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          Sign In
        </button>
      </div>
    </div>
  );
}

/* ═══ MAIN APP ═══ */
export default function Dashboard(){
  const[authed,setAuthed]=useState(false);
  const[articles,setArticles]=useState<any[]>([]);
  const[keywords,setKeywords]=useState<string[]>([]);
  const[newKw,setNewKw]=useState("");
  const[tab,setTab]=useState("dashboard");
  const[loading,setLoading]=useState(false);
  const[lastUp,setLastUp]=useState("");
  const[wOrder,setWOrder]=useState(["mentions","relevance","sentiment","country","sources","coverage"]);
  const[dragI,setDragI]=useState<number|null>(null);
  const[overI,setOverI]=useState<number|null>(null);
  const[countries,setCountries]=useState(DEFAULT_COUNTRIES);
  const[email,setEmail]=useState("");
  const[freq,setFreq]=useState("weekly");
  const[emailSaved,setEmailSaved]=useState(false);

  // Check session on mount
  useEffect(()=>{
    if(typeof window!=="undefined" && sessionStorage.getItem("unrwa-auth")==="true") setAuthed(true);
  },[]);

  // Load data from API
  useEffect(()=>{
    if(!authed) return;
    setLastUp(new Date().toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}));
    fetch("/api/articles").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setArticles(d); }).catch(()=>{});
    fetch("/api/keywords").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setKeywords(d.map((k:any)=>k.keyword)); }).catch(()=>{});
    fetch("/api/countries").then(r=>r.json()).then(d=>{
      if(Array.isArray(d)) setCountries(d.map((c:any)=>({code:c.code,name:c.name,flag:c.flag||"",on:c.active})));
    }).catch(()=>{});
  },[authed]);

  const sorted=useMemo(()=>[...articles].sort((a,b)=>b.relevance-a.relevance),[articles]);
  const byDate=useMemo(()=>[...articles].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()),[articles]);
  const totM=articles.reduce((s,a)=>s+(a.keywords||[]).length,0);
  const avgR=articles.length?Math.round(articles.reduce((s,a)=>s+a.relevance,0)/articles.length):0;
  const se={positive:0,neutral:0,negative:0} as any;articles.forEach(a=>se[a.sentiment]=(se[a.sentiment]||0)+1);
  const cc:any={};articles.forEach(a=>{cc[a.country]=(cc[a.country]||0)+1});
  const sm:any={};articles.forEach(a=>{sm[a.source]=(sm[a.source]||0)+1});
  const sd=Object.entries(sm).sort((a:any,b:any)=>b[1]-a[1]).slice(0,7);
  const activeCountries=countries.filter(c=>c.on);

  const refresh = async () => {
    setLoading(true);
    try {
      await fetch("/api/scan", { method: "POST" });
      const arts = await fetch("/api/articles").then(r => r.json());
      if(Array.isArray(arts)) setArticles(arts);
    } catch(e){ console.error(e); }
    finally {
      setLoading(false);
      setLastUp(new Date().toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}));
    }
  };

  const addKw = async () => {
    const k = newKw.trim();
    if (k && !keywords.includes(k)) {
      await fetch("/api/keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: k }) });
      setKeywords([...keywords, k]);
      setNewKw("");
    }
  };

  const removeKw = async (k: string) => {
    if (keywords.length > 1) {
      await fetch("/api/keywords", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: k }) });
      setKeywords(keywords.filter(x => x !== k));
    }
  };

  const toggleCountry = async (code: string) => {
    const c = countries.find(x => x.code === code);
    if (!c) return;
    await fetch("/api/countries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, active: !c.on }) });
    setCountries(countries.map(x => x.code === code ? { ...x, on: !x.on } : x));
  };

  const saveEmail = async () => {
    if (email.includes("@")) {
      await fetch("/api/email-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, frequency: freq }) });
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 3000);
    }
  };

  const logout = () => {
    if(typeof window!=="undefined") sessionStorage.removeItem("unrwa-auth");
    setAuthed(false);
  };

  const ds=(i:number)=>(e:any)=>{setDragI(i);e.dataTransfer.effectAllowed="move"};
  const dov=(i:number)=>(e:any)=>{e.preventDefault();setOverI(i)};
  const dp=(i:number)=>(e:any)=>{e.preventDefault();if(dragI!==null&&dragI!==i){const n=[...wOrder];const[m]=n.splice(dragI,1);n.splice(i,0,m);setWOrder(n)}setDragI(null);setOverI(null)};
  const de=()=>{setDragI(null);setOverI(null)};

  // ─── LOGIN GATE ───
  if(!authed) return <LoginScreen onLogin={()=>setAuthed(true)}/>;

  // ─── WIDGETS ───
  const wMap: any = {
    mentions:<W title="Keyword Mentions"><div style={{fontSize:36,fontWeight:800,color:"var(--t1)"}}>{totM}</div><div style={{fontSize:11,color:"var(--t2)",marginTop:2}}>across {articles.length} articles</div><div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:4}}>{keywords.map((k,i)=><span key={i} style={{padding:"2px 7px",borderRadius:99,fontSize:8,background:"rgba(96,165,250,.1)",color:"#60a5fa",fontWeight:500}}>{k.length>22?k.slice(0,20)+"\u2026":k}</span>)}</div></W>,
    relevance:<W title="Avg. Relevance Score"><div style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{fontSize:36,fontWeight:800,color:rC(avgR)}}>{avgR}</span><span style={{fontSize:13,color:"var(--t2)"}}>/100</span></div><div style={{marginTop:8,height:6,borderRadius:6,background:"var(--border)"}}><div style={{height:"100%",borderRadius:6,width:`${avgR}%`,background:rC(avgR),transition:"width .5s"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--t2)",marginTop:3}}><span>Low</span><span>High</span></div></W>,
    sentiment:<W title="Sentiment Analysis"><Pie data={[{n:"Positive",v:se.positive||0,c:"#22c55e"},{n:"Neutral",v:se.neutral||0,c:"#eab308"},{n:"Negative",v:se.negative||0,c:"#ef4444"}]}/></W>,
    country:<W title="Coverage by Country">{Object.entries(cc).map(([c,n]:any)=><div key={c} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:500,marginBottom:3}}><span>{c==="Austria"?"\uD83C\uDDE6\uD83C\uDDF9":"\uD83C\uDDE8\uD83C\uDDED"} {c}</span><span style={{color:"#60a5fa"}}>{n}</span></div><div style={{height:5,borderRadius:5,background:"var(--border)"}}><div style={{height:"100%",borderRadius:5,width:`${(n/articles.length)*100}%`,background:c==="Austria"?"linear-gradient(90deg,#ef4444,#f59e0b)":"linear-gradient(90deg,#60a5fa,#06b6d4)",transition:"width .4s"}}/></div></div>)}</W>,
    sources:<W title="Top Media Outlets"><Pie data={sd.map(([n,v]:any,i:number)=>({n,v,c:["#60a5fa","#a78bfa","#ec4899","#fbbf24","#34d399","#22d3ee","#fb923c"][i]}))}/></W>,
    coverage:<W title="Coverage Over Time"><Bars data={COVERAGE}/></W>,
  };

  return(
    <div style={{"--bg":"#090b10","--card":"#0f1219","--border":"#1a2030","--t1":"#e4e8f0","--t2":"#8c95aa","--t3":"#4e5670","--sans":"'DM Sans',-apple-system,system-ui,sans-serif",fontFamily:"var(--sans)",background:"var(--bg)",color:"var(--t1)",minHeight:"100vh"} as any}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');@keyframes fi{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}@keyframes sp{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1e2840;border-radius:99px}button{font-family:var(--sans)}a{color:#60a5fa}`}</style>

      {/* HEADER */}
      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(9,11,16,.88)",backdropFilter:"blur(16px)",borderBottom:"1px solid var(--border)",padding:"0 16px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",gap:8,minHeight:52,flexWrap:"wrap"}}>
          <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#60a5fa,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:"#fff",flexShrink:0}}>U</div>
          <div style={{flex:1,minWidth:100}}>
            <div style={{fontSize:14,fontWeight:700,letterSpacing:"-.02em"}}>UNRWA Media Monitor</div>
            <div style={{fontSize:9,color:"var(--t2)"}}>{activeCountries.map(c=>c.flag).join(" ")} · {lastUp}</div>
          </div>
          <div style={{display:"flex",gap:2}}>
            {["dashboard","articles","keywords","settings"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{padding:"5px 10px",borderRadius:6,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",textTransform:"capitalize",background:tab===t?"#60a5fa":"transparent",color:tab===t?"#fff":"var(--t3)"}}>{t}</button>
            ))}
          </div>
          <button onClick={refresh} disabled={loading} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:loading?"var(--border)":"linear-gradient(135deg,#60a5fa,#a78bfa)",border:"none",color:"#fff",fontSize:11,fontWeight:600,cursor:loading?"wait":"pointer"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={loading?{animation:"sp .7s linear infinite"}:{}}><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
            {loading?"Scanning\u2026":"Update"}
          </button>
          <button onClick={logout} style={{padding:"6px 10px",borderRadius:7,border:"1px solid var(--border)",background:"none",color:"var(--t3)",fontSize:10,fontWeight:600,cursor:"pointer"}}>Logout</button>
        </div>
      </header>

      <main style={{maxWidth:1200,margin:"0 auto",padding:"14px 16px 40px"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&<>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>Widgets</span>
            <span style={{fontSize:9,color:"var(--t2)",background:"var(--border)",padding:"2px 8px",borderRadius:99}}>drag to reorder</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,310px),1fr))",gap:10,marginBottom:28}}>
            {wOrder.map((k,i)=>(<div key={k} draggable onDragStart={ds(i)} onDragOver={dov(i)} onDrop={dp(i)} onDragEnd={de} style={{cursor:"grab",transition:"transform .15s,opacity .15s",opacity:dragI===i?.35:1,transform:overI===i&&dragI!==i?"scale(1.02)":"",outline:overI===i&&dragI!==i?"2px dashed #60a5fa":"none",borderRadius:12}}>{wMap[k]}</div>))}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:14,fontWeight:700}}>Top 10 Articles</span>
            <span style={{fontSize:9,color:"var(--t2)",background:"var(--border)",padding:"2px 8px",borderRadius:99}}>by relevance</span>
          </div>
          <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden",marginBottom:28}}>
            {sorted.slice(0,10).map((a,i)=><Row key={a.id||i} a={a} rank={i+1}/>)}
            {articles.length===0&&<div style={{padding:40,textAlign:"center",color:"var(--t3)",fontSize:13}}>No articles yet. Click "Update" to run your first scan.</div>}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:14,fontWeight:700}}>All Articles</span>
            <span style={{fontSize:9,color:"var(--t2)",background:"var(--border)",padding:"2px 8px",borderRadius:99}}>{articles.length} results · newest first</span>
          </div>
          <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
            {byDate.map((a,i)=><Row key={a.id||i} a={a}/>)}
            {articles.length===0&&<div style={{padding:40,textAlign:"center",color:"var(--t3)",fontSize:13}}>No articles yet.</div>}
          </div>
        </>}

        {/* ── ARTICLES TAB ── */}
        {tab==="articles"&&<>
          <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>All Articles <span style={{fontSize:11,fontWeight:400,color:"var(--t2)"}}>{articles.length} results</span></div>
          <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
            {byDate.map((a,i)=><Row key={a.id||i} a={a}/>)}
            {articles.length===0&&<div style={{padding:40,textAlign:"center",color:"var(--t3)",fontSize:13}}>No articles yet. Click "Update" to run your first scan.</div>}
          </div>
        </>}

        {/* ── KEYWORDS TAB ── */}
        {tab==="keywords"&&<div style={{maxWidth:580}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Monitored Keywords</div>
          <p style={{fontSize:11,color:"var(--t2)",marginBottom:14,lineHeight:1.5}}>Each keyword is searched independently. Articles matching 2+ are deduplicated.</p>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
            {keywords.map((k,i)=>(<div key={i} style={{display:"flex",alignItems:"center",background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px"}}><span style={{flex:1,fontSize:12,fontWeight:500,wordBreak:"break-all"}}>{k}</span><button onClick={()=>removeKw(k)} style={{width:22,height:22,borderRadius:5,border:"1px solid var(--border)",background:"none",color:"var(--t3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <input value={newKw} onChange={e=>setNewKw(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") addKw()}} placeholder="Add a new keyword\u2026" style={{flex:1,padding:"9px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--card)",color:"var(--t1)",fontSize:12,outline:"none",fontFamily:"var(--sans)"}}/>
            <button onClick={addKw} style={{padding:"9px 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#60a5fa,#a78bfa)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>Add</button>
          </div>
        </div>}

        {/* ── SETTINGS TAB ── */}
        {tab==="settings"&&<div style={{maxWidth:620}}>

          {/* Email Report */}
          <div style={{marginBottom:28}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Email Report</div>
            <p style={{fontSize:11,color:"var(--t2)",marginBottom:12,lineHeight:1.5}}>Receive the media monitoring report directly in your inbox.</p>
            <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:16}}>
              <label style={{fontSize:11,fontWeight:600,color:"#94a8c8",display:"block",marginBottom:4}}>Recipient Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your.name@unrwa.org" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--t1)",fontSize:12,outline:"none",fontFamily:"var(--sans)",marginBottom:12,boxSizing:"border-box"}}/>
              <label style={{fontSize:11,fontWeight:600,color:"#94a8c8",display:"block",marginBottom:6}}>Frequency</label>
              <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                {[{v:"weekly",l:"Every Monday"},{v:"biweekly",l:"Every 2 Weeks"},{v:"monthly",l:"Monthly"},{v:"daily",l:"Daily"}].map(o=>(
                  <button key={o.v} onClick={()=>setFreq(o.v)} style={{padding:"6px 14px",borderRadius:6,border:freq===o.v?"1px solid #60a5fa":"1px solid var(--border)",background:freq===o.v?"rgba(96,165,250,.12)":"var(--bg)",color:freq===o.v?"#60a5fa":"var(--t2)",fontSize:11,fontWeight:600,cursor:"pointer"}}>{o.l}</button>
                ))}
              </div>
              <button onClick={saveEmail} style={{padding:"9px 20px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#60a5fa,#a78bfa)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {emailSaved?"\u2713 Saved!":"Save & Activate"}
              </button>
            </div>
          </div>

          {/* Country Sources */}
          <div style={{marginBottom:28}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Media Source Countries</div>
            <p style={{fontSize:11,color:"var(--t2)",marginBottom:12,lineHeight:1.5}}>Toggle additional countries to expand your media scan.</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
              {countries.map(c=>(
                <button key={c.code} onClick={()=>toggleCountry(c.code)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,border:c.on?"1px solid #60a5fa":"1px solid var(--border)",background:c.on?"rgba(96,165,250,.08)":"var(--card)",cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:18}}>{c.flag}</span>
                  <span style={{flex:1,fontSize:12,fontWeight:500,color:c.on?"var(--t1)":"var(--t3)"}}>{c.name}</span>
                  <span style={{width:16,height:16,borderRadius:4,border:c.on?"none":"1.5px solid var(--t3)",background:c.on?"#60a5fa":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {c.on&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Info */}
          <div style={{padding:14,borderRadius:10,background:"rgba(96,165,250,.06)",border:"1px solid rgba(96,165,250,.12)"}}>
            <div style={{fontSize:11,color:"#60a5fa",fontWeight:600,marginBottom:3}}>Auto-update Schedule</div>
            <div style={{fontSize:12,color:"var(--t2)",lineHeight:1.5}}>Currently set to <strong style={{color:"var(--t1)"}}>{freq==="weekly"?"every Monday":freq==="biweekly"?"every 2 weeks":freq==="monthly"?"monthly":"daily"} at 08:00 CET</strong>.</div>
          </div>
        </div>}

      </main>

      <footer style={{borderTop:"1px solid var(--border)",padding:"10px 16px",display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--t3)",maxWidth:1200,margin:"0 auto",flexWrap:"wrap",gap:6}}>
        <span>UNRWA Media Monitor · {activeCountries.map(c=>c.name).join(", ")} · {keywords.length} keywords</span>
        <span>Next scan: {freq==="daily"?"Tomorrow":"Monday"} 08:00 CET</span>
      </footer>
    </div>
  );
}
