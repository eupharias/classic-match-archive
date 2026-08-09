"use client";

import { useMemo, useState } from "react";
import catalog from "./data/classic-items.json";

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

export default function CollectionsArchive() {
  const [collection]=useState("items");
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
      <button type="button" role="tab" aria-selected={collection==="items"} className="active"><i>◆</i><span><b>Items</b><small>{catalog.itemCount} records</small></span></button>
    </div>
    <section className="panel collection-panel">
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
    </section>
  </section>;
}
