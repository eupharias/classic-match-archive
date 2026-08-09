import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const versions = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(response => {
  if (!response.ok) throw new Error(`Could not load Data Dragon versions (${response.status})`);
  return response.json();
});
const version = versions[0];
const sourceUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`;
const source = await fetch(sourceUrl).then(response => {
  if (!response.ok) throw new Error(`Could not load Data Dragon items (${response.status})`);
  return response.json();
});
const data = Object.fromEntries(Object.entries(source.data).filter(([id]) => /^77\d+$/.test(id)));
const output = {
  type: "league-classic-items",
  version,
  locale: "en_US",
  sourceUrl,
  generatedAt: new Date().toISOString(),
  itemCount: Object.keys(data).length,
  basic: source.basic,
  groups: source.groups,
  tree: source.tree,
  data,
};
const target = resolve(root, "app/data/classic-items.json");
await mkdir(dirname(target), { recursive: true });
await writeFile(target, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Saved ${output.itemCount} League Classic items from Data Dragon ${version}.`);
