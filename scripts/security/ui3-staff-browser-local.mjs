// Browser-level synthetic staff portal homologation, only in detached local Supabase.
// No hosted projects, real users or external URLs. Requires Playwright Chromium.
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {chromium} from "playwright";

const api=process.env.API_URL,app=process.env.ROTEVO_LOCAL_APP_URL;
const isLocal=(url)=>{const u=new URL(url);assert.equal(u.protocol,"http:");assert.ok(["127.0.0.1","localhost"].includes(u.hostname));return u;};
assert.equal(process.env.ROTEVO_LOCAL_API_TESTS,"YES_LOCAL_ONLY");
isLocal(api);isLocal(app);
assert.equal(api,"http://127.0.0.1:54321");
assert.equal(app,"http://127.0.0.1:3000/");
assert.ok(process.env.SERVICE_ROLE_KEY);
const client=createClient(api,process.env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const suffix=randomUUID(),email="ui3-staff-"+suffix+"@synthetic.invalid",password="Synthetic-UI3-Test-"+suffix+"!";
const projectId=randomUUID(),clientId=randomUUID();
async function must(query,label){const r=await query;assert.equal(r.error,null,label+": "+(r.error?.message??""));return r.data;}
const account=await must(client.auth.admin.createUser({email,password,email_confirm:true}),"create isolated staff identity");
await must(client.from("profiles").insert({id:account.user.id,email,full_name:"Synthetic Staff",role:"staff"}),"synthetic profile");
await must(client.from("team_members").insert({user_id:account.user.id,display_name:"Synthetic Staff",role:"producer",active:true}),"synthetic membership");
await must(client.from("clients").insert({id:clientId,name:"Synthetic Organization",slug:"synthetic-"+suffix}),"synthetic client");
await must(client.from("planning_projects").insert({id:projectId,client_id:clientId,title:"Synthetic Assigned Project",slug:"synthetic-"+suffix,status:"draft"}),"synthetic project");
await must(client.from("team_project_assignments").insert({user_id:account.user.id,project_id:projectId}),"synthetic assignment");
await must(client.from("team_member_permissions").insert({user_id:account.user.id,permission:"projects.read"}),"synthetic permission");

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},locale:"pt-BR"});
 await page.goto(new URL("/estrategista/login",app).href,{waitUntil:"domcontentloaded"});
 await page.getByLabel("E-mail").fill(email);
 await page.getByLabel("Senha",{exact:true}).fill(password);
 await page.getByRole("button",{name:"Acessar Ecossistema"}).click();
 try {
  await page.waitForURL("**/equipe/meu-acesso",{timeout:20000});
 } catch (error) {
  const view=await page.locator("body").innerText().catch(()=>"(body unavailable)");
  const alert=await page.locator('[role="alert"]').allTextContents().catch(()=>[]);
  console.error("Synthetic staff redirect diagnostic:",JSON.stringify({url:page.url(),alerts:alert,visible:view.slice(0,850)}));
  await page.screenshot({path:process.env.RUNNER_TEMP+"/ui3-synthetic-staff-login-error.png",fullPage:true}).catch(()=>{});
  throw error;
 }
 await page.getByRole("heading",{name:"Área da equipe ROTEVO"}).waitFor({timeout:15000});
 await page.getByText("Synthetic Assigned Project").waitFor({timeout:15000});
 assert.equal(await page.getByText("Projetos atribuídos: 1").count(),1);
 assert.equal(await page.getByText("Nenhuma permissão de consulta concedida").count(),0);
 assert.equal(await page.getByRole("link",{name:"Acessar Financeiro"}).count(),0,"no finance.read must hide finance action");
 assert.equal(await page.getByText("PRIVATE_SYNTHETIC").count(),0,"internal data never shown");
 console.log("PASS staff actual UI: login redirects to staff portal; one assigned project; no finance link or internal JSON");
 for(const width of [320,375,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  await page.waitForTimeout(100);
  const data=await page.evaluate(()=>({
   scroll:document.documentElement.scrollWidth,
   viewport:document.documentElement.clientWidth,
   title:document.querySelector("h1")?.textContent
  }));
  assert.ok(data.scroll<=data.viewport+1,"Horizontal overflow at "+width+"px: "+JSON.stringify(data));
  assert.equal(data.title,"Área da equipe ROTEVO");
  console.log("PASS staff responsive viewport",width,"px");
 }
 await page.setViewportSize({width:390,height:900});
 await page.screenshot({path:process.env.RUNNER_TEMP+"/ui3-synthetic-staff-390.png",fullPage:true});
 await page.keyboard.press("Tab");
 const active=await page.evaluate(()=>document.activeElement?.tagName?.toLowerCase());
 assert.ok(["a","button","input"].includes(active),"keyboard focus must reach an interactive element");
 await page.getByRole("button",{name:"Sair"}).click();
 await page.waitForURL("**/estrategista/login",{timeout:30000});
 console.log("PASS staff UI logout and focusable keyboard navigation");
} finally {
 await browser.close();
}
