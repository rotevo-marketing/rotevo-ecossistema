#!/usr/bin/env node
/**
 * PR17 | Hosted Auth smoke test, exclusively for UI3 homologation Supabase.
 * No Vercel deployments, production mutations or persistent user fixtures.
 * The operator must provide the lab-only admin key in a trusted server process.
 */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
const REF="tqedxahsqbskninjenfg",URL="https://"+REF+".supabase.co";
if(!process.argv.includes("--execute")||
   process.env.ROTEVO_HOSTED_AUTH_SMOKE!=="I_AUTHORIZE_HOMOLOGATION_ONLY"){
 console.log("DRY RUN: no API calls; pass --execute and explicit homologation opt-in.");
 process.exit(0);
}
assert.equal(process.env.ROTEVO_HOSTED_SUPABASE_URL,URL,"Homologation-only URL guard");
assert.ok(!process.env.CI&&!process.env.VERCEL,"Cannot run in CI or Vercel");
const anon=process.env.ROTEVO_HOSTED_ANON_KEY,secret=process.env.ROTEVO_HOSTED_SERVICE_KEY;
assert.ok(anon&&secret&&anon!==secret,"Distinct laboratory public and admin keys required");
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(URL,secret,options),suffix=randomUUID();
const email="ui3-hosted-auth-"+suffix+"@synthetic.invalid";
const password="Lab-"+randomUUID()+"-"+randomUUID()+"!";
let createdId=null,failed=false;
try{
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,
  app_metadata:{rotevo_synthetic_lab:true}});
 if(error||!data?.user?.id)throw Error("Cannot create isolated synthetic user");
 createdId=data.user.id;
 const client=createClient(URL,anon,options);
 const login=await client.auth.signInWithPassword({email,password});
 if(login.error||login.data?.user?.id!==createdId)throw Error("Real hosted Auth login failed");
 const list=await client.rpc("rotevo_workflow_list_notifications_v2",{p_limit:30,p_unread_only:false});
 if(list.error)throw Error("Hosted notification RPC failed");
 assert.ok(Array.isArray(list.data)&&list.data.length===0,"Unassigned user sees no alerts");
 const mark=await client.rpc("rotevo_workflow_mark_notification_read_v2",{p_notification_id:randomUUID()});
 if(mark.error)throw Error("Hosted mark-read RPC failed");
 assert.equal(mark.data,false,"Cannot mark unowned notification as read");
 console.log("PASS real hosted Auth login, zero unauthorized notifications and mark-read denial");
 await client.auth.signOut({scope:"local"});
}catch(e){failed=true;console.error("FAIL hosted Auth test:",e?.message??"unknown error");}
finally{
 if(createdId){
  const {error}=await admin.auth.admin.deleteUser(createdId);
  if(error){failed=true;console.error("BLOCKER: synthetic user cleanup failed; reconcile privately");}
  else console.log("PASS cleanup via Auth Admin");
 }
}
if(failed)process.exitCode=1;
