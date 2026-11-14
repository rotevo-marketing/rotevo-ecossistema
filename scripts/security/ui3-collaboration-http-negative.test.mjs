import test from "node:test";
import assert from "node:assert/strict";
// This suite may ONLY be used against the synthetic loopback Next.js server in CI.
const base=process.env.ROTEVO_LOCAL_APP_URL;
if(process.env.ROTEVO_LOCAL_API_TESTS!=="YES_LOCAL_ONLY"||!base||!/^http:\/\/127\.0\.0\.1:3000\/$/.test(base))throw Error("Local-only collaboration tests require the explicit loopback fixture.");
const projectId="123e4567-e89b-42d3-a456-426614174000";
const url=new URL("api/collaboration/messages",base);
url.searchParams.set("projectId",projectId);
url.searchParams.set("resourceType","task");
url.searchParams.set("resourceId","t1");
test("collaboration remains closed when flag is absent",async()=>{
 const get=await fetch(url,{headers:{Authorization:"Bearer synthetic-not-a-token"}});
 assert.equal(get.status,503);
 assert.equal(get.headers.get("cache-control"),"no-store");
 const post=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer synthetic-not-a-token"},body:JSON.stringify({projectId,resourceType:"task",resourceId:"t1",body:"synthetic"})});
 assert.equal(post.status,503);
});
test("malformed resource is rejected before any database access",async()=>{
 const bad=new URL(url);bad.searchParams.set("resourceId","../other");
 const get=await fetch(bad);
 assert.equal(get.status,400);
 const post=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,resourceType:"task",resourceId:"t1",body:""})});
 assert.equal(post.status,400);
});
