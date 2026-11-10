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
