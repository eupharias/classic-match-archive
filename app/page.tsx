"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

type Match = { id:number; date:string; groupSize:number; side:string; result:string; duration:number; notes:string };
type Performance = { id:number; matchId:number; team:string; tracked:boolean; player:string; champion:string; role:string; kills:number; deaths:number; assists:number; cs:number; vision:number };
type TrackerData = { matches:Match[]; performances:Performance[]; players:string[]; champions:string[]; roles:string[] };
type Tab = "overview" | "players" | "matches" | "add";

const supabase=createClient("https://vkxbjvjyfxkrfktdbmsu.supabase.co","sb_publishable_bGA7V1Di86IiVsmYErH3iA_zEnXNLGy");

const kda = (p:Performance) => (p.kills + p.assists) / Math.max(1, p.deaths);
const pct = (n:number) => `${Math.round(n * 100)}%`;
const num = (n:number, digits=1) => Number.isFinite(n) ? n.toFixed(digits) : "—";
const durationInput = (minutes:number) => { const total=Math.round(minutes*60); return `${Math.floor(total/3600)}:${String(Math.floor(total%3600/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`; };
const roleColors:Record<string,string>={Top:'#d89b43',Jungle:'#45a56a',Mid:'#5c92d8',Bot:'#a76bd1',Support:'#d56575'};
const championIcon=(name:string)=>`./champions/${name.toLowerCase().replace(/[^a-z0-9]/g,'')}.png`;

function Stat({label,value,detail,tone}:{label:string;value:string;detail:string;tone?:string}) {
  return <article className={`stat ${tone ?? ""}`}><div className="stat-label">{label}</div><strong>{value}</strong><span>{detail}</span></article>;
}

export default function Home() {
  const [data, setData] = useState<TrackerData|null>(null);
  const [user,setUser]=useState<User|null>(null);
  const [authEmail,setAuthEmail]=useState("");
  const [authMessage,setAuthMessage]=useState("");
  const [tab,setTab] = useState<Tab>("overview");
  const [player,setPlayer] = useState("Dane");
  const [expandedChampion,setExpandedChampion] = useState<string|null>(null);
  const [query,setQuery] = useState("");
  const [resultFilter,setResultFilter] = useState("All");
  const [playerFilters,setPlayerFilters] = useState<string[]>([]);
  const [expanded,setExpanded] = useState<number|null>(null);
  const [editingMatch,setEditingMatch] = useState<number|null>(null);

  const loadData=async()=>{
    const [m,p,pl,c,r]=await Promise.all([
      supabase.from("matches").select("*").order("id"),
      supabase.from("performances").select("*").order("id"),
      supabase.from("players").select("name").order("name"),
      supabase.from("champions").select("name").order("name"),
      supabase.from("roles").select("name").order("name"),
    ]);
    const error=m.error||p.error||pl.error||c.error||r.error;
    if(error){const fallback=await fetch("./tracker-data.json").then(x=>x.json());setData(fallback);return;}
    setData({
      matches:(m.data??[]).map(x=>({id:x.id,date:x.match_date,groupSize:x.friend_group_size,side:x.ally_side,result:x.result,duration:Number(x.duration_minutes),notes:x.notes??""})),
      performances:(p.data??[]).map(x=>({id:x.id,matchId:x.match_id,team:x.team,tracked:x.tracked,player:x.player,champion:x.champion,role:x.role,kills:x.kills,deaths:x.deaths,assists:x.assists,cs:x.cs,vision:x.vision})),
      players:(pl.data??[]).map(x=>x.name),champions:(c.data??[]).map(x=>x.name),roles:(r.data??[]).map(x=>x.name),
    });
  };
  useEffect(()=>{loadData();supabase.auth.getUser().then(({data})=>setUser(data.user));const {data:listener}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user??null));return()=>listener.subscription.unsubscribe();},[]);

  const sendMagicLink=async()=>{setAuthMessage("Sending…");const {error}=await supabase.auth.signInWithOtp({email:authEmail,options:{emailRedirectTo:"https://eupharias.github.io/classic-match-archive/"}});setAuthMessage(error?error.message:"Check your email for the sign-in link.")};
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
  const playerRoleStats=data.roles.map(role=>{const rows=playerRows.filter(p=>p.role===role);const wins=rows.filter(p=>data.matches.find(m=>m.id===p.matchId)?.result==='Win').length;const championCounts=rows.reduce((acc,p)=>(acc[p.champion]=(acc[p.champion]||0)+1,acc),{} as Record<string,number>);const favorite=Object.entries(championCounts).sort((a,b)=>b[1]-a[1])[0];return {role,games:rows.length,wins,favorite:favorite?.[0]??'—',favoriteGames:favorite?.[1]??0}});
  const playerTotals=playerRows.reduce((acc,p)=>({kills:acc.kills+p.kills,deaths:acc.deaths+p.deaths,assists:acc.assists+p.assists}),{kills:0,deaths:0,assists:0});
  let pieCursor=0;const rolePie=playerRoleStats.filter(r=>r.games>0).map(r=>{const start=pieCursor/Math.max(1,playerRows.length)*100;pieCursor+=r.games;const end=pieCursor/Math.max(1,playerRows.length)*100;return `${roleColors[r.role]??'#8ca0ad'} ${start}% ${end}%`}).join(',');
  const filteredMatches=data.matches.filter(m=>(resultFilter==="All"||m.result===resultFilter) && (`${m.id} ${m.notes} ${m.date}`).toLowerCase().includes(query.toLowerCase()) && playerFilters.every(name=>data.performances.some(p=>p.matchId===m.id&&p.player===name))).sort((a,b)=>b.id-a.id);

  const exportData=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="classic-match-tracker.json"; a.click(); URL.revokeObjectURL(a.href);
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><img src="./rabadons-cat-favicon.png" alt="Deathcap cat"/></div><div><b>CLASSIC</b><span>Match Archive</span></div></div>
      <nav aria-label="Primary navigation">
        {([['overview','Overview','⌂'],['players','Players','♙'],['matches','Matches','◫'],['add','Log match','＋']] as [Tab,string,string][]).map(([id,label,icon])=><button key={id} className={tab===id?'active':''} onClick={()=>{if(id==='add')setEditingMatch(null);setTab(id)}}><i>{icon}</i>{label}</button>)}
      </nav>
      <div className="sidebar-card">{user?<><span>SIGNED IN</span><b>{user.email}</b><small>{data.matches.length} shared matches</small><button className="auth-link" onClick={()=>supabase.auth.signOut()}>Sign out</button></>:<><span>CONTRIBUTOR ACCESS</span><b>Sign in to log matches</b><input aria-label="Email address" type="email" placeholder="you@example.com" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}/><button className="auth-link" disabled={!authEmail} onClick={sendMagicLink}>Email me a sign-in link</button>{authMessage&&<small>{authMessage}</small>}</>}</div>
      <button className="export" onClick={exportData}>⇩ Export archive</button>
    </aside>

    <main className="main">
      <header><div><p className="eyebrow">LEAGUE OF LEGENDS • CLASSIC ERA</p><h1>{tab==="overview"?"Command Center":tab==="players"?"Player Archive":tab==="matches"?"Match History":editingMatch?`Edit Match #${editingMatch}`:"Log a Match"}</h1></div><div className="season"><span>Season archive</span><b>Summer 2026</b></div></header>

      {tab==="overview" && <>
        <section className="hero-card"><div><p>THE ARCHIVE</p><h2>WREQELODEON’S Classic story,<br/><em>one match at a time.</em></h2><span>Performances, Metrics, and memorable moments from the Rift.</span></div><div className="hero-ring"><b>{pct(stats.winRate)}</b><span>WIN RATE</span></div></section>
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
        <div className="player-tabs" role="tablist">{data.players.map(p=><button role="tab" aria-selected={p===player} className={p===player?'active':''} onClick={()=>{setPlayer(p);setExpandedChampion(null)}} key={p}>{p}</button>)}</div>
        <section className="player-hero"><div className="avatar">{player.split(' ').map(s=>s[0]).join('')}</div><div><p>PLAYER PROFILE</p><h2>{player}</h2><span>{playerRows.length} recorded performances across {new Set(playerRows.map(p=>p.role)).size} roles</span></div><div className="player-kpis"><div><span>WIN RATE</span><b>{playerMatches.length?pct(playerWins/playerMatches.length):'—'}</b></div><div><span>AVG KDA</span><b>{num((playerTotals.kills+playerTotals.assists)/Math.max(1,playerTotals.deaths),2)}</b></div><div><span>MAIN ROLE</span><b>{playerRows.length?Object.entries(playerRows.reduce((a,p)=>(a[p.role]=(a[p.role]||0)+1,a),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1])[0][0]:'—'}</b></div></div></section>
        <section className="player-overall"><div className="panel role-summary"><div className="panel-head"><div><p>ROLE PERFORMANCE</p><h3>Overall role breakdown</h3></div></div><div className="role-summary-grid">{playerRoleStats.map(role=><article key={role.role}><div><b>{role.role}</b><span>{role.games} {role.games===1?'match':'matches'}</span></div><div><small>WIN RATE</small><strong>{role.games?pct(role.wins/role.games):'—'}</strong></div><div><small>MOST PLAYED</small><strong className="favorite-champion">{role.favoriteGames>0&&<img src={championIcon(role.favorite)} alt=""/>}{role.favorite}</strong>{role.favoriteGames>0&&<span>{role.favoriteGames} {role.favoriteGames===1?'game':'games'}</span>}</div></article>)}</div></div><div className="panel role-distribution"><div className="panel-head"><div><p>ROLE DISTRIBUTION</p><h3>Matches by role</h3></div></div><div className="role-pie-wrap"><div className="role-pie" role="img" aria-label={playerRoleStats.filter(r=>r.games).map(r=>`${r.role}: ${r.games} matches`).join(', ')} style={{background:`conic-gradient(${rolePie||'#203746 0% 100%'})`}}><span><b>{playerRows.length}</b><small>MATCHES</small></span></div><div className="role-legend">{playerRoleStats.filter(r=>r.games>0).map(r=><div key={r.role}><i style={{background:roleColors[r.role]}}/><span>{r.role}</span><b>{pct(r.games/Math.max(1,playerRows.length))}</b></div>)}</div></div></div><div className="panel career-totals"><div className="panel-head"><div><p>CAREER TOTALS</p><h3>Combat record</h3></div></div><div className="career-grid"><div><span>KILLS</span><b>{playerTotals.kills}</b></div><div><span>DEATHS</span><b>{playerTotals.deaths}</b></div><div><span>ASSISTS</span><b>{playerTotals.assists}</b></div><div><span>TOTAL KDA</span><b>{num((playerTotals.kills+playerTotals.assists)/Math.max(1,playerTotals.deaths),2)}</b></div></div></div></section>
        <section className="panel champion-panel"><div className="panel-head"><div><p>CHAMPION POOL</p><h3>Most-played champions</h3></div></div><div className="champion-grid">{championMap.slice(0,8).map((c,i)=>{const championRows=playerRows.filter(row=>row.champion===c.name);const recentChampionRows=[...championRows].sort((a,b)=>b.matchId-a.matchId).slice(0,10);const roleStats=Object.values(championRows.reduce((acc,row)=>{const match=data.matches.find(m=>m.id===row.matchId);const role=acc[row.role]??={name:row.role,games:0,wins:0};role.games++;role.wins+=match?.result==='Win'?1:0;return acc},{} as Record<string,{name:string;games:number;wins:number}>)).sort((a,b)=>b.games-a.games);const totalMinutes=championRows.reduce((sum,row)=>sum+(data.matches.find(m=>m.id===row.matchId)?.duration??0),0);const csPerMinute=championRows.reduce((sum,row)=>sum+row.cs,0)/Math.max(1,totalMinutes);const visionPerMinute=championRows.reduce((sum,row)=>sum+row.vision,0)/Math.max(1,totalMinutes);const isOpen=expandedChampion===c.name;return <article className={isOpen?'expanded':''} key={c.name}><button className="champion-summary" type="button" aria-expanded={isOpen} onClick={()=>setExpandedChampion(isOpen?null:c.name)}><div className="rank">{String(i+1).padStart(2,'0')}</div><div className="champion-name"><img src={championIcon(c.name)} alt=""/><span><b>{c.name}</b><small>{c.games} {c.games===1?'game':'games'}</small></span></div><strong>{pct(c.wins/c.games)}<small>WR</small></strong><em>{num(c.kda/c.games,2)} KDA</em><i>{isOpen?'−':'+'}</i></button>{isOpen&&<div className="champion-detail"><div className="role-chart"><p>ROLE BREAKDOWN</p>{roleStats.map(role=><div className="role-bar" key={role.name}><b>{role.name}</b><div aria-label={`${pct(role.wins/role.games)} wins and ${pct(1-role.wins/role.games)} losses`}><i className="role-wins" style={{width:pct(role.wins/role.games)}}/><i className="role-losses" style={{width:pct(1-role.wins/role.games)}}/></div><span>{role.games} {role.games===1?'game':'games'}</span><strong>{pct(role.wins/role.games)} WR</strong></div>)}</div><div className="champion-metrics"><div><span>AVERAGE<br/>CS / MIN</span><b>{num(csPerMinute,2)}</b></div><div><span>AVERAGE<br/>VISION / MIN</span><b>{num(visionPerMinute,2)}</b></div><div><span>AVERAGE<br/>KDA</span><b>{num(c.kda/c.games,2)}</b></div></div><div className="champion-match-history"><div className="champion-history-head"><div><p>RECENT MATCHES</p><h4>Last {recentChampionRows.length} with {c.name}</h4></div><span>Select a match to view details</span></div><div className="champion-history-list">{recentChampionRows.map(row=>{const match=data.matches.find(m=>m.id===row.matchId)!;return <button type="button" key={row.id} onClick={()=>{setExpanded(match.id);setTab('matches')}}><span className={`result ${match.result.toLowerCase()}`}>{match.result[0]}</span><div><b>Match #{match.id}</b><small>{new Date(match.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</small></div><div><small>ROLE</small><b>{row.role}</b></div><div><small>K / D / A</small><b>{row.kills} / {row.deaths} / {row.assists}</b></div><div><small>CS · VISION</small><b>{row.cs} · {row.vision}</b></div><i>›</i></button>})}</div></div></div>}</article>})}</div></section>
      </>}

      {tab==="matches" && <section className="panel matches-panel"><div className="match-tools"><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search matches or notes…"/></label><div className="match-filters"><details className="player-filter"><summary>{playerFilters.length?`${playerFilters.length} player${playerFilters.length===1?'':'s'} selected`:'All players'}<i>▾</i></summary><div className="player-filter-menu"><div><b>PLAYERS PRESENT</b>{playerFilters.length>0&&<button type="button" onClick={()=>setPlayerFilters([])}>Clear</button>}</div>{data.players.map(name=><label key={name}><input type="checkbox" checked={playerFilters.includes(name)} onChange={()=>setPlayerFilters(current=>current.includes(name)?current.filter(x=>x!==name):[...current,name])}/><span>{name}</span></label>)}</div></details><div className="result-buttons">{['All','Win','Loss'].map(x=><button className={resultFilter===x?'active':''} onClick={()=>setResultFilter(x)} key={x}>{x}</button>)}</div></div></div>
        <div className="match-list">{filteredMatches.map(m=>{const roster=data.performances.filter(p=>p.matchId===m.id);return <article className={expanded===m.id?'expanded':''} key={m.id}><button className="match-summary" onClick={()=>setExpanded(expanded===m.id?null:m.id)}><span className={`result ${m.result.toLowerCase()}`}>{m.result[0]}</span><div><b>Match #{m.id}</b><span>{new Date(m.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div><div><small>SIDE</small><b>{m.side}</b></div><div><small>DURATION</small><b>{durationInput(m.duration)}</b></div><div><small>PARTY</small><b>{m.groupSize} player{m.groupSize===1?'':'s'}</b></div><i>{expanded===m.id?'−':'+'}</i></button>{expanded===m.id&&<div className="match-detail"><div className="match-detail-head"><p>“{m.notes||'No notes were recorded for this match.'}”</p>{user&&<button onClick={()=>{setEditingMatch(m.id);setTab('add')}}>Edit match</button>}</div><div className="roster">{roster.map(p=><div key={p.id}><img className="champion-icon" src={championIcon(p.champion)} alt=""/><div className="roster-info"><b>{p.player}</b><span>{p.champion} · {p.role}</span></div><strong>{p.kills}/{p.deaths}/{p.assists}</strong><small>{p.cs} CS · {p.vision} vision</small></div>)}</div></div>}</article>})}</div>
      </section>}

      {tab==="add" && (user?<AddMatch data={data} initial={editingMatch?data.matches.find(m=>m.id===editingMatch):undefined} initialPerformances={editingMatch?data.performances.filter(p=>p.matchId===editingMatch):undefined} onCancel={editingMatch?()=>{setEditingMatch(null);setTab('matches')}:undefined} onSave={async(m,ps)=>{const payload={match_date:m.date,friend_group_size:m.groupSize,ally_side:m.side,result:m.result,duration_minutes:m.duration,notes:m.notes};const performances=ps.map(({player,champion,role,kills,deaths,assists,cs,vision})=>({player,champion,role,kills,deaths,assists,cs,vision}));const {data:savedId,error}=editingMatch?await supabase.rpc("update_match_with_performances",{target_match_id:editingMatch,match_data:payload,performance_data:performances}):await supabase.rpc("create_match_with_performances",{match_data:payload,performance_data:performances});if(error)throw error;await loadData();setEditingMatch(null);setTab('matches');setExpanded(Number(savedId));}}/>:<section className="panel signin-gate"><div className="crest">C</div><p>CONTRIBUTOR ACCESS</p><h2>Sign in to log a match</h2><span>We’ll send you a secure magic link—no password needed.</span><div className="gate-auth"><input aria-label="Email address" type="email" placeholder="you@example.com" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}/><button disabled={!authEmail} onClick={sendMagicLink}>Email me a sign-in link</button>{authMessage&&<small>{authMessage}</small>}</div></section>)}
      <footer className="riot-notice">Classic Match Archive is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</footer>
    </main>
  </div>;
}

function AddMatch({data,initial,initialPerformances,onSave,onCancel}:{data:TrackerData,initial?:Match,initialPerformances?:Performance[],onSave:(m:Match,p:Performance[])=>Promise<void>,onCancel?:()=>void}){
  const nextId=initial?.id??Math.max(...data.matches.map(m=>m.id))+1;
  const [date,setDate]=useState(initial?.date??new Date().toISOString().slice(0,10)); const [side,setSide]=useState(initial?.side??'Blue'); const [result,setResult]=useState(initial?.result??'Win'); const [duration,setDuration]=useState(initial?durationInput(initial.duration):'0:30:00'); const [notes,setNotes]=useState(initial?.notes??'');
  const blank=()=>({player:data.players[0],champion:data.champions[0],role:data.roles[0],kills:0,deaths:0,assists:0,cs:0,vision:0});
  const [rows,setRows]=useState(initialPerformances?.length?initialPerformances.map(({player,champion,role,kills,deaths,assists,cs,vision})=>({player,champion,role,kills,deaths,assists,cs,vision})):[blank()]);
  const [saving,setSaving]=useState(false); const [saveError,setSaveError]=useState("");
  const update=(i:number,key:string,value:string|number)=>setRows(rs=>rs.map((r,j)=>j===i?{...r,[key]:value}:r));
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setSaveError("");const [hours,minutes,seconds]=duration.split(':').map(Number);const durationMinutes=(hours*3600+minutes*60+seconds)/60;const match:Match={id:nextId,date,side,result,duration:durationMinutes,groupSize:rows.length,notes};const ps=rows.map((r,i)=>({id:Date.now()+i,matchId:nextId,team:'Ally',tracked:true,...r}));try{await onSave(match,ps)}catch(err){setSaveError(err instanceof Error?err.message:"The match could not be saved.");setSaving(false)}};
  return <form className="add-layout" onSubmit={submit}><section className="panel form-panel"><div className="step"><span>01</span><div><p>MATCH DETAILS</p><h3>Set the scene</h3></div></div><div className="form-grid"><label>Date<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>Ally side<select value={side} onChange={e=>setSide(e.target.value)}><option>Blue</option><option>Purple</option></select></label><label>Result<select value={result} onChange={e=>setResult(e.target.value)}><option>Win</option><option>Loss</option></select></label><label>Duration (H:MM:SS)<input aria-label="Match duration in hours, minutes, and seconds" required type="text" inputMode="numeric" pattern="[0-9]+:[0-5][0-9]:[0-5][0-9]" placeholder="0:30:00" title="Enter the duration as H:MM:SS, for example 0:30:45" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label className="wide">Match notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What made this match memorable?"/></label></div></section>
    <section className="panel form-panel"><div className="step"><span>02</span><div><p>PARTY PERFORMANCE</p><h3>Build the roster</h3></div></div>{rows.map((r,i)=><div className="performance-form" key={i}><b>PLAYER {i+1}</b><label>Player<select value={r.player} onChange={e=>update(i,'player',e.target.value)}>{data.players.map(x=><option key={x}>{x}</option>)}</select></label><label>Champion<div className="champion-select"><img src={championIcon(r.champion)} alt=""/><select value={r.champion} onChange={e=>update(i,'champion',e.target.value)}>{data.champions.map(x=><option key={x}>{x}</option>)}</select></div></label><label>Role<select value={r.role} onChange={e=>update(i,'role',e.target.value)}>{data.roles.map(x=><option key={x}>{x}</option>)}</select></label>{(['kills','deaths','assists','cs','vision'] as const).map(k=><label key={k}>{k.toUpperCase()}<input min="0" type="number" value={r[k]} onChange={e=>update(i,k,Number(e.target.value))}/></label>)}{rows.length>1&&<button type="button" className="remove" onClick={()=>setRows(rs=>rs.filter((_,j)=>j!==i))}>×</button>}</div>)}<button type="button" className="add-player" onClick={()=>setRows(rs=>[...rs,blank()])}>＋ Add another player</button></section>
    <div className="save-bar"><div><span>{initial?'EDITING':'NEW'} MATCH #{nextId}</span><b>{saveError||`${rows.length} performance${rows.length===1?'':'s'} ready to save`}</b></div><div className="save-actions">{onCancel&&<button className="cancel-edit" type="button" onClick={onCancel}>Cancel</button>}<button type="submit" disabled={saving}>{saving?'Saving…':initial?'Save changes →':'Save to archive →'}</button></div></div></form>
}
