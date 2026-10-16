import {readdirSync,readFileSync,existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../../src/",import.meta.url));
function files(dir){
 if(!existsSync(dir))return [];
 return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const absolute=path.join(dir,entry.name);
  return entry.isDirectory()?files(absolute):/\.(tsx?|jsx?|mjs)$/.test(entry.name)?[absolute]:[];
 });
}
const sources=files(root);
const components=sources.filter(p=>p.includes(path.sep+"Components"+path.sep+"modulos"+path.sep)||p.includes(path.sep+"Components"+path.sep+"apresentacao"+path.sep));
const sourceText=new Map(sources.map(p=>[p,readFileSync(p,"utf8")]));
const basename=p=>path.basename(p).replace(/\.(tsx?|jsx?|mjs)$/,"");
const references=(p)=>{
 const base=basename(p),relative=path.relative(root,p).split(path.sep).join("/");
 return [...sourceText.entries()].filter(([other,text])=>other!==p&&(text.includes("@/"+relative.replace(/\.(tsx?|jsx?|mjs)$/,""))||text.includes("/"+base+'"')||text.includes("/"+base+"'"))).map(([other])=>path.relative(root,other).split(path.sep).join("/"));
};
const inventory=components.map(p=>({component:path.relative(root,p).split(path.sep).join("/"),importers:references(p)}));
const unused=inventory.filter(x=>x.importers.length===0);
process.stdout.write(JSON.stringify({total:inventory.length,unused:unused.length,candidates:unused},null,2)+"\n");
if(process.argv.includes("--fail-on-orphans")&&unused.length)process.exitCode=1;
