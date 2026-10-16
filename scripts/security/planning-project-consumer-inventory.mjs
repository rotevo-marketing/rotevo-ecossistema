import {readdirSync,readFileSync} from "node:fs";
import {join,relative,resolve} from "node:path";

const root=resolve(process.cwd(),"src");
const found=[];
function walk(dir){
 for(const ent of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,ent.name);
  if(ent.isDirectory())walk(p);
  else if(ent.isFile()&&/\.(tsx?|jsx?)$/.test(p)){
   const s=readFileSync(p,"utf8");
   const lines=s.split(/\r?\n/);
   lines.forEach((line,i)=>{
    if(/\.from\s*\(\s*["'`]planning_projects["'`]\s*\)/.test(line)){
     found.push({path:relative(process.cwd(),p),line:i+1,context:lines.slice(i,Math.min(lines.length,i+13)).join(" ").replace(/\s+/g," ").slice(0,400)});
    }
   });
  }
 }
}
walk(root);
found.sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line);
console.log("Planning projects direct client usage inventory:");
for(const x of found)console.log(`${x.path}:${x.line} ${x.context}`);
console.log(`TOTAL_DIRECT_TABLE_CALLS=${found.length}`);
