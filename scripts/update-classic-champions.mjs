import { writeFile } from "node:fs/promises";

const version=process.argv[2]??"16.15.1";
const root=`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/mode/classic`;
const sourceUrl=`${root}/champion.json`;
const summary=await fetch(sourceUrl).then(response=>{if(!response.ok)throw new Error(`Champion summary failed: ${response.status}`);return response.json()});
const entries=await Promise.all(Object.values(summary.data).map(async champion=>{
  const url=`${root}/champion/${champion.id}.json`;
  const payload=await fetch(url).then(response=>{if(!response.ok)throw new Error(`${champion.id} failed: ${response.status}`);return response.json()});
  return [champion.id,payload.data[champion.id]];
}));
const output={version,generatedAt:new Date().toISOString(),sourceUrl,championCount:entries.length,data:Object.fromEntries(entries)};
await writeFile(new URL("../app/data/classic-champions.json",import.meta.url),`${JSON.stringify(output,null,2)}\n`);
console.log(`Saved ${entries.length} League Classic champions from Data Dragon ${version}.`);
