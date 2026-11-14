import test from 'node:test';
import assert from 'node:assert/strict';
import {planningHref,portalTarget} from '../../src/lib/ui/navigation.ts';
import {planningSnapshot,clientDocumentCode} from '../../src/lib/ui/planningSnapshot.ts';
import {temporaryPassword} from '../../src/lib/ui/temporaryPassword.ts';
const projects=[{id:'project-a'},{id:'project-b'}];
test('a client shortcut switches from the previously selected plan to its owning plan',()=>{
 assert.equal(portalTarget(projects,'project-b','project-a'),'project-a');
 assert.equal(portalTarget(projects,'project-b','project-unknown'),'project-b');
 assert.equal(portalTarget(projects,'project-removed'),'project-a');
 assert.equal(portalTarget([],''),'');
});
test('return links retain exact project and encode path and query boundaries',()=>{
 assert.equal(planningHref('cliente','project-b'),'/admin/planejamentos/cliente?projectId=project-b');
 assert.equal(planningHref('cliente/a','id&other=1'),'/admin/planejamentos/cliente%2Fa?projectId=id%26other%3D1');
});
const data=()=>({ecosystem2027:{version:1,selectedDocumentCodes:['01.02','02.01'],presentedDocumentCodes:['01.02'],hiddenExecutiveDocumentCodes:['00.02'],documents:{
 '01.02':{content:'PRIVATE_DRAFT',publishedContent:'Released company profile',publishedAt:'2026-10-23T10:00:00Z'},
 '02.01':{content:'PRIVATE_PORTFOLIO',publishedContent:'Internal release',publishedAt:'2026-10-23T10:00:00Z'},
 '00.01':{content:'PRIVATE_EXECUTIVE',publishedContent:'Released objective',publishedAt:'2026-10-23T10:00:00Z'},
 '00.02':{publishedContent:'Hidden executive',publishedAt:'2026-10-23T10:00:00Z'},
}}});
test('administrative conference obeys publication, scope, visibility and executive masks',()=>{
 const original=data(),snapshot=planningSnapshot(original,'published');
 assert.deepEqual(Object.keys(snapshot.documents),['01.02']);
 assert.deepEqual(Object.keys(snapshot.executiveDocuments),['00.01']);
 assert.equal(JSON.stringify(snapshot).includes('PRIVATE'),false);
 assert.equal(original.ecosystem2027.documents['01.02'].content,'PRIVATE_DRAFT');
 assert.deepEqual(planningSnapshot(original,'draft').documents,{});
 assert.equal(planningSnapshot({...original,portalModules:['content']},'published'),null);
});
test('unreleased and undated documents never appear in the publication conference',()=>{
 const root=data();delete root.ecosystem2027.documents['01.02'].publishedAt;
 assert.deepEqual(planningSnapshot(root,'published').documents,{});
 assert.equal(clientDocumentCode('01.01'),false);assert.equal(clientDocumentCode('00.01'),false);assert.equal(clientDocumentCode('01.02'),true);
});
test('new account suggestions have cryptographic variability and satisfy strong password classes',()=>{
 const generated=Array.from({length:100},()=>temporaryPassword());
 assert.equal(new Set(generated).size,generated.length);
 for(const value of generated){assert.equal(value.length,24);for(const pattern of [/[A-Z]/,/[a-z]/,/[0-9]/,/[^a-zA-Z0-9]/])assert.match(value,pattern);}
});
