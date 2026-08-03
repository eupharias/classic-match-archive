"use client";

import { useEffect, useMemo, useState } from "react";

type Match = { id:number; date:string; groupSize:number; side:string; result:string; duration:number; notes:string };
type Performance = { id:number; matchId:number; team:string; tracked:boolean; player:string; champion:string; role:string; kills:number; deaths:number; assists:number; cs:number; vision:number };
type TrackerData = { matches:Match[]; performances:Performance[]; players:string[]; champions:string[]; roles:string[] };
type Tab = "overview" | "players" | "matches" | "add";

const kda = (p:Performance) => (p.kills + p.assists) / Math.max(1, p.deaths);
const pct = (n:number) => `${Math.round(n * 100)}%`;
const num = (n:number, digits=1) => Number.isFinite(n) ? n.toFixed(digits) : "—";

function Stat({label,value,detail,tone}:{label:string;value:string;detail:string;tone?:string}) {
  return <article className={`stat ${tone ?? ""}`}><div className="stat-label">{label}</div><strong>{value}</strong><span>{detail}</span></article>;
}

export default function Home() {
  const [base, setBase] = useState<TrackerData|null>(null);
  const [added, setAdded] = useState<{matches:Match[];performances:Performance[]}>({matches:[],performances:[]});
  const [tab,setTab] = useState<Tab>("overview");
  const [player,setPlayer] = useState("Dane");
  const [query,setQuery] = useState("");
  const [resultFilter,setResultFilter] = useState("All");
  const [expanded,setExpanded] = useState<number|null>(null);

  useEffect(() => {
    fetch("./tracker-data.json").then(r=>r.json()).then((d:TrackerData)=>setBase(d));
    const saved = localStorage.getItem("classic-tracker-additions");
    if (saved) try { setAdded(JSON.parse(saved)); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("classic-tracker-additions", JSON.stringify(added)); }, [added]);

  const data = useMemo(() => base ? {...base, matches:[...base.matches,...added.matches], performances:[...base.performances,...added.performances]} : null,[base,added]);
  const stats = useMemo(() => {
    if(!data) return null;
    const wins=data.matches.filter(m=>m.result==="Win").length;
    const avgDuration=data.matches.reduce((a,m)=>a+m.duration,0)/Math.max(1,data.matches.length);
    const tracked=data.performances.filter(p=>p.tracked);
    const totalKda=tracked.reduce((a,p)=>a+kda(p),0)/Math.max(1,tracked.length);
    return {wins,winRate:wins/data.matches.length,avgDuration,totalKda};
  },[data]);

  if(!data || !stats) return <main className="loading"><div className="crest">C</div><p>Loading the match archive…</p></main>;

  const playerRows=data.performances.filter(p=>p.player===player && p.tracked);
  const playerMatches=playerRows.map(p=>data.matches.find(m=>m.id===p.matchId)).filter(Boolean) as Match[];
  const playerWins=playerMatches.filter(m=>m.result==="Win").length;
  const championMap=Object.values(playerRows.reduce((acc,p)=>{
    const m=data.matches.find(x=>x.id===p.matchId); const c=acc[p.champion]??={name:p.champion,games:0,wins:0,kda:0,cs:0};
    c.games++; c.wins+=m?.result==="Win"?1:0; c.kda+=kda(p); c.cs+=p.cs; return acc;
  },{} as Record<string,{name:string;games:number;wins:number;kda:number;cs:number}>)).sort((a,b)=>b.games-a.games);
  const filteredMatches=data.matches.filter(m=>(resultFilter==="All"||m.result===resultFilter) && (`${m.id} ${m.notes} ${m.date}`).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.id-a.id);

  const exportData=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="classic-match-tracker.json"; a.click(); URL.revokeObjectURL(a.href);
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">C</div><div><b>CLASSIC</b><span>Match Archive</span></div></div>
      <nav aria-label="Primary navigation">
        {([['overview','Overview','⌂'],['players','Players','♙'],['matches','Matches','◫'],['add','Log match','＋']] as [Tab,string,string][]).map(([id,label,icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><i>{icon}</i>{label}</button>)}
      </nav>
      <div className="sidebar-card"><span>ARCHIVE STATUS</span><b>{data.matches.length} matches logged</b><small>{added.matches.length ? `${added.matches.length} saved on this device` : "Workbook data synced"}</small></div>
      <button className="export" onClick={exportData}>⇩ Export archive</button>
    </aside>

    <main className="main">
      <header><div><p className="eyebrow">LEAGUE OF LEGENDS • CLASSIC ERA</p><h1>{tab==="overview"?"Command Center":tab==="players"?"Player Archive":tab==="matches"?"Match History":"Log a Match"}</h1></div><div className="season"><span>Season archive</span><b>Summer 2026</b></div></header>

      {tab==="overview" && <>
        <section className="hero-card"><div><p>THE ARCHIVE</p><h2>Your group’s Classic story,<br/><em>one match at a time.</em></h2><span>Performance, rivalries, and memorable moments from the Rift.</span></div><div className="hero-ring"><b>{pct(stats.winRate)}</b><span>WIN RATE</span></div></section>
        <section className="stats-grid">
          <Stat label="TOTAL MATCHES" value={String(data.matches.length)} detail={`${stats.wins} victories recorded`} />
          <Stat label="OVERALL WIN RATE" value={pct(stats.winRate)} detail={`${data.matches.length-stats.wins} hard-fought losses`} tone="gold" />
          <Stat label="AVERAGE DURATION" value={`${Math.floor(stats.avgDuration)}:${String(Math.round(stats.avgDuration%1*60)).padStart(2,'0')}`} detail="Across the full archive" />
          <Stat label="AVERAGE KDA" value={num(stats.totalKda,2)} detail={`${data.performances.length} performances logged`} />
        </section>
        <section className="dashboard-grid">
          <article className="panel side-panel"><div className="panel-head"><div><p>SIDE PERFORMANCE</p><h3>Blue vs. Purple</h3></div><span>All matches</span></div>
            {['Blue','Purple'].map(side=>{const ms=data.matches.filter(m=>m.side===side),wr=ms.filter(m=>m.result==='Win').length/ms.length;return <div className="side-row" key={side}><div className={`side-icon ${side.toLowerCase()}`}>{side[0]}</div><div><b>{side} Side</b><span>{ms.length} matches</span></div><div className="bar"><i style={{width:pct(wr)}}/></div><strong>{pct(wr)}</strong></div>})}
          </article>
          <article className="panel recent"><div className="panel-head"><div><p>RECENT GAMES</p><h3>Latest from the Rift</h3></div><button onClick={()=>setTab('matches')}>View all →</button></div>
            {data.matches.slice(-5).reverse().map(m=><button className="recent-row" key={m.id} onClick={()=>{setExpanded(m.id);setTab('matches')}}><span className={`result ${m.result.toLowerCase()}`}>{m.result[0]}</span><div><b>Match #{m.id}</b><span>{new Date(m.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} · {m.side} side · {m.duration.toFixed(1)} min</span></div><small>{m.notes||'No notes'}</small><i>›</i></button>)}
          </article>
        </section>
      </>}

      {tab==="players" && <>
        <div className="player-tabs" role="tablist">{data.players.map(p=><button role="tab" aria-selected={p===player} className={p===player?'active':''} onClick={()=>setPlayer(p)} key={p}>{p}</button>)}</div>
        <section className="player-hero"><div className="avatar">{player.split(' ').map(s=>s[0]).join('')}</div><div><p>PLAYER PROFILE</p><h2>{player}</h2><span>{playerRows.length} recorded performances across {new Set(playerRows.map(p=>p.role)).size} roles</span></div><div className="player-kpis"><div><span>WIN RATE</span><b>{playerMatches.length?pct(playerWins/playerMatches.length):'—'}</b></div><div><span>AVG KDA</span><b>{num(playerRows.reduce((a,p)=>a+kda(p),0)/Math.max(1,playerRows.length),2)}</b></div><div><span>MAIN ROLE</span><b>{playerRows.length?Object.entries(playerRows.reduce((a,p)=>(a[p.role]=(a[p.role]||0)+1,a),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1])[0][0]:'—'}</b></div></div></section>
        <section className="panel champion-panel"><div className="panel-head"><div><p>CHAMPION POOL</p><h3>Most-played champions</h3></div></div><div className="champion-grid">{championMap.slice(0,8).map((c,i)=><article key={c.name}><div className="rank">{String(i+1).padStart(2,'0')}</div><div><b>{c.name}</b><span>{c.games} {c.games===1?'game':'games'}</span></div><strong>{pct(c.wins/c.games)}<small>WR</small></strong><em>{num(c.kda/c.games,2)} KDA</em></article>)}</div></section>
      </>}

      {tab==="matches" && <section className="panel matches-panel"><div className="match-tools"><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search matches or notes…"/></label><div>{['All','Win','Loss'].map(x=><button className={resultFilter===x?'active':''} onClick={()=>setResultFilter(x)} key={x}>{x}</button>)}</div></div>
        <div className="match-list">{filteredMatches.map(m=>{const roster=data.performances.filter(p=>p.matchId===m.id);return <article className={expanded===m.id?'expanded':''} key={m.id}><button className="match-summary" onClick={()=>setExpanded(expanded===m.id?null:m.id)}><span className={`result ${m.result.toLowerCase()}`}>{m.result[0]}</span><div><b>Match #{m.id}</b><span>{new Date(m.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div><div><small>SIDE</small><b>{m.side}</b></div><div><small>DURATION</small><b>{m.duration.toFixed(1)} min</b></div><div><small>PARTY</small><b>{m.groupSize} player{m.groupSize===1?'':'s'}</b></div><i>{expanded===m.id?'−':'+'}</i></button>{expanded===m.id&&<div className="match-detail"><p>“{m.notes||'No notes were recorded for this match.'}”</p><div className="roster">{roster.map(p=><div key={p.id}><b>{p.player}</b><span>{p.champion} · {p.role}</span><strong>{p.kills}/{p.deaths}/{p.assists}</strong><small>{p.cs} CS · {p.vision} vision</small></div>)}</div></div>}</article>})}</div>
      </section>}

      {tab==="add" && <AddMatch data={data} onSave={(m,ps)=>{setAdded(a=>({matches:[...a.matches,m],performances:[...a.performances,...ps]}));setTab('matches');setExpanded(m.id)}}/>}
    </main>
  </div>;
}

function AddMatch({data,onSave}:{data:TrackerData,onSave:(m:Match,p:Performance[])=>void}){
  const nextId=Math.max(...data.matches.map(m=>m.id))+1;
  const [date,setDate]=useState(new Date().toISOString().slice(0,10)); const [side,setSide]=useState('Blue'); const [result,setResult]=useState('Win'); const [duration,setDuration]=useState('30'); const [notes,setNotes]=useState('');
  const blank=()=>({player:data.players[0],champion:data.champions[0],role:data.roles[0],kills:0,deaths:0,assists:0,cs:0,vision:0});
  const [rows,setRows]=useState([blank()]);
  const update=(i:number,key:string,value:string|number)=>setRows(rs=>rs.map((r,j)=>j===i?{...r,[key]:value}:r));
  const submit=(e:React.FormEvent)=>{e.preventDefault();const match:Match={id:nextId,date,side,result,duration:Number(duration),groupSize:rows.length,notes};const ps=rows.map((r,i)=>({id:Date.now()+i,matchId:nextId,team:'Ally',tracked:true,...r}));onSave(match,ps)};
  return <form className="add-layout" onSubmit={submit}><section className="panel form-panel"><div className="step"><span>01</span><div><p>MATCH DETAILS</p><h3>Set the scene</h3></div></div><div className="form-grid"><label>Date<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>Ally side<select value={side} onChange={e=>setSide(e.target.value)}><option>Blue</option><option>Purple</option></select></label><label>Result<select value={result} onChange={e=>setResult(e.target.value)}><option>Win</option><option>Loss</option></select></label><label>Duration (minutes)<input min="1" max="120" type="number" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label className="wide">Match notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What made this match memorable?"/></label></div></section>
    <section className="panel form-panel"><div className="step"><span>02</span><div><p>PARTY PERFORMANCE</p><h3>Build the roster</h3></div></div>{rows.map((r,i)=><div className="performance-form" key={i}><b>PLAYER {i+1}</b><label>Player<select value={r.player} onChange={e=>update(i,'player',e.target.value)}>{data.players.map(x=><option key={x}>{x}</option>)}</select></label><label>Champion<select value={r.champion} onChange={e=>update(i,'champion',e.target.value)}>{data.champions.map(x=><option key={x}>{x}</option>)}</select></label><label>Role<select value={r.role} onChange={e=>update(i,'role',e.target.value)}>{data.roles.map(x=><option key={x}>{x}</option>)}</select></label>{(['kills','deaths','assists','cs','vision'] as const).map(k=><label key={k}>{k.toUpperCase()}<input min="0" type="number" value={r[k]} onChange={e=>update(i,k,Number(e.target.value))}/></label>)}{rows.length>1&&<button type="button" className="remove" onClick={()=>setRows(rs=>rs.filter((_,j)=>j!==i))}>×</button>}</div>)}<button type="button" className="add-player" onClick={()=>setRows(rs=>[...rs,blank()])}>＋ Add another player</button></section>
    <div className="save-bar"><div><span>MATCH #{nextId}</span><b>{rows.length} performance{rows.length===1?'':'s'} ready to save</b></div><button type="submit">Save to archive →</button></div></form>
}
