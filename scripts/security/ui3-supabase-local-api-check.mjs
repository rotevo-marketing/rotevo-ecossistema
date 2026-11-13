// Runtime Auth and PostgREST regression against a LOCAL disposable Supabase CLI stack.
// Guard: never connect to hosted Rotevo or any non-loopback target.
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
const url=process.env.API_URL||process.env.SUPABASE_URL;
const anonKey=process.env.ANON_KEY||process.env.SUPABASE_ANON_KEY;
const serviceKey=process.env.SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!anonKey||!serviceKey)throw Error("Missing local Supabase credentials");
const parsed=new URL(url);
if(!["127.0.0.1","localhost","::1"].includes(parsed.hostname))throw Error("Refusing non-local Supabase endpoint");
const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const user=(name)=>createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const idA="c1000000-0000-4000-8000-000000000001",idB="c2000000-0000-4000-8000-000000000002";
async function must(p,label){const {data,error}=await p;if(error)throw Error(label+": "+error.message);return data;}
async function createUser(email){
 const {data,error}=await service.auth.admin.createUser({
  email,password:"Synthetic-Local-Test-2026!"+email.length,email_confirm:true
 });
 if(error)throw Error("Create local Auth user: "+error.message);
 return {id:data.user.id,email,password:"Synthetic-Local-Test-2026!"+email.length};
}
async function login(record){
 const client=user(record.email);
 const {error}=await client.auth.signInWithPassword({email:record.email,password:record.password});
 if(error)throw Error("Local login: "+error.message);
 return client;
}
const [a,b,staff]=await Promise.all([
 createUser("a@synthetic.invalid"),createUser("b@synthetic.invalid"),createUser("staff@synthetic.invalid")
]);
await must(service.from("clients").insert([{id:idA,name:"Synthetic A"},{id:idB,name:"Synthetic B"}]),"create clients");
await must(service.from("profiles").insert([
 {id:a.id,role:"client",client_id:idA},
 {id:b.id,role:"client",client_id:idB},
 {id:staff.id,role:"staff",client_id:null}
]),"create profiles");
await must(service.from("planning_projects").insert([
 {client_id:idA,title:"Synthetic A",slug:"a",status:"draft",data:{internalNotes:"PRIVATE-A"}},
 {client_id:idB,title:"Synthetic B",slug:"b",status:"draft",data:{internalNotes:"PRIVATE-B"}}
]),"create projects");
const ca=await login(a),cb=await login(b),cs=await login(staff),anonymous=user("anonymous");
async function visible(client,expected){
 const {data,error}=await client.from("planning_projects").select("title,slug").order("slug");
 assert.equal(error,null,error?.message);
 assert.deepEqual(data.map(x=>x.slug),expected);
}
await visible(ca,["a"]);
await visible(cb,["b"]);
await visible(cs,[]);
const anonymousList=await anonymous.from("planning_projects").select("title,slug");
assert.ok(anonymousList.error?.code==="42501" || (anonymousList.data?.length===0&&!anonymousList.error),
 "anonymous project metadata must be denied or restricted to zero rows");
for(const client of [ca,cb,cs,anonymous]){
 const {error}=await client.from("planning_projects").select("id,title,data");
 assert.ok(error,"private JSON query must be rejected even if the tenant is authorized");
}
for(const client of [ca,cb]){
 const {error}=await client.from("planning_projects").update({data:{internalNotes:"MUTATION"}}).eq("slug","a");
 assert.ok(error,"browser direct JSON update must not be permitted");
}
const {data:privileged,error:privilegedError}=await service.from("planning_projects").select("slug,data").order("slug");
assert.equal(privilegedError,null,privilegedError?.message);
assert.equal(privileged.length,2);
assert.equal(privileged.find(x=>x.slug==="a").data.internalNotes,"PRIVATE-A");
console.log("PASS isolated Supabase Auth + PostgREST: tenant A/B isolation, staff denial, anonymous denial, private JSON denial, authorized service read");
