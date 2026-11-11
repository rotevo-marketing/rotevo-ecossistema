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
const collaboration=process.env.NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED==="true";
async function must(query,label){const r=await query;assert.equal(r.error,null,label+": "+(r.error?.message??""));return r.data;}
const account=await must(client.auth.admin.createUser({email,password,email_confirm:true}),"create isolated staff identity");
await must(client.from("profiles").insert({id:account.user.id,email,full_name:"Synthetic Staff",role:"staff"}),"synthetic profile");
await must(client.from("team_members").insert({user_id:account.user.id,display_name:"Synthetic Staff",role:"producer",active:true}),"synthetic membership");
await must(client.from("clients").insert({id:clientId,name:"Synthetic Organization",slug:"synthetic-"+suffix}),"synthetic client");
await must(client.from("planning_projects").insert({id:projectId,client_id:clientId,title:"Synthetic Assigned Project",slug:"synthetic-"+suffix,status:"draft",data:{executionTimeline:[{id:"staff-shared-task",title:"Tarefa compartilhada",visibleToClient:true},{id:"staff-hidden-task",title:"PRIVATE_SYNTHETIC",visibleToClient:false}],editorialCalendar:[{id:"staff-shared-content",title:"Conteúdo compartilhado",visibleToClient:true,version:"01"}]}}),"synthetic project");
await must(client.from("team_project_assignments").insert({user_id:account.user.id,project_id:projectId}),"synthetic assignment");
await must(client.from("team_member_permissions").insert({user_id:account.user.id,permission:"projects.read"}),"synthetic permission");
if(collaboration)await must(client.from("team_member_permissions").insert({user_id:account.user.id,permission:"projects.write"}),"synthetic collaboration write permission");

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},locale:"pt-BR"});
 const diagnosticEvents=[];
 page.on("framenavigated",frame=>{if(frame===page.mainFrame())diagnosticEvents.push({kind:"navigation",path:new URL(frame.url()).pathname});});
 page.on("pageerror",error=>diagnosticEvents.push({kind:"browser-error",name:error.name,message:error.message.slice(0,180)}));
 page.on("response",response=>{const u=new URL(response.url());if(u.pathname.includes("/auth/v1/token")||u.pathname.includes("/rest/v1/profiles"))diagnosticEvents.push({kind:"api",path:u.pathname,status:response.status()});});

 await page.goto(new URL("/estrategista/login",app).href,{waitUntil:"networkidle"});
 await page.waitForTimeout(500); // Allow initial Next.js hydration before submitting the form.
 await page.getByLabel("E-mail").fill(email);
 await page.getByLabel("Senha",{exact:true}).fill(password);
 await page.getByRole("button",{name:"Acessar Ecossistema"}).click();
 try {
  await page.waitForURL("**/equipe/meu-acesso",{timeout:20000});
 } catch (error) {
  const view=await page.locator("body").innerText().catch(()=>"(body unavailable)");
  const alert=await page.locator('[role="alert"]').allTextContents().catch(()=>[]);
  console.error("Synthetic staff redirect diagnostic:",JSON.stringify({url:page.url(),alerts:alert,visible:view.slice(0,850),events:diagnosticEvents.slice(-25)}));
  await page.screenshot({path:process.env.RUNNER_TEMP+"/ui3-synthetic-staff-login-error.png",fullPage:true}).catch(()=>{});
  throw error;
 }
 await page.getByRole("heading",{name:"Área da equipe ROTEVO"}).waitFor({timeout:15000});
 await page.getByRole("listitem").filter({hasText:"Synthetic Assigned Project"}).waitFor({timeout:15000});
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
 if(collaboration){
  await page.getByRole("button",{name:"Conversas de Synthetic Assigned Project",exact:true}).click();
  const dialog=page.getByRole("dialog");
  await dialog.getByRole("button",{name:"Tarefa: Tarefa compartilhada",exact:true}).waitFor();
  assert.equal(await dialog.getByText("PRIVATE_SYNTHETIC").count(),0);
  for(const [item,body] of [["Tarefa: Tarefa compartilhada","Resposta da equipe à tarefa"],["Conteúdo: Conteúdo compartilhado","Resposta da equipe ao conteúdo"]]){
   await dialog.getByRole("button",{name:item,exact:true}).click();
   const thread=dialog.getByRole("region",{name:"Conversa sobre este item"});
   await thread.getByRole("textbox",{name:"Nova mensagem"}).fill(body);
   await thread.getByRole("button",{name:"Enviar mensagem"}).click();
   await thread.getByText(body,{exact:true}).waitFor();
   await dialog.getByRole("button",{name:"Voltar aos itens",exact:true}).click();
  }
  await dialog.getByRole("button",{name:"Fechar",exact:true}).click();
  console.log("PASS staff browser collaboration in shared task and content without exposing private items");
 }else{
  assert.equal(await page.getByRole("button",{name:/Conversas de/}).count(),0);
 }
 const exitButton=page.getByRole("button",{name:"Sair"});
 await exitButton.focus();
 assert.equal(await exitButton.evaluate(node=>node===document.activeElement),true,"logout control must receive programmatic keyboard focus");
 await page.keyboard.press("Tab");
 const active=await page.evaluate(()=>({tag:document.activeElement?.tagName?.toLowerCase(),label:document.activeElement?.textContent?.trim().slice(0,40)}));
 assert.ok(["a","button","input"].includes(active.tag),"Tab from logout must reach an interactive control: "+JSON.stringify(active));
 await page.getByRole("button",{name:"Sair"}).click();
 await page.waitForURL("**/estrategista/login",{timeout:30000});
 console.log("PASS staff UI logout and focusable keyboard navigation");
} finally {
 await browser.close();
}
