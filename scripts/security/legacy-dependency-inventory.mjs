import {readdirSync,readFileSync,existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../../src/",import.meta.url));
const extensions=[".tsx",".ts",".jsx",".js",".mjs"];
function walk(dir){
 if(!existsSync(dir))return [];
 return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const p=path.join(dir,entry.name);
  return entry.isDirectory()?walk(p):extensions.some(ext=>p.endsWith(ext))?[p]:[];
 });
}
const files=walk(root);
const normal=p=>path.resolve(p);
const text=new Map(files.map(p=>[normal(p),readFileSync(p,"utf8")]));
const components=files.filter(p=>/[/\\]Components[/\\](modulos|apresentacao)[/\\]/.test(p)).map(normal);
function resolveSpecifier(spec,source){
 if(spec.startsWith("@/"))return normal(path.join(root,spec.slice(2)));
 if(spec.startsWith("./")||spec.startsWith("../"))return normal(path.resolve(path.dirname(source),spec));
 return null;
}
function candidateTargets(base){
 if(!base)return [];
 return [base,...extensions.map(ext=>base+ext),...extensions.map(ext=>path.join(base,"index"+ext))];
}
const importers=new Map(components.map(p=>[p,[]]));
const uncertain=[];
for(const [source,body] of text){
 // Static imports, reexports, literal dynamic imports and require() calls.
 const expression=/(?:\b(?:import|export)\s+(?:[^"';]*?\s+from\s*)?|\bimport\s*\(|\brequire\s*\()\s*["']([^"']+)["']/g;
 for(const found of body.matchAll(expression)){
  const spec=found[1],base=resolveSpecifier(spec,source);
  for(const candidate of candidateTargets(base)){
   const matched=importers.get(candidate);
   if(matched&&!matched.includes(source))matched.push(source);
  }
 }
 if(/import\s*\(\s*(?!["'])|require\s*\(\s*(?!["'])/.test(body))uncertain.push(source);
}
const relative=p=>path.relative(root,p).split(path.sep).join("/");
const inventory=components.map(p=>({component:relative(p),importers:importers.get(p).map(relative)}));
const unreferenced=inventory.filter(x=>x.importers.length===0);
process.stdout.write(JSON.stringify({
 total:inventory.length,unreferenced:unreferenced.length,
 note:"Static module dependency inventory only. Dynamic registries, runtime route references and data migration paths must be reviewed before deletion.",
 unresolvedDynamicSources:uncertain.map(relative),
 candidates:unreferenced
},null,2)+"\n");
if(process.argv.includes("--fail-on-orphans")&&unreferenced.length)process.exitCode=1;
