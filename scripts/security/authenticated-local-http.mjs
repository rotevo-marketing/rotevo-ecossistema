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
async function post(path,jwt,payload,headers={}) {
  const res=await fetch(app.slice(0,-1)+path,{
    method:"POST",redirect:"error",headers:{"Content-Type":"application/json",Authorization:`Bearer ${jwt}`,...headers},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)
  });
  return res.status;
}
try {
  const client = await makeUser("client");
  const inactive = await makeUser("inactive-admin");
  const strategist = await makeUser("strategist");
  const active = await makeUser("active-admin");
  const {error:profileError} = await admin.from("profiles").insert([
    {id:client.id,role:"client",full_name:"Fictitious client",email:client.email},
    {id:inactive.id,role:"client",full_name:"Fictitious inactive admin",email:inactive.email},
    {id:strategist.id,role:"strategist",full_name:"Fictitious strategist",email:strategist.email},
    {id:active.id,role:"client",full_name:"Fictitious active admin",email:active.email}
  ]);
  assert.ifError(profileError);
  const {error:teamError}=await admin.from("team_members").insert([
    {user_id:inactive.id,display_name:"Fictitious inactive admin",role:"admin",active:false},
    {user_id:active.id,display_name:"Fictitious active admin",role:"admin",active:true}
  ]);
  assert.ifError(teamError);
  // End-to-end permitted write: ordinary user may edit only their own display name.
  const {error:signInError}=await anonClient.auth.signInWithPassword({email:client.email,password:testPassword});
  assert.ifError(signInError);
  const {data:edited,error:editError}=await anonClient.from("profiles")
    .update({full_name:"Fictitious client updated"}).eq("id",client.id).select("full_name").single();
  assert.ifError(editError);
  assert.equal(edited.full_name,"Fictitious client updated","own display name update should work");
  const {data:confirmed,error:confirmationError}=await admin.from("profiles")
    .select("full_name,role").eq("id",client.id).single();
  assert.ifError(confirmationError);
  assert.equal(confirmed.full_name,"Fictitious client updated");
  assert.equal(confirmed.role,"client","display name edit must not change role");
  // Mutating security-sensitive fields must be denied at the real local REST layer.
  const {error:roleWriteError}=await anonClient.from("profiles")
    .update({role:"strategist"}).eq("id",client.id);
  assert.ok(roleWriteError,"authenticated client must not update role");
  const {error:tenantWriteError}=await anonClient.from("profiles")
    .update({client_id:"00000000-0000-4000-8000-000000000001"}).eq("id",client.id);
  assert.ok(tenantWriteError,"authenticated client must not reassign its tenant");
  const {data:protectedProfile,error:protectedReadError}=await admin.from("profiles")
    .select("role,client_id").eq("id",client.id).single();
  assert.ifError(protectedReadError);
  assert.equal(protectedProfile.role,"client","role is unchanged after forbidden write");
  assert.equal(protectedProfile.client_id,null,"tenant is unchanged after forbidden write");
  await anonClient.auth.signOut();
  const clientJwt=await token(client.email);
  const inactiveJwt=await token(inactive.email);
  const strategistJwt=await token(strategist.email);
  const activeJwt=await token(active.email);
  const payload={email:"never-create@rotevo.invalid",password:"LocalOnly!123456",fullName:"Not Created",clientId:"00000000-0000-4000-8000-000000000001"};
  assert.equal(await post("/api/admin/create-client-access",clientJwt,payload),403,"client must not create access");
  assert.equal(await post("/api/team/invite",clientJwt,{email:"never-invite@rotevo.invalid",displayName:"Fictitious Invitee",role:"producer"}),403,"client cannot invite");
  assert.equal(await post("/api/team/invite",inactiveJwt,{email:"never-invite@rotevo.invalid",displayName:"Fictitious Invitee",role:"producer"}),403,"inactive admin cannot invite");
  // A valid strategist must get beyond permission checks but never create an account:
  // the requested tenant does not exist in this disposable fixture.
  assert.equal(await post("/api/admin/create-client-access",strategistJwt,payload),404,"strategist passes role gate and rejects missing tenant");
  // An active admin passes role authorization, but a role outside the allow-list is rejected.
  // This request must never contact Auth invite or send an email.
  assert.equal(await post("/api/team/invite",activeJwt,{email:"never-invite@rotevo.invalid",displayName:"Fictitious Invitee",role:"superadmin"}),400,"admin cannot assign forbidden role");
  const safeInvite={email:"never-invite@rotevo.invalid",displayName:"Fictitious Invitee",role:"producer"};
  const probe={"x-rotevo-local-probe":"authorized-no-send"};
  assert.equal(await post("/api/team/invite",clientJwt,safeInvite,probe),403,"client cannot trigger local invite probe");
  assert.equal(await post("/api/team/invite",inactiveJwt,safeInvite,probe),403,"inactive admin cannot trigger local invite probe");
  assert.equal(await post("/api/team/invite",activeJwt,safeInvite,probe),200,"active admin passes authorization with delivery disabled");
  // Local-only positive projection test with two synthetic tenants.
  const tenantB=await makeUser("tenant-b");
  const {error:tenantBProfileError}=await admin.from("profiles").insert({
    id:tenantB.id,role:"client",full_name:"Synthetic B",email:tenantB.email
  });
  assert.ifError(tenantBProfileError);
  const {data:tenants,error:tenantsError}=await admin.from("clients").insert([
    {name:"Synthetic isolation A",slug:`ci-isolation-a-${process.pid}`},
    {name:"Synthetic isolation B",slug:`ci-isolation-b-${process.pid}`}
  ]).select("id");
  assert.ifError(tenantsError);
  assert.equal(tenants.length,2);
  const [a,b]=tenants;
  const {error:linkAError}=await admin.from("profiles").update({client_id:a.id}).eq("id",client.id);
  assert.ifError(linkAError);
  const {error:linkBError}=await admin.from("profiles").update({client_id:b.id}).eq("id",tenantB.id);
  assert.ifError(linkBError);
  const {error:projectsError}=await admin.from("planning_projects").insert([
    {client_id:a.id,title:"Public A",slug:"ci-public-a",data:{
      internalNotes:"PRIVATE_TENANT_A_SENTINEL",
      editorialCalendar:[{id:"e-a",title:"Published A",status:"awaiting_client",visibleToClient:true},
                         {id:"e-hide",title:"Secret A",status:"review",visibleToClient:false}]
    }},
    {client_id:b.id,title:"Public B",slug:"ci-public-b",data:{internalNotes:"PRIVATE_TENANT_B_SENTINEL"}}
  ]);
  assert.ifError(projectsError);
  async function getProjects(jwt) {
    const response=await fetch(app.slice(0,-1)+"/api/client/projects",{
      headers:jwt?{Authorization:`Bearer ${jwt}`}:{},redirect:"error",signal:AbortSignal.timeout(15000)
    });
    return {status:response.status,body:await response.text()};
  }
  const allowed=await getProjects(clientJwt);
  assert.equal(allowed.status,200,"client A projects GET");
  assert.equal(JSON.parse(allowed.body).projects.length,1,"client A reads only one project");
  assert.ok(allowed.body.includes("Public A"));
  for(const privateValue of ["PRIVATE_TENANT_A_SENTINEL","PRIVATE_TENANT_B_SENTINEL","Public B","Secret A"])
    assert.equal(allowed.body.includes(privateValue),false,`must never expose ${privateValue}`);
  const bJwt=await token(tenantB.email);
  const onlyB=await getProjects(bJwt);
  assert.equal(onlyB.status,200);
  assert.ok(onlyB.body.includes("Public B"));
  assert.equal(onlyB.body.includes("Public A"),false);
  assert.equal(onlyB.body.includes("PRIVATE_TENANT_B_SENTINEL"),false);
  assert.equal((await getProjects(strategistJwt)).status,403,"strategist cannot use client portal endpoint");
  assert.equal((await getProjects()).status,401,"unauthenticated denied");
  const projectId=JSON.parse(allowed.body).projects[0].id;
  async function adminRead(jwt,id) {
    const response=await fetch(app.slice(0,-1)+"/api/admin/project?id="+encodeURIComponent(id),{
      headers:jwt?{Authorization:`Bearer ${jwt}`}:{},redirect:"error",signal:AbortSignal.timeout(15000)
    });
    return {status:response.status,body:await response.text()};
  }
  assert.equal((await adminRead(clientJwt,projectId)).status,403,"client must not read internal administrator project");
  assert.equal((await adminRead(bJwt,projectId)).status,403,"client from another tenant must not read administrator project");
  assert.equal((await adminRead(null,projectId)).status,401,"anonymous admin read rejected");
  const strategistProject=await adminRead(strategistJwt,projectId);
  assert.equal(strategistProject.status,200,"strategist can read project");
  assert.ok(strategistProject.body.includes("PRIVATE_TENANT_A_SENTINEL"),"internal JSON available only to authorized strategist");
  assert.equal((await adminRead(strategistJwt,"invalid-id")).status,400,"invalid UUID denied");
  async function patchProject(jwt,payload){
    const response=await fetch(app.slice(0,-1)+"/api/admin/project/update",{
      method:"PATCH",headers:jwt?{"Authorization":`Bearer ${jwt}`,"Content-Type":"application/json"}:{"Content-Type":"application/json"},
      body:JSON.stringify(payload),redirect:"error",signal:AbortSignal.timeout(15000)
    });
    return {status:response.status,body:await response.text()};
  }
  const original=JSON.parse(strategistProject.body).project;
  const candidate={projectId,expectedUpdatedAt:original.updated_at,data:{internalNotes:"PRIVATE_UPDATED_BY_STRATEGIST"}};
  assert.equal((await patchProject(null,candidate)).status,401,"anonymous project edit rejected");
  assert.equal((await patchProject(clientJwt,candidate)).status,403,"client project edit rejected");
  assert.equal((await patchProject(bJwt,candidate)).status,403,"other tenant project edit rejected");
  const changed=await patchProject(strategistJwt,candidate);
  assert.equal(changed.status,200,"strategist can save a version-checked document");
  assert.equal(JSON.parse(changed.body).project.data.internalNotes,"PRIVATE_UPDATED_BY_STRATEGIST");
  assert.equal((await patchProject(strategistJwt,candidate)).status,409,"stale edit must not overwrite newer version");
  const clientAfterUpdate=await getProjects(clientJwt);
  assert.equal(clientAfterUpdate.status,200);
  assert.equal(clientAfterUpdate.body.includes("PRIVATE_UPDATED_BY_STRATEGIST"),false,"private update must never appear to client");
  console.log("PASS: own-name edit, client and inactive admin denied; active admin authorized without invite delivery; strategist target guard; client-project tenant isolation");
} finally {
  for(const id of created.reverse()) {
    const {error}=await admin.auth.admin.deleteUser(id);
    if(error) console.error("LOCAL CLEANUP FAILED",id,error.message);
  }
}
