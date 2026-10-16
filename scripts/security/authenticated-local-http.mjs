import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const host = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const app = process.env.ROTEVO_LOCAL_APP_URL;
if (process.env.ROTEVO_LOCAL_API_TESTS !== "YES_LOCAL_ONLY" ||
    host !== "http://127.0.0.1:54321" ||
    app !== "http://127.0.0.1:3000/" ||
    !anon || !secret || anon === secret) {
  throw Error("Blocked: isolated local Supabase and Next.js required");
}
const admin = createClient(host, secret, {auth:{persistSession:false,autoRefreshToken:false}});
const anonClient = createClient(host, anon, {auth:{persistSession:false,autoRefreshToken:false}});
const testPassword = "Synthetic-local-only-2026!a1";
const created = [];
async function makeUser(label) {
  const email = `ci-${label}-${process.pid}@rotevo.invalid`;
  const {data,error} = await admin.auth.admin.createUser({email,password:testPassword,email_confirm:true});
  assert.ifError(error);
  assert.ok(data.user?.id);
  created.push(data.user.id);
  return {id:data.user.id,email};
}
async function token(email) {
  const {data,error} = await anonClient.auth.signInWithPassword({email,password:testPassword});
  assert.ifError(error);
  assert.ok(data.session?.access_token);
  return data.session.access_token;
}
async function post(path,jwt,payload) {
  const res=await fetch(app.slice(0,-1)+path,{
    method:"POST",redirect:"error",headers:{"Content-Type":"application/json",Authorization:`Bearer ${jwt}`},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)
  });
  return res.status;
}
try {
  const client = await makeUser("client");
  const inactive = await makeUser("inactive-admin");
  const {error:profileError} = await admin.from("profiles").insert([
    {id:client.id,role:"client",full_name:"Fictitious client",email:client.email},
    {id:inactive.id,role:"client",full_name:"Fictitious inactive admin",email:inactive.email}
  ]);
  assert.ifError(profileError);
  const {error:teamError}=await admin.from("team_members").insert({
    user_id:inactive.id,display_name:"Fictitious inactive admin",role:"admin",active:false
  });
  assert.ifError(teamError);
  const clientJwt=await token(client.email);
  const inactiveJwt=await token(inactive.email);
  const payload={email:"never-create@rotevo.invalid",password:"LocalOnly!123456",fullName:"Not Created",clientId:"00000000-0000-4000-8000-000000000001"};
  assert.equal(await post("/api/admin/create-client-access",clientJwt,payload),403,"client must not create access");
  assert.equal(await post("/api/team/invite",clientJwt,{email:"never-invite@rotevo.invalid",displayName:"Fictitious Invitee",role:"producer"}),403,"client cannot invite");
  assert.equal(await post("/api/team/invite",inactiveJwt,{email:"never-invite@rotevo.invalid",displayName:"Fictitious Invitee",role:"producer"}),403,"inactive admin cannot invite");
  console.log("PASS: client create=403, client invite=403, inactive admin invite=403");
} finally {
  for(const id of created.reverse()) {
    const {error}=await admin.auth.admin.deleteUser(id);
    if(error) console.error("LOCAL CLEANUP FAILED",id,error.message);
  }
}
