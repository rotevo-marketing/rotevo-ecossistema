// Real document route + validation, with a disk-backed synthetic repository.
// No hosted database, account, project or customer is touched.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rotevo-document-test-'));
const file=path.join(temp,'synthetic-project.json');
const pid='11111111-1111-4111-8111-111111111111';
const read=()=>JSON.parse(fs.readFileSync(file,'utf8'));
let storageError=null, deny=false;
const response=(value,status=200)=>Response.json(value,{status});
const db={from(table){assert.equal(table,'planning_projects');let update=null;const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},update(value){update=value;return q},async maybeSingle(){if(storageError&&update)return {error:storageError};const row=read();if(Object.entries(filters).some(([k,v])=>row[k]!==v))return {data:null};if(update)fs.writeFileSync(file,JSON.stringify({...row,...update}));return {data:read()}}};return q;}};
const server={response,failure:(status,message='Acesso recusado')=>response({error:message},status),uuid:v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v),authorizeProject:async()=>true,identity:async()=>deny?{error:response({error:'Sessão expirada'},401)}:{identity:{db}},body:async(request,max)=>{const text=await request.text();if(text.length>max)throw Error('Solicitação muito grande.');return JSON.parse(text)}};
const resolve=Module._resolveFilename;
Module._resolveFilename=function(name,...rest){if(name.startsWith('@/'))name=path.join(root,'src',name.slice(2));return resolve.call(this,name,...rest)};
const load=Module._load;
Module._load=function(name,...rest){if(name==='@/lib/operations/server')return server;if(name==='@/lib/supabase')return {supabase:{auth:{getSession:async()=>({data:{session:{access_token:'synthetic-local-token'}}})}}};return load.call(this,name,...rest)};
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const {PATCH}=require('../../src/app/api/admin/planning/document/route.ts');
const {visualTemplates}=require('../../src/lib/planning/visualHtml.ts');
const {richContentError}=require('../../src/lib/planning/richContent.ts');
const rich=props=>({format:'blocknote-v1',blocks:[{id:'html-block',type:'visualHtml',props,children:[]}]});
const base=()=>({id:pid,updated_at:'2026-10-27T18:00:00Z',data:{customMetadata:{preserve:true},ecosystem2027:{version:1,selectedDocumentCodes:['01.06','01.05'],documents:{'01.06':{content:'Original',reviewStatus:'approved',updatedAt:'2026-10-27T18:00:00Z',publishedAt:'2026-10-27T17:00:00Z',publishedContent:'Original publicado',publishedRichContent:{format:'blocknote-v1',blocks:[{id:'published',type:'paragraph',content:'Original publicado'}]}},'01.05':{content:'Outro documento preservado',reviewStatus:'draft',updatedAt:'2026-10-27T18:00:00Z'}}}}});
async function save(value,expected=read().updated_at){const r=await PATCH(new Request('https://rotevo.invalid/api/admin/planning/document',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:pid,code:'01.06',action:'save',expectedUpdatedAt:expected,richContent:value})}));return {status:r.status,data:await r.json()};}
test('small and extensive HTML save, reopen from storage, edit CSS and preserve releases and other documents',async()=>{
 for(const markup of ['<h2>Ação 🧠</h2><p>1 / 5</p>','<section>'+('<p>Dimensão · ação 🧠 &amp; oferta: 2 / 5</p>'.repeat(1600))+'</section>']){
  fs.writeFileSync(file,JSON.stringify(base()));
  const before=read(),value=rich({...visualTemplates[0].props,markup,stylesheet:'.card{color:#743ddb}\n'.repeat(600)});
  const saved=await save(value);assert.equal(saved.status,200,JSON.stringify(saved.data));
  const reopened=read();assert.deepEqual(reopened.data.ecosystem2027.documents['01.06'].richContent,value);
  assert.equal(reopened.data.ecosystem2027.documents['01.06'].reviewStatus,'draft');
  for(const k of ['publishedContent','publishedRichContent','publishedAt'])assert.deepEqual(reopened.data.ecosystem2027.documents['01.06'][k],before.data.ecosystem2027.documents['01.06'][k]);
  assert.deepEqual(reopened.data.ecosystem2027.documents['01.05'],before.data.ecosystem2027.documents['01.05']);assert.deepEqual(reopened.data.customMetadata,before.data.customMetadata);
  value.blocks[0].props.stylesheet+='\nh2{color:green}';assert.equal((await save(value)).status,200);assert.deepEqual(read().data.ecosystem2027.documents['01.06'].richContent,value);
 }
});
test('actionable limits, conflict and storage errors never overwrite stored data',async()=>{
 fs.writeFileSync(file,JSON.stringify(base()));const before=read();
 for(const [change,pattern] of [[{markup:'x'.repeat(80001)},/80.000/],[{stylesheet:'x'.repeat(20001)},/20.000/],[{markup:'<p>\0</p>'},/U\+0000/]]){
  const result=await save(rich({...visualTemplates[0].props,...change}));assert.equal(result.status,400);assert.match(result.data.error,pattern);assert.deepEqual(read(),before);
 }
 assert.equal(richContentError(rich({...visualTemplates[0].props,markup:'<p>literal \\u0000</p>'})),null);
 const conflict=await save(rich(visualTemplates[0].props),'obsolete');assert.equal(conflict.status,409);assert.deepEqual(read(),before);
 storageError={code:'22P05'};const failed=await save(rich(visualTemplates[0].props));storageError=null;assert.equal(failed.status,503);assert.match(failed.data.error,/caractere incompatível.*Referência/);assert.deepEqual(read(),before);
 deny=true;assert.equal((await save(rich(visualTemplates[0].props))).status,401);deny=false;
 const tooLarge=await save(rich({...visualTemplates[0].props,markup:'x'.repeat(1400001)}));assert.equal(tooLarge.status,413);assert.deepEqual(read(),before);
});
test('client reports non-JSON server failures and preserves actionable API diagnostics',async()=>{
 const {request}=require('../../src/lib/operations/api.ts');const realFetch=global.fetch;
 try {
  global.fetch=async()=>new Response('<html>Private internal error</html>',{status:500});
  await assert.rejects(request('/synthetic','PATCH',{}),/HTTP 500/);
  global.fetch=async()=>new Response('',{status:413});
  await assert.rejects(request('/synthetic','PATCH',{}),/excede o tamanho/);
  global.fetch=async()=>Response.json({error:'CSS excede 20.000 caracteres'},{status:400});
  await assert.rejects(request('/synthetic','PATCH',{}),/CSS excede 20.000/);
  global.fetch=async()=>Response.json({project:{id:'synthetic'}});
  assert.deepEqual(await request('/synthetic','PATCH',{}),{project:{id:'synthetic'}});
 }finally{global.fetch=realFetch;}
});
test.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
