
import test from "node:test";
import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import {readFileSync} from "node:fs";
const root=new URL("../../",import.meta.url);
const mocks=new Map([
 ["next/server","export const NextRequest=Request; export const NextResponse=Response;"],
 ["@/lib/googleCalendar/server","export class CalendarError extends Error{constructor(status,message){super(message);this.status=status;}};export const calendarAdmin=(req)=>globalThis.privateFixture.authorize(req);"]
]);
const hook=registerHooks({resolve(name,context,next){
 if(mocks.has(name))return {url:"data:text/javascript,"+encodeURIComponent(mocks.get(name)),shortCircuit:true};
 if(name.startsWith("@/lib/"))return next(new URL("src/"+name.slice(2)+".ts",root).href,context);
 return next(name,context);
}});
const {GET,PATCH}=await import("../../src/app/api/admin/agenda/route.ts");
const {CalendarError}=await import("@/lib/googleCalendar/server");
hook.deregister();
const uuid="11111111-1111-4111-8111-111111111111";
const meeting=()=>({id:uuid,title:"Synthetic private meeting",kind:"meeting",date:"2027-01-20",time:"14:00",status:"planned",visibleToClient:false,agendaVisibleToClient:false,minutesVisibleToClient:false,notes:"Private agenda",internalNotes:"Private notes",minutes:"",timing:{endDate:"2027-01-20",endTime:"15:00",timeZone:"America/Sao_Paulo",allDay:false},googleOptions:{guests:[],description:"Shared by explicit Google sync only",recurrence:"",reminders:null,meet:false}});
let rows,who,queries,race,deny,reads;
function reset(){
 rows=new Map();who="user-a";queries=[];race=false;deny=null;reads=0;
 globalThis.privateFixture={authorize:async()=>{
  if(deny)throw deny;
  return {userId:who,db:{from(table){
   assert.equal(table,"rotevo_user_agendas","private endpoint must never access projects or OAuth storage");
   const filters={};let update,insert;
   return {select(){return this;},eq(key,value){filters[key]=value;return this;},update(value){update=value;return this;},insert(value){insert=value;return this;},
    async maybeSingle(){
     queries.push({filters:{...filters},write:!!(update||insert)});
     if(insert){
      assert.equal(insert.user_id,who);
      if(race||rows.has(who))return {data:null,error:{code:"23505"}};
      rows.set(who,structuredClone(insert));return {data:structuredClone(insert)};
     }
     assert.equal(filters.user_id,who,"every read and update must constrain ownership");
     if(update&&race)return {data:null};
     const row=rows.get(filters.user_id);
     if(!row||filters.updated_at&&filters.updated_at!==row.updated_at)return {data:null};
     if(update)Object.assign(row,structuredClone(update));else reads++;
     return {data:structuredClone(row)};
    }
   };
  }}};
 }};
}
const req=(body)=>new Request("http://127.0.0.1:3000/api/admin/agenda",{method:"PATCH",body:JSON.stringify(body)});
const read=(expected=who)=>GET(new Request("http://127.0.0.1:3000/api/admin/agenda?expectedUserId="+expected));
const save=(entries,expected=null,extras={})=>PATCH(req({expectedUserId:who,expectedUpdatedAt:expected,data:{operationalAgenda:entries},...extras}));
test("private agenda API enforces ownership, revisions and client isolation",async t=>{
 reset();t.after(()=>delete globalThis.privateFixture);
 assert.deepEqual((await (await read()).json()).agenda,{data:{operationalAgenda:[]},updated_at:null});
 const first=await save([meeting()]);assert.equal(first.status,200);
 const saved=(await first.json()).agenda;
 assert.equal(rows.size,1);assert.equal(rows.get(who).user_id,"user-a");
 assert.equal(first.headers.get("Cache-Control"),"no-store");
 const a=structuredClone(rows.get("user-a"));
 who="user-b";
 assert.deepEqual((await (await read()).json()).agenda.data.operationalAgenda,[]);
 assert.equal((await read("user-a")).status,403);
 assert.equal((await save([meeting()],null,{expectedUserId:"user-a"})).status,403);
 assert.equal((await save([meeting()],null,{user_id:"user-a"})).status,400);
 assert.deepEqual(rows.get("user-a"),a,"another strategist cannot alter the first user's agenda");
 assert.equal((await save([meeting()])).status,200);
 who="user-a";
 const changed={...meeting(),minutes:"Private recorded decision",minutesHistory:[{text:"FORGED",changedBy:"user-b"}]};
 const result=await save([changed],saved.updated_at);
 assert.equal(result.status,200);
 const current=(await result.json()).agenda;
 assert.equal(current.data.operationalAgenda[0].minutesHistory.length,1);
 assert.equal(current.data.operationalAgenda[0].minutesHistory[0].changedBy,"user-a");
 assert.equal(current.data.operationalAgenda[0].minutesHistory[0].text,"Private recorded decision");
 assert.equal((await save([],saved.updated_at)).status,409,"stale writes cannot delete data");
 assert.equal((await save([],current.updated_at)).status,400,"recorded minutes cannot be removed");
 const before=structuredClone(rows.get(who));
 for(const patch of [{visibleToClient:true},{agendaVisibleToClient:true},{minutesVisibleToClient:true},{relatedTaskId:uuid},{googleLink:{userId:"user-b"}}]){
  assert.equal((await save([{...changed,...patch}],current.updated_at)).status,400);
 }
 assert.deepEqual(rows.get(who),before);
 race=true;
 assert.equal((await save([{...changed,title:"Race update"}],current.updated_at)).status,409);
 assert.deepEqual(rows.get(who),before);
 reset();race=true;assert.equal((await save([meeting()])).status,409,"concurrent first insert fails closed");
 reset();deny=new CalendarError(403,"Denied");
 // Actual calendarAdmin authentication/role logic is reused unchanged; errors fail closed.
 assert.equal((await read()).status,403);
 assert.equal(rows.size,0);
});
test("private agenda SQL is an unapplied, additive, closed proposal",()=>{
 const sql=readFileSync(new URL("../../docs/security/sql/ui3-user-agendas-PROPOSAL-ONLY.sql",import.meta.url),"utf8");
 assert.match(sql,/create table public\.rotevo_user_agendas/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all .* from public,anon,authenticated,service_role/);
 assert.match(sql,/grant select,insert,update on table public\.rotevo_user_agendas to service_role/);
 const executable=sql.split("\n").filter(line=>!line.trim().startsWith("--")).join("\n");
 assert.doesNotMatch(executable,/^\s*(drop|truncate|delete from|update public|insert into)\b/im);
 assert.doesNotMatch(executable,/grant .* to authenticated|create policy/i);
});
