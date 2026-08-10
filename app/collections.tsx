"use client";

import { useMemo, useState, type CSSProperties } from "react";
import catalog from "./data/classic-items.json";
import championCatalog from "./data/classic-champions.json";

type ArchiveData={matches:Array<{id:number;groupSize:number;result:string;duration:number}>;performances:Array<{matchId:number;tracked:boolean;player:string;champion:string;role:string;kills:number;deaths:number;assists:number;cs:number;vision:number;items?:Array<{itemId:number;quantity:number}>}>};
type ChampionRecord={
  id:string;key:string;name:string;title:string;image:{full:string};
  skins:Array<{id:string;num:number;name:string;chromas:boolean;parentSkin?:number}>;
  lore:string;blurb:string;allytips:string[];enemytips:string[];tags:string[];partype:string;
  info:Record<string,number>;stats:Record<string,number>;
  spells:Array<{id:string;name:string;description:string;tooltip:string;maxrank:number;cooldownBurn:string;costBurn:string;rangeBurn:string;resource:string;image:{full:string}}>;
  passive:{name:string;description:string;image:{full:string}};
};
type ChampionSort="player"|"matches"|"winRate"|"kills"|"deaths"|"assists"|"kda"|"cs"|"vision";

type ItemRecord = {
  name:string;
  description?:string;
  colloq?:string;
  plaintext?:string;
  from?:string[];
  into?:string[];
  image:{full:string;sprite:string;group:string;x:number;y:number;w:number;h:number};
  gold:{base:number;purchasable:boolean;total:number;sell:number};
  tags?:string[];
  maps?:Record<string,boolean>;
  stats?:Record<string,number>;
  effect?:Record<string,string>;
  depth?:number;
  [key:string]:unknown;
};

const items=Object.entries(catalog.data as Record<string,ItemRecord>).map(([id,item])=>({id,...item}));
const imageUrl=(id:string)=>`https://ddragon.leagueoflegends.com/cdn/${catalog.version}/img/item/${id}.png`;
const statLabels:Record<string,string>={
  FlatHPPoolMod:"Health",FlatMPPoolMod:"Mana",FlatPhysicalDamageMod:"Attack damage",FlatMagicDamageMod:"Ability power",
  FlatArmorMod:"Armor",FlatSpellBlockMod:"Magic resistance",PercentAttackSpeedMod:"Attack speed",FlatCritChanceMod:"Critical strike chance",
  PercentMovementSpeedMod:"Movement speed",FlatMovementSpeedMod:"Movement speed",PercentLifeStealMod:"Life steal",
  FlatHPRegenMod:"Health regeneration",FlatMPRegenMod:"Mana regeneration",
};
const percentStats=new Set(["PercentAttackSpeedMod","FlatCritChanceMod","PercentMovementSpeedMod","PercentLifeStealMod"]);
const prettyStat=(key:string,value:number)=>`${percentStats.has(key)?`${Math.round(value*100)}%`:Number.isInteger(value)?value:value.toFixed(2)} ${statLabels[key]??key.replace(/([A-Z])/g," $1").trim()}`;
const category=(item:ItemRecord)=>!item.gold.purchasable?"Unavailable":item.tags?.includes("Consumable")?"Consumables":item.tags?.includes("Boots")?"Boots":item.depth&&item.depth>=3?"Completed":item.from?.length?"Upgrades":"Components";
const categoryOrder=["All","Completed","Components","Upgrades","Boots","Consumables","Unavailable"];

const champions=Object.values(championCatalog.data as Record<string,ChampionRecord>).sort((a,b)=>a.name.localeCompare(b.name));
const championPortrait=(champion:ChampionRecord)=>`https://ddragon.leagueoflegends.com/cdn/${championCatalog.version}/img/mode/classic/champion/${champion.image.full}`;
const championAsset=(group:"spell"|"passive",file:string)=>`https://ddragon.leagueoflegends.com/cdn/${championCatalog.version}/img/mode/classic/${group}/${file}`;
const playerLabels:Record<string,string>={Austin:"sweetberryW","Blake D.":"Retrax","Blake G.":"Kelando",Dane:"Bishop",Jake:"Rook",Kaleb:"Tokoyami",Rachel:"Amicias",Steven:"Knada",Zach:"Valabrax"};
const statNames:Record<string,string>={hp:"Health",hpperlevel:"Health / level",mp:"Resource",mpperlevel:"Resource / level",movespeed:"Move speed",armor:"Armor",armorperlevel:"Armor / level",spellblock:"Magic resist",spellblockperlevel:"Magic resist / level",attackrange:"Attack range",hpregen:"Health regen",hpregenperlevel:"Health regen / level",mpregen:"Resource regen",mpregenperlevel:"Resource regen / level",crit:"Critical chance",critperlevel:"Critical / level",attackdamage:"Attack damage",attackdamageperlevel:"Attack damage / level",attackspeed:"Attack speed",attackspeedperlevel:"Attack speed / level"};
const championStatKeys=["hp","hpperlevel","mp","mpperlevel","movespeed","armor","armorperlevel","spellblock","spellblockperlevel","attackrange","hpregen","hpregenperlevel","mpregen","mpregenperlevel","crit","critperlevel","attackdamage","attackdamageperlevel","attackspeed","attackspeedperlevel"] as const;
type ChampionStatKey=typeof championStatKeys[number];

function ChampionComparisons(){
  const classes=Array.from(new Set(champions.flatMap(champion=>champion.tags))).sort();
  const [selectedClasses,setSelectedClasses]=useState<string[]>([]);
  const [visibleStats,setVisibleStats]=useState<ChampionStatKey[]>([...championStatKeys]);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [sort,setSort]=useState<{column:"name"|ChampionStatKey;direction:1|-1}>({column:"name",direction:1});
  const filtered=champions.filter(champion=>!selectedClasses.length||champion.tags.some(tag=>selectedClasses.includes(tag))).sort((a,b)=>{const av=sort.column==="name"?a.name.toLowerCase():Number(a.stats[sort.column]??0);const bv=sort.column==="name"?b.name.toLowerCase():Number(b.stats[sort.column]??0);return (typeof av==="string"?av.localeCompare(String(bv)):av-Number(bv))*sort.direction});
  const toggleClass=(value:string)=>setSelectedClasses(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value]);
  const toggleStat=(value:ChampionStatKey)=>setVisibleStats(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value]);
  const setColumn=(column:"name"|ChampionStatKey)=>setSort(current=>({column,direction:current.column===column?(current.direction===1?-1:1):column==="name"?1:-1}));
  const arrow=(column:"name"|ChampionStatKey)=>sort.column===column?(sort.direction===1?"▲":"▼"):"↕";
  return <section className="champion-comparisons">
    <div className="comparison-controls"><div><span>FILTER BY CLASS · OR LOGIC</span><div className="comparison-class-filters">{classes.map(value=><button type="button" className={selectedClasses.includes(value)?"active":""} aria-pressed={selectedClasses.includes(value)} onClick={()=>toggleClass(value)} key={value}>{value}</button>)}{selectedClasses.length>0&&<button type="button" className="clear" onClick={()=>setSelectedClasses([])}>Clear</button>}</div></div><b>{filtered.length} champions</b></div>
    <div className="comparison-table-wrap">
      <div className="comparison-settings"><button type="button" aria-label="Configure comparison columns" aria-expanded={settingsOpen} onClick={()=>setSettingsOpen(value=>!value)}>⚙</button>{settingsOpen&&<aside><header><b>TABLE COLUMNS</b><button type="button" onClick={()=>setSettingsOpen(false)}>×</button></header><p>Select the statistics to display.</p><div>{championStatKeys.map(key=><label key={key}><input type="checkbox" checked={visibleStats.includes(key)} onChange={()=>toggleStat(key)}/><span>{statNames[key]}</span></label>)}</div><footer><button type="button" onClick={()=>setVisibleStats([...championStatKeys])}>Show all</button><button type="button" onClick={()=>setVisibleStats([])}>Hide all stats</button></footer></aside>}</div>
      <div className="comparison-table" style={{"--comparison-columns":`42px 230px 150px ${visibleStats.map(()=>"minmax(118px,1fr)").join(" ")}`} as CSSProperties}>
        <div className="comparison-heading"><span className="gear-space"/><button type="button" onClick={()=>setColumn("name")}>CHAMPION <i>{arrow("name")}</i></button><span>CLASS</span>{visibleStats.map(key=><button type="button" onClick={()=>setColumn(key)} key={key}>{statNames[key].toUpperCase()} <i>{arrow(key)}</i></button>)}</div>
        {filtered.map(champion=><div className="comparison-row" key={champion.id}><span/><div className="comparison-champion"><img src={championPortrait(champion)} alt=""/><b>{champion.name}</b></div><span>{champion.tags.join(" · ")}</span>{visibleStats.map(key=><strong key={key}>{Number(champion.stats[key]??0).toLocaleString(undefined,{maximumFractionDigits:3})}</strong>)}</div>)}
      </div>
    </div>
  </section>
}

function ChampionsCollection({archive}:{archive:ArchiveData}) {
  const [championView,setChampionView]=useState<"details"|"comparisons">("details");
  const [query,setQuery]=useState("");
  const [tag,setTag]=useState("All classes");
  const [resource,setResource]=useState("All resources");
  const [selectedId,setSelectedId]=useState(champions[0].id);
  const [role,setRole]=useState("All roles");
  const [sort,setSort]=useState<{column:ChampionSort;direction:1|-1}>({column:"matches",direction:-1});
  const classOptions=["All classes",...Array.from(new Set(champions.flatMap(champion=>champion.tags))).sort()];
  const resourceOptions=["All resources",...Array.from(new Set(champions.map(champion=>champion.partype))).sort()];
  const filtered=champions.filter(champion=>(!query||`${champion.name} ${champion.title} ${champion.blurb}`.toLowerCase().includes(query.toLowerCase()))&&(tag==="All classes"||champion.tags.includes(tag))&&(resource==="All resources"||champion.partype===resource));
  const selected=champions.find(champion=>champion.id===selectedId)??filtered[0]??champions[0];
  const groupMatches=archive.matches.filter(match=>match.groupSize>=2);
  const groupMatchIds=new Set(groupMatches.map(match=>match.id));
  const championRows=archive.performances.filter(row=>row.tracked&&row.champion===selected.name&&groupMatchIds.has(row.matchId));
  const roles=Array.from(new Set(championRows.map(row=>row.role))).sort();
  const tableRows=Array.from(new Set(championRows.filter(row=>role==="All roles"||row.role===role).map(row=>row.player))).map(player=>{
    const rows=championRows.filter(row=>row.player===player&&(role==="All roles"||row.role===role));
    const matches=rows.length;const wins=rows.filter(row=>groupMatches.find(match=>match.id===row.matchId)?.result==="Win").length;
    const totals=rows.reduce((all,row)=>({kills:all.kills+row.kills,deaths:all.deaths+row.deaths,assists:all.assists+row.assists,cs:all.cs+row.cs,vision:all.vision+row.vision,minutes:all.minutes+(groupMatches.find(match=>match.id===row.matchId)?.duration??0)}),{kills:0,deaths:0,assists:0,cs:0,vision:0,minutes:0});
    return {player,matches,winRate:wins/Math.max(1,matches),kills:totals.kills/matches,deaths:totals.deaths/matches,assists:totals.assists/matches,kda:(totals.kills+totals.assists)/Math.max(1,totals.deaths),cs:totals.cs/Math.max(1,totals.minutes),vision:totals.vision/Math.max(1,totals.minutes)};
  }).sort((a,b)=>{const av=sort.column==="player"?(playerLabels[a.player]??a.player).toLowerCase():a[sort.column];const bv=sort.column==="player"?(playerLabels[b.player]??b.player).toLowerCase():b[sort.column];return (typeof av==="string"?av.localeCompare(String(bv)):av-Number(bv))*sort.direction});
  const setColumn=(column:ChampionSort)=>setSort(current=>({column,direction:current.column===column?(current.direction===-1?1:-1):column==="player"?1:-1}));
  const championMatches=Array.from(new Set(championRows.map(row=>row.matchId)));
  const championWins=championMatches.filter(id=>groupMatches.find(match=>match.id===id)?.result==="Win").length;
  const itemCounts=new Map<number,number>();championRows.forEach(row=>row.items?.forEach(entry=>itemCounts.set(entry.itemId,(itemCounts.get(entry.itemId)??0)+entry.quantity)));
  const topItems=[...itemCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
  const roleCounts=roles.map(name=>({name,count:championRows.filter(row=>row.role===name).length})).sort((a,b)=>b.count-a.count);
  const Heading=({column,label}:{column:ChampionSort;label:string})=><button type="button" onClick={()=>setColumn(column)}>{label}<i>{sort.column===column?(sort.direction===-1?'▼':'▲'):'↕'}</i></button>;

  return <section className="panel collection-panel champion-collection">
    <div className="panel-head collection-heading"><div><p>COLLECTIONS · CHAMPIONS</p><h3>League Classic Roster</h3></div><div><span>DATA DRAGON</span><b>Patch {championCatalog.version}</b><small>{championCatalog.championCount} complete champion records</small></div></div>
    <div className="collection-intro"><p>Explore Riot’s mode-specific League Classic roster, including Classic differences, lore, base and growth stats, abilities, rank scaling, artwork metadata, and skins—paired with this archive’s group-match history.</p><span>Last synchronized {new Date(championCatalog.generatedAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span></div>
    <div className="champion-subtabs" role="tablist" aria-label="Champion collection views"><button type="button" role="tab" aria-selected={championView==="details"} className={championView==="details"?"active":""} onClick={()=>setChampionView("details")}>Champion Details</button><button type="button" role="tab" aria-selected={championView==="comparisons"} className={championView==="comparisons"?"active":""} onClick={()=>setChampionView("comparisons")}>Comparisons</button></div>
    {championView==="comparisons"?<ChampionComparisons/>:<>
    <div className="item-controls champion-controls"><label><span>SEARCH THE ROSTER</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Champion, title, or Classic difference"/></label><label><span>CLASS</span><select value={tag} onChange={event=>setTag(event.target.value)}>{classOptions.map(value=><option key={value}>{value}</option>)}</select></label><label><span>RESOURCE</span><select value={resource} onChange={event=>setResource(event.target.value)}>{resourceOptions.map(value=><option key={value}>{value}</option>)}</select></label><div className="item-result-count"><b>{filtered.length}</b><span>champions shown</span></div></div>
    <div className="champion-browser"><div className="champion-roster-grid">{filtered.map(champion=><button type="button" className={selected.id===champion.id?"selected":""} onClick={()=>{setSelectedId(champion.id);setRole("All roles")}} key={champion.id}><img src={championPortrait(champion)} alt=""/><span><b>{champion.name}</b><small>{champion.title}</small></span><i>{champion.tags.join(" · ")}</i></button>)}</div>
    <article className="champion-profile"><header><img src={championPortrait(selected)} alt={`${selected.name} portrait`}/><div><p>{selected.tags.join(" · ")} · {selected.partype}</p><h4>{selected.name}</h4><b>{selected.title}</b><span>{selected.lore}</span></div></header><section className="classic-differences"><p>WHAT’S DIFFERENT IN CLASSIC</p><div dangerouslySetInnerHTML={{__html:selected.blurb||"No mode-specific differences supplied."}}/></section><div className="champion-rating-grid">{Object.entries(selected.info).map(([name,value])=><div key={name}><span>{name}</span><b>{value}/10</b><i><em style={{width:`${value*10}%`}}/></i></div>)}</div></article></div>
    <div className="champion-reference-grid"><section><div className="champion-section-head"><p>BASE ATTRIBUTES</p><h4>Statistics and growth</h4></div><div className="champion-stat-grid">{Object.entries(selected.stats).map(([name,value])=><div key={name}><span>{statNames[name]??name}</span><b>{Number(value).toLocaleString()}</b></div>)}</div></section><section><div className="champion-section-head"><p>ABILITY KIT</p><h4>Passive and spells</h4></div><div className="ability-list"><article><img src={championAsset("passive",selected.passive.image.full)} alt=""/><div><small>PASSIVE</small><b>{selected.passive.name}</b><p>{selected.passive.description}</p></div></article>{selected.spells.map((spell,index)=><article key={spell.id}><img src={championAsset("spell",spell.image.full)} alt=""/><div><small>{["Q","W","E","R"][index]} · {spell.maxrank} RANKS</small><b>{spell.name}</b><p>{spell.description}</p><dl><span><dt>Cooldown</dt><dd>{spell.cooldownBurn}s</dd></span><span><dt>Cost</dt><dd>{spell.costBurn||"None"}</dd></span><span><dt>Range</dt><dd>{spell.rangeBurn}</dd></span></dl></div></article>)}</div></section></div>
    <section className="champion-skins"><div className="champion-section-head"><p>SKIN CATALOG</p><h4>{selected.skins.length} supplied records</h4></div><div>{selected.skins.map(skin=><span key={skin.id}><b>{skin.name}</b><small>#{skin.num}{skin.parentSkin!==undefined?` · Variant of #${skin.parentSkin}`:""}{skin.chromas?" · Chromas":""}</small></span>)}</div></section>
    <section className="champion-archive-stats"><div className="champion-section-head"><p>ARCHIVE STATISTICS</p><h4>{selected.name} in WREQ group matches</h4></div><div className="champion-archive-kpis"><div><span>MATCHES</span><b>{championMatches.length}</b></div><div><span>WIN RATE</span><b>{championMatches.length?`${Math.round(championWins/championMatches.length*100)}%`:"—"}</b></div><div><span>PLAYERS</span><b>{new Set(championRows.map(row=>row.player)).size}</b></div><div><span>ROLE DISTRIBUTION</span><b>{roleCounts.map(entry=>`${entry.name} ${entry.count}`).join(" · ")||"—"}</b></div></div>{topItems.length>0&&<div className="champion-top-items"><span>MOST RECORDED FINAL ITEMS</span><div>{topItems.map(([id,count])=>{const item=(catalog.data as Record<string,ItemRecord>)[String(id)];return <span key={id}><img src={imageUrl(String(id))} alt=""/><b>{item?.name??`Item ${id}`}</b><small>{count} recorded</small></span>})}</div></div>}
      <div className="champion-player-table-head"><div><b>PLAYER PERFORMANCE</b><span>Click any column to sort</span></div><label>ROLE<select value={role} onChange={event=>setRole(event.target.value)}><option>All roles</option>{roles.map(value=><option key={value}>{value}</option>)}</select></label></div>
      <div className="champion-player-table"><div className="champion-player-heading"><span>#</span><Heading column="player" label="PLAYER"/><Heading column="matches" label="MATCHES"/><Heading column="winRate" label="WIN RATE"/><Heading column="kills" label="AVG KILLS"/><Heading column="deaths" label="AVG DEATHS"/><Heading column="assists" label="AVG ASSISTS"/><Heading column="kda" label="KDA"/><Heading column="cs" label="CS / MIN"/><Heading column="vision" label="VISION / MIN"/></div>{tableRows.map((row,index)=><div className="champion-player-row" key={row.player}><span>{String(index+1).padStart(2,"0")}</span><b>{playerLabels[row.player]??row.player}</b><strong>{row.matches}</strong><strong>{Math.round(row.winRate*100)}%</strong><strong>{row.kills.toFixed(2)}</strong><strong>{row.deaths.toFixed(2)}</strong><strong>{row.assists.toFixed(2)}</strong><strong>{row.kda.toFixed(2)}</strong><strong>{row.cs.toFixed(2)}</strong><strong>{row.vision.toFixed(2)}</strong></div>)}{!tableRows.length&&<div className="champion-table-empty">No archived group performances match this champion and role.</div>}</div>
    </section>
    <a className="item-source-link champion-source-link" href={championCatalog.sourceUrl} target="_blank" rel="noreferrer">View official League Classic champion source ↗</a>
    </>}
  </section>;
}

export default function CollectionsArchive({data}:{data:ArchiveData}) {
  const [collection,setCollection]=useState<"champions"|"items">("champions");
  const [query,setQuery]=useState("");
  const [itemCategory,setItemCategory]=useState("All");
  const [tag,setTag]=useState("All tags");
  const [selectedId,setSelectedId]=useState("773046");
  const tags=useMemo(()=>["All tags",...Array.from(new Set(items.flatMap(item=>item.tags??[]))).sort()],[]);
  const filtered=useMemo(()=>items.filter(item=>{
    const haystack=`${item.name} ${item.plaintext??""} ${item.tags?.join(" ")??""} ${item.id}`.toLowerCase();
    return (!query||haystack.includes(query.toLowerCase()))&&(itemCategory==="All"||category(item)===itemCategory)&&(tag==="All tags"||item.tags?.includes(tag));
  }).sort((a,b)=>(b.gold.purchasable?1:0)-(a.gold.purchasable?1:0)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id)),[query,itemCategory,tag]);
  const selected=(items.find(item=>item.id===selectedId)??filtered[0]??items[0]);
  const components=(selected.from??[]).map(id=>items.find(item=>item.id===id)).filter(Boolean) as Array<ItemRecord&{id:string}>;
  const upgrades=(selected.into??[]).map(id=>items.find(item=>item.id===id)).filter(Boolean) as Array<ItemRecord&{id:string}>;
  const knownFields=new Set(["id","name","description","colloq","plaintext","from","into","image","gold","tags","maps","stats","effect","depth"]);
  const additional=Object.entries(selected).filter(([key,value])=>!knownFields.has(key)&&value!==undefined&&value!==null);

  return <section className="collections-archive">
    <div className="collection-tabs" role="tablist" aria-label="Collection categories">
      <button type="button" role="tab" aria-selected={collection==="champions"} className={collection==="champions"?"active":""} onClick={()=>setCollection("champions")}><i>♛</i><span><b>Champions</b><small>{championCatalog.championCount} records</small></span></button>
      <button type="button" role="tab" aria-selected={collection==="items"} className={collection==="items"?"active":""} onClick={()=>setCollection("items")}><i>◆</i><span><b>Items</b><small>{catalog.itemCount} records</small></span></button>
    </div>
    {collection==="champions"?<ChampionsCollection archive={data}/>:<section className="panel collection-panel">
      <div className="panel-head collection-heading"><div><p>COLLECTIONS · ITEMS</p><h3>League Classic Armory</h3></div><div><span>DATA DRAGON</span><b>Patch {catalog.version}</b><small>{catalog.itemCount} complete source records</small></div></div>
      <div className="collection-intro"><p>Explore Riot’s current League Classic item catalog. Every source field is retained, including artwork, recipes, costs, statistics, tags, availability, sprite data, effects, and internal metadata.</p><span>Last synchronized {new Date(catalog.generatedAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span></div>
      <div className="item-controls">
        <label><span>SEARCH THE ARMORY</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name, item ID, description, or tag"/></label>
        <label><span>ITEM TYPE</span><select value={itemCategory} onChange={event=>setItemCategory(event.target.value)}>{categoryOrder.map(value=><option key={value}>{value}</option>)}</select></label>
        <label><span>STAT / TRAIT</span><select value={tag} onChange={event=>setTag(event.target.value)}>{tags.map(value=><option key={value}>{value}</option>)}</select></label>
        <div className="item-result-count"><b>{filtered.length}</b><span>items shown</span></div>
      </div>
      <div className="item-browser">
        <div className="item-grid" aria-label="League Classic items">{filtered.map(item=><button type="button" className={selected.id===item.id?"selected":""} aria-pressed={selected.id===item.id} onClick={()=>setSelectedId(item.id)} key={item.id}><img src={imageUrl(item.id)} alt=""/><span><b>{item.name}</b><small>{category(item)} · #{item.id}</small></span><strong>{item.gold.purchasable?`${item.gold.total.toLocaleString()}g`:"—"}</strong></button>)}</div>
        <aside className="item-detail" aria-live="polite">
          <header><img src={imageUrl(selected.id)} alt={`${selected.name} artwork`}/><div><p>{category(selected)} · ITEM #{selected.id}</p><h4>{selected.name}</h4><span>{selected.plaintext||"League Classic item record"}</span></div></header>
          <div className="item-tooltip" dangerouslySetInnerHTML={{__html:selected.description||"<span>No tooltip supplied.</span>"}}/>
          <div className="item-cost-grid"><div><span>TOTAL COST</span><b>{selected.gold.total.toLocaleString()}g</b></div><div><span>COMBINE COST</span><b>{selected.gold.base.toLocaleString()}g</b></div><div><span>SELL VALUE</span><b>{selected.gold.sell.toLocaleString()}g</b></div><div><span>PURCHASABLE</span><b>{selected.gold.purchasable?"Yes":"No"}</b></div></div>
          <section><h5>STRUCTURED STATS</h5>{Object.keys(selected.stats??{}).length?<div className="item-stat-list">{Object.entries(selected.stats??{}).map(([key,value])=><div key={key}><b>{prettyStat(key,value)}</b><code>{key}: {value}</code></div>)}</div>:<p className="item-empty">No structured statistics supplied.</p>}</section>
          {(components.length>0||upgrades.length>0)&&<section><h5>BUILD PATH</h5>{components.length>0&&<div className="item-recipe"><span>BUILDS FROM</span><div>{components.map(item=><button type="button" onClick={()=>setSelectedId(item.id)} key={item.id}><img src={imageUrl(item.id)} alt=""/><b>{item.name}</b><small>{item.gold.total.toLocaleString()}g</small></button>)}</div></div>}{upgrades.length>0&&<div className="item-recipe"><span>BUILDS INTO</span><div>{upgrades.map(item=><button type="button" onClick={()=>setSelectedId(item.id)} key={item.id}><img src={imageUrl(item.id)} alt=""/><b>{item.name}</b><small>{item.gold.total.toLocaleString()}g</small></button>)}</div></div>}</section>}
          <section><h5>CLASSIFICATION</h5><div className="item-tags">{(selected.tags??[]).map(value=><button type="button" onClick={()=>setTag(value)} key={value}>{value}</button>)}</div></section>
          <section className="item-source-details"><h5>SOURCE DETAILS</h5><dl><div><dt>Data Dragon version</dt><dd>{catalog.version}</dd></div><div><dt>Item depth</dt><dd>{selected.depth??"Not supplied"}</dd></div><div><dt>Image file</dt><dd>{selected.image.full}</dd></div><div><dt>Sprite</dt><dd>{selected.image.sprite} · {selected.image.x},{selected.image.y} · {selected.image.w}×{selected.image.h}</dd></div><div><dt>Enabled map IDs</dt><dd>{Object.entries(selected.maps??{}).filter(([,enabled])=>enabled).map(([id])=>id).join(", ")||"Not supplied"}</dd></div><div><dt>Raw effects</dt><dd>{selected.effect?JSON.stringify(selected.effect):"Not supplied"}</dd></div>{additional.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{typeof value==="object"?JSON.stringify(value):String(value)}</dd></div>)}</dl></section>
          <a className="item-source-link" href={catalog.sourceUrl} target="_blank" rel="noreferrer">View official Data Dragon source ↗</a>
        </aside>
      </div>
    </section>}
  </section>;
}
