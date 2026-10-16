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
const unsafe=found.filter(entry=>{
 const src=readFileSync(resolve(process.cwd(),entry.path),"utf8");
 if(!/^\\s*(?:\\uFEFF)?["']use client["'];?/m.test(src))return false;
 const lines=src.split(/\\r?\\n/);
 const call=lines.slice(entry.line-1,entry.line+18).join(" ");
 const directWrite=/\\.update\\(\\s*\\{\\s*data\\s*:/.test(call)||/\\.insert\\(\\s*\\{[^}]*\\bdata\\s*:/.test(call);
 const directRead=/\\.select\\(\\s*[`"'][^)]*\\bdata\\b/.test(call);
 return directWrite||directRead;
});
for(const item of unsafe)console.error(`UNSAFE_BROWSER_PROJECT_JSON_ACCESS ${item.path}:${item.line}`);
if(unsafe.length>0){console.error(`Blocking ${unsafe.length} unprotected browser data consumers`);process.exitCode=1;}

