import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialReview,reviewAction,visibleSnapshot,chartPoints,imageAllowed,prototypeAllowed} from '../../src/lib/strategic-editor/prototype.ts';
const doc=()=>[{id:'a',type:'paragraph',content:'Texto sintético'}];
test('draft and saved snapshots are isolated and never visible automatically',()=>{const input=doc(),s=initialReview(input);input[0].content='changed';s.draft[0].content='edited';assert.equal(s.saved[0].content,'Texto sintético');assert.equal(visibleSnapshot(s),null);});
test('review approval and explicit release are required',()=>{let s=initialReview(doc());assert.throws(()=>reviewAction(s,'approve'));assert.throws(()=>reviewAction(s,'release'));s=reviewAction(s,'review');s=reviewAction(s,'approve');assert.equal(visibleSnapshot(s),null);s=reviewAction(s,'release');assert.deepEqual(visibleSnapshot(s),doc());});
test('unsaved edits block review approval and release',()=>{let s=initialReview(doc());s=reviewAction(reviewAction(s,'review'),'approve');s.draft[0].content='new';for(const action of ['review','approve','release'])assert.throws(()=>reviewAction(s,action));});
test('saving new draft preserves released version and clears approval',()=>{let s=reviewAction(reviewAction(reviewAction(initialReview(doc()),'review'),'approve'),'release');s.draft[0].content='new draft';s=reviewAction(s,'save');assert.equal(visibleSnapshot(s)[0].content,'Texto sintético');assert.equal(s.review,null);assert.equal(s.approved,null);assert.throws(()=>reviewAction(s,'release'));});
test('hiding a document removes it from portal without discarding release',()=>{let s=reviewAction(reviewAction(reviewAction(initialReview(doc()),'review'),'approve'),'release');s={...s,visible:false};assert.equal(visibleSnapshot(s),null);assert.ok(s.published);assert.throws(()=>reviewAction(s,'release'));assert.deepEqual(visibleSnapshot({...s,visible:true}),doc());});
test('released output cannot mutate stored approved document',()=>{const s=reviewAction(reviewAction(reviewAction(initialReview(doc()),'review'),'approve'),'release');const output=visibleSnapshot(s);output[0].content='mutated';assert.equal(visibleSnapshot(s)[0].content,'Texto sintético');});
test('chart data rejects malformed, negative, infinite and oversized series',()=>{assert.deepEqual(chartPoints('Indicação:65; Busca:15,5'),[{label:'Indicação',value:65},{label:'Busca',value:15.5}]);for(const source of ['', 'A:-1','A:Infinity','A:1000001','A:12x',Array(9).fill('A:1').join(';')])assert.deepEqual(chartPoints(source),[]);assert.equal(chartPoints('Zero:0')[0].value,0);});
test('images are constrained to local supported formats and size',()=>{assert.equal(imageAllowed({type:'image/png',size:100}),true);for(const file of [{type:'image/svg+xml',size:100},{type:'text/html',size:100},{type:'image/jpeg',size:0},{type:'image/png',size:5*1024*1024}])assert.equal(imageAllowed(file),false);});
test('prototype fails closed in production even with local flag',()=>{assert.equal(prototypeAllowed('production','true'),false);assert.equal(prototypeAllowed('preview',undefined),true);assert.equal(prototypeAllowed(undefined,undefined),false);assert.equal(prototypeAllowed(undefined,'true'),true);});
test('prototype components do not import real projects, persistence or Supabase',()=>{for(const path of ['src/Components/strategic-editor/StrategicEditorPrototype.tsx','src/Components/strategic-editor/schema.tsx','src/Components/strategic-editor/demo.ts'])assert.doesNotMatch(readFileSync(path,'utf8'),/supabase|fetch\(|localStorage|\/api\/admin|EcosystemDocumentEditor|PlanningScheduleEditor/);const route=readFileSync('src/app/previa/editor-estrategico/page.tsx','utf8');assert.match(route,/prototypeAllowed/);assert.match(route,/notFound/);});

test('planning workspace simulation has no application persistence and is preview gated',()=>{
 const content=readFileSync('src/Components/strategic-editor/PlanningWorkspacePreview.tsx','utf8');
 assert.doesNotMatch(content,/from ["'].*supabase|fetch\(|localStorage|sessionStorage|\/api\//);
 const route=readFileSync('src/app/previa/planejamento/page.tsx','utf8');
 assert.match(route,/prototypeAllowed/);assert.match(route,/notFound/);
});
