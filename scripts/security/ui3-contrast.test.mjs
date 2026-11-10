import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const luminance=hex=>hex.match(/../g).map(x=>Number.parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
test('work console metadata meets WCAG AA small-text contrast on its white surface',()=>{
 const source=readFileSync(new URL('../../src/Components/admin/AdminWorkConsole.tsx',import.meta.url),'utf8');
 const colors=[...source.matchAll(/<p className="mt-1 text-xs text-\[#([0-9A-Fa-f]{6})\]"/g)].map(x=>x[1]);
 assert.ok(colors.length>=2,'project and deadline metadata remain present');
 for(const color of colors)assert.ok(1.05/(luminance(color)+.05)>=4.5,`${color} must reach 4.5:1 on white`);
});


test('strategist overview and work console secondary text meet WCAG AA on tinted cards',()=>{
 const work=readFileSync(new URL('../../src/Components/admin/AdminWorkConsole.tsx',import.meta.url),'utf8');
 const overview=readFileSync(new URL('../../src/Components/admin/AdminOperationsOverview.tsx',import.meta.url),'utf8');
 for(const [file,colors] of [["work console",[...work.matchAll(/text-\[#([0-9a-fA-F]{6})\]/g)].map(m=>m[1])],["overview",[...overview.matchAll(/text-\[#([0-9a-fA-F]{6})\]/g)].map(m=>m[1])]]){
  assert.ok(colors.includes('606D82'),file+' must use accessible secondary color');
  const secondary=[...new Set(colors.filter(color=>["606D82","69778E","7A8799","697386"].includes(color.toUpperCase())))];
  for(const fg of secondary)for(const bg of ["FFFFFF","F6F7FB","F7F8FB"]){
   const ratio=(luminance(bg)+.05)/(luminance(fg)+.05);
   assert.ok(ratio>=4.5,file+': '+fg+' on '+bg+' should be >=4.5:1, got '+ratio.toFixed(2));
  }
 }
});
