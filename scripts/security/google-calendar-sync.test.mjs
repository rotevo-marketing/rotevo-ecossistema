import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import test from "node:test";

const root=new URL("../../",import.meta.url);
const dependencies=new Map([
 ["next/server", "export const NextRequest=Request; export const NextResponse=Response;"],
 ["@/lib/googleCalendar/server", "export class CalendarError extends Error { constructor(status,message){super(message);this.status=status;} }; export const calendarAdmin=(...args)=>globalThis.calendarFixture.admin(...args); export const calendarConfig=()=>({key:'unused'}); export const googleToken=async()=>({access_token:'fake-access'}); export const open=()=> 'fake-refresh';"]
]);
const hooks=registerHooks({
 resolve(specifier,context,next){
  if(dependencies.has(specifier))return {url:"data:text/javascript,"+encodeURIComponent(dependencies.get(specifier)),shortCircuit:true};
  if(specifier.startsWith("@/lib/googleCalendar/"))return next(new URL("src/"+specifier.slice(2)+".ts",root).href,context);
  return next(specifier,context);
 }
});
const {POST}=await import("../../src/app/api/admin/google-calendar/events/route.ts");
hooks.deregister();

test("linked events sync both ways without duplicates and resolve concurrent edits",async t=>{
 const project={id:"project-a",updated_at:"2026-11-17T15:00:00.000Z",data:{operationalAgenda:[{
  id:"meeting-a",type:"meeting",status:"planned",date:"2026-11-19",time:"13:00",title:"Reunião inicial",visibleToClient:true,
  notes:"Arquivo interno",internalNotes:"Nunca enviar",timing:{allDay:false,timeZone:"America/Sao_Paulo",endDate:"2026-11-19",endTime:"14:00"},
  googleOptions:{guests:["guest@example.test"],description:"Somente esta pauta",recurrence:"RRULE:FREQ=WEEKLY;COUNT=2",reminders:[{method:"email",minutes:20}],meet:true}
 }]}};
 let remote=null,member={active:true,role:"admin"},accessRole="owner",creations=0,patches=0,deletions=0,version=0;
 const projected=()=>project.data.operationalAgenda[0];
 globalThis.calendarFixture={admin:async()=>({userId:"user-a",db:{
  from(table){
   let update,filters={};
   return {
    select(){return this;},eq(key,value){filters[key]=value;return this;},update(row){update=row;return this;},
    async maybeSingle(){
     if(table==="team_members")return {data:member};
     if(table==="team_project_assignments"||table==="team_member_permissions")return {data:null};
     if(table==="rotevo_google_calendar_connections")return {data:{google_account:"owner@example.test",selected_calendar_id:"calendar@example.test",refresh_token_ciphertext:"encrypted"}};
     assert.equal(table,"planning_projects");
     if(filters.id!==project.id||filters.updated_at&&filters.updated_at!==project.updated_at)return {data:null};
     if(update)Object.assign(project,structuredClone(update));
     return {data:structuredClone(project)};
    }
   };
  }
 }})};
 t.after(()=>delete globalThis.calendarFixture);
 const originalFetch=globalThis.fetch;
 t.after(()=>{globalThis.fetch=originalFetch;});
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input);
  assert.equal(url.hostname,"www.googleapis.com");
  assert.equal(init.headers.Authorization,"Bearer fake-access");
  if(url.pathname.includes("/calendarList/"))return Response.json({accessRole});
  if(init.method==="GET")return remote?Response.json(remote):new Response(null,{status:404});
  if(init.method==="POST"){
   creations++;
   assert.equal(url.searchParams.get("sendUpdates"),"none");
   if(remote)return new Response(null,{status:409});
   const payload=JSON.parse(init.body);
   assert.equal(payload.visibility,"private");
   assert.equal(payload.description,"Somente esta pauta");
   assert.equal(payload.conferenceData.createRequest.conferenceSolutionKey.type,"hangoutsMeet");
   assert.match(payload.id,/^r[0-9a-f]{64}$/);
   assert.doesNotMatch(init.body,/Nunca enviar|Arquivo interno/);
   remote={...payload,etag:String(++version),hangoutLink:"https://meet.google.com/aaa-bbbb-ccc"};
   return Response.json(remote);
  }
  assert.equal(init.headers["If-Match"],remote.etag);
  if(init.method==="DELETE"){deletions++;remote=null;return new Response(null,{status:204});}
  assert.equal(init.method,"PATCH");
  patches++;
  assert.equal(url.searchParams.get("sendUpdates"),"all");
  remote={...remote,...JSON.parse(init.body),etag:String(++version)};
  return Response.json(remote);
 };
 async function sync(patch={}){
  return POST(new Request("https://example.test",{method:"POST",body:JSON.stringify({
   projectId:project.id,meetingId:projected().id,expectedUpdatedAt:project.updated_at,
   action:"sync",notify:false,...patch
  })}));
 }
 assert.equal((await sync()).status,200);
 assert.equal(projected().googleLink.meetUrl,"https://meet.google.com/aaa-bbbb-ccc");
 assert.equal((await sync()).status,200);
 assert.equal(creations,1);
 assert.equal(patches,0);

 projected().title="Alteração Rotevo";
 assert.equal((await sync({notify:true})).status,200);
 assert.equal(remote.summary,"Alteração Rotevo");
 remote={...remote,summary:"Alteração Google",end:{...remote.end,dateTime:"2026-11-19T17:30:00.000Z"},etag:String(++version)};
 assert.equal((await sync()).status,200);
 assert.equal(projected().title,"Alteração Google");
 assert.equal(projected().duration,"90 min");

 projected().title="Editei na Rotevo";
 remote={...remote,summary:"Editei no Google",etag:String(++version)};
 const conflict=await (await sync()).json();
 assert.equal(conflict.conflict,true);
 assert.equal(remote.summary,"Editei no Google");
 remote.etag=String(++version);
 assert.equal((await sync({action:"push",conflictToken:conflict.conflictToken})).status,409);
 const current=await (await sync()).json();
 assert.equal((await sync({action:"pull",conflictToken:current.conflictToken})).status,200);
 assert.equal(projected().title,"Editei no Google");

 const saved=structuredClone(project);
 const savedRemote=structuredClone(remote);
 projected().status="cancelled";
 assert.equal((await sync()).status,200);
 assert.equal(deletions,1);
 assert.equal(projected().googleLink.cancelled,true);
 Object.assign(project,saved);
 remote=savedRemote;

 remote=null;
 member={active:true,role:"producer"};
 assert.equal((await sync()).status,403);
 member={active:true,role:"admin"};
 accessRole="reader";
 assert.equal((await sync()).status,409);
 assert.equal(projected().status,"planned");
 accessRole="owner";
 assert.equal((await sync()).status,200);
 assert.equal(projected().status,"cancelled");
 assert.equal(projected().googleLink.cancelled,true);
 assert.equal(creations,1);
 assert.equal(patches,1);
});
