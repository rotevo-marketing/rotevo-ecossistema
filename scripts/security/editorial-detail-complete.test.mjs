import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../../src/Components/cliente/EditorialCalendar.tsx",import.meta.url),"utf8");

test("details display every strategic field saved by the new content form",()=>{
 for(const field of ["ideaSummary","objective","audience","funnelStage","keyMessage","cta"]){
  assert.match(src,new RegExp("active\\."+field));
 }
 assert.match(src,/aria-label="Direcionamento estratégico"/);
 assert.match(src,/Não especificada/);
});
test("editorial channel, format, state, date and version have approved semantic metadata",()=>{
 for(const term of ['kind="channel"','kind="format"','kind="status"','calendar-week','Versão {active.version','detailFunnelPalette','detailChannelPalette']){
  assert.ok(src.includes(term),term);
 }
 assert.match(src,/ContentTablerIcon name=\{editorialChannelIcon\(label\)\}/);
});
test("creative references and distinct material links are available to the client",()=>{
 assert.match(src,/active\.references\?\?\[\]/);
 assert.match(src,/safe\(ref\.url\)/);
 assert.match(src,/ref\.note/);
 assert.match(src,/safe\(active\.briefUrl\)/);
 assert.match(src,/safe\(active\.driveUrl\)/);
 assert.match(src,/Abrir roteiro ou briefing/);
 assert.match(src,/Abrir material da publicação/);
 assert.match(src,/target="_blank" rel="noopener noreferrer"/);
});
test("caption and review notes belong to left column, chat and decision remain on right",()=>{
 const left=src.indexOf('aria-label="Direcionamento estratégico"');
 const review=src.indexOf('aria-label="Observações de revisão"');
 const aside=src.indexOf('<aside aria-label="Atualizações e aprovações do conteúdo"');
 assert.ok(left>0&&review>left&&review<aside);
 const right=src.slice(aside);
 assert.match(right,/Conversa e aprovações/);
 assert.match(right,/<ProjectConversation/);
 assert.match(right,/<EditorialDecision/);
 assert.doesNotMatch(right,/<h4 className="text-sm font-semibold">Observações de revisão<\/h4>/);
});
