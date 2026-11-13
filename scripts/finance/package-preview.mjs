import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const target=path.resolve('.vercel/finance-review-upload');fs.mkdirSync(target,{recursive:true});
const tracked=execFileSync('git',['ls-files','-z','--','src','public'],{encoding:'utf8'}).split('\0').filter(Boolean);
const added=execFileSync('git',['ls-files','--others','--exclude-standard','-z','--','src'],{encoding:'utf8'}).split('\0').filter(Boolean);
const files=[...new Set([...tracked,...added,'package.json','package-lock.json','tsconfig.json','next.config.ts','postcss.config.mjs','eslint.config.mjs','vercel.json'])];
const groups=[];let group=[],size=0;
for(const file of files){
 if(file.startsWith('.')||file.includes('..')||file.includes('.env'))throw Error('Unexpected source path');
 const bytes=fs.readFileSync(file);
 for(let start=0,index=0;start<bytes.length;start+=18000,index++){
  const part=bytes.subarray(start,start+18000);if(size+part.length>18000&&group.length){groups.push(group);group=[];size=0;}
  group.push({file,index,data:part.toString('base64')});size+=part.length;
 }
}
if(group.length)groups.push(group);
groups.forEach((g,i)=>fs.writeFileSync(path.join(target,`part-${i}.json`),JSON.stringify(g)));
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify({groups:groups.length,files:files.length}));
console.log(JSON.stringify({groups:groups.length,files:files.length}));
