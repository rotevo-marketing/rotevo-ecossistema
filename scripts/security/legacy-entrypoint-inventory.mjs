import {readdirSync,readFileSync} from "node:fs";
import path from "node:path";
const root=path.resolve("src");
const sources=[];
function walk(dir){for(const ent of readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,ent.name);if(ent.isDirectory())walk(full);else if(/\.(tsx?|jsx?)$/.test(ent.name))sources.push(full);}}
walk(root);
const entries=sources.map(full=>({path:path.relative(root,full).split(path.sep).join("/"),text:readFileSync(full,"utf8")}));
const patterns=[
 {key:"legacyModuleRegistry",expr:/\b(?:planningModules|moduleCategories)\b|@\/data\/modules/},
 {key:"legacyModuleShell",expr:/PlanejamentoModuleShell/},
 {key:"obsoleteDemoNavigation",expr:/["'`][^"'`]*(?:\/admin\/planejamentos\/demo|\/apresentacao\/demo)[^"'`]*["'`]/},
 {key:"legacyModuleEditors",expr:/Components\/modulos\//},
 {key:"legacyPresentations",expr:/Components\/apresentacao\/(?!EcosystemPresentationOverview|ModuleIcon|RichText)/}
];
const records=Object.fromEntries(patterns.map(p=>[p.key,[]]));
for(const entry of entries){
 for(const p of patterns){
  if(p.key==="legacyModuleRegistry"&&entry.path==="data/modules.ts")continue;
  if(p.key==="legacyModuleShell"&&entry.path==="Components/PlanejamentoModuleShell.tsx")continue;
  if(p.expr.test(entry.text))records[p.key].push(entry.path);
 }
}
console.log(JSON.stringify({scanned:entries.length,records},null,2));
if(process.argv.includes("--fail-on-live-legacy")&&Object.values(records).some(x=>x.length))process.exitCode=1;
