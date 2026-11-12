import test from "node:test";
import assert from "node:assert/strict";

const base=process.env.ROTEVO_LOCAL_APP_URL;
assert.equal(process.env.ROTEVO_LOCAL_API_TESTS,"YES_LOCAL_ONLY");
const url=new URL(base);
assert.equal(url.protocol,"http:");
assert.ok(["127.0.0.1","localhost"].includes(url.hostname));

test("unreleased editorial approval endpoint refuses requests even with body",async()=>{
 const response=await fetch(new URL("/api/workflow/editorial/decision",base),{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({projectId:"00000000-0000-4000-8000-000000000001",
   contentId:"post",contentVersion:"01",phase:"idea",decision:"approved"})
 });
 assert.equal(response.status,503);
 assert.equal(response.headers.get("cache-control"),"no-store");
 const body=await response.json();
 assert.equal(body.error,"Fluxo de aprovações em homologação.");
});

test("unreleased strategist approval-request endpoint rejects body with 503",async()=>{
 const response=await fetch(new URL("/api/workflow/editorial/request",base),{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({projectId:"00000000-0000-4000-8000-000000000001",
   contentId:"post",contentVersion:"01",phase:"idea"})
 });
 assert.equal(response.status,503);
 assert.equal(response.headers.get("cache-control"),"no-store");
 assert.equal((await response.json()).error,"Envio para aprovação em homologação.");
});

test("notification list and mark-read are fail-closed without release flags",async()=>{
 const list=await fetch(new URL("/api/workflow/notifications?limit=30",base));
 assert.equal(list.status,503);
 assert.equal(list.headers.get("cache-control"),"no-store");
 const patch=await fetch(new URL("/api/workflow/notifications",base),{
  method:"PATCH",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({notificationId:"00000000-0000-4000-8000-000000000001"})
 });
 assert.equal(patch.status,503);
});
