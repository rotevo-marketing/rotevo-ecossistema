// Viewport smoke tests of the real Client and Strategist portals on disposable local Supabase.
// No external network, hosted identities or customer data.
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {chromium} from "playwright";
import axe from "axe-core";
const api=process.env.API_URL,app=process.env.ROTEVO_LOCAL_APP_URL;
assert.equal(process.env.ROTEVO_LOCAL_API_TESTS,"YES_LOCAL_ONLY");
assert.equal(api,"http://127.0.0.1:54321");
assert.equal(app,"http://127.0.0.1:3000/");
const db=createClient(api,process.env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const suffix=randomUUID();
async function must(query,label){const r=await query;assert.equal(r.error,null,label+": "+(r.error?.message??""));return r.data;}
async function identity(role){
 const email="ui3-"+role+"-"+suffix+"@synthetic.invalid",password="Local-Ui3-"+suffix+"!";
 const {user}=await must(db.auth.admin.createUser({email,password,email_confirm:true}),"create "+role);
 await must(db.from("profiles").insert({id:user.id,email,role,full_name:"Synthetic "+role}),"create profile "+role);
 if(role==="strategist")await must(db.from("team_members").insert({user_id:user.id,display_name:"Synthetic Administrator",role:"admin",active:true}),"admin membership");
 return {email,password,id:user.id};
}
const admin=await identity("strategist"),client=await identity("client");
const clientId=randomUUID(),projectId=randomUUID();
await must(db.from("clients").insert({id:clientId,name:"Synthetic Portal Client",slug:"browser-"+suffix}),"client");
await must(db.from("profiles").update({client_id:clientId}).eq("id",client.id),"client association");
await must(db.from("planning_projects").insert({id:projectId,client_id:clientId,title:"Synthetic Portal Plan",slug:"browser-"+suffix,status:"draft",data:{internalNotes:"DO_NOT_EXPOSE_INTERNAL_FIXTURE"}}),"project");
const sharedContract={id:randomUUID(),title:"Contrato Sintético Visível",status:"active",service:"Planejamento Estratégico",summary:"Escopo aprovado para teste exclusivamente sintético.",scope:["Diagnóstico autorizado","Planejamento autorizado"],startDate:"2026-11-10",endDate:"2027-02-10",signedDate:"2026-11-10",documentUrl:"",visibleToClient:true,history:[{id:randomUUID(),title:"Contrato formalizado",date:"2026-11-10"}]};
const privateContract={...sharedContract,id:randomUUID(),title:"PRIVATE_CONTRACT_CANARY",visibleToClient:false};
await must(db.from("client_workspaces").insert({client_id:clientId,data:{modules:["planning","content","meetings","contract","finance"],contracts:[sharedContract,privateContract],folders:[]}}),"workspace");

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
async function session(role,account,path,destination){
 const page=await browser.newPage({viewport:{width:1440,height:900},locale:"pt-BR"});
 await page.goto(new URL(path,app).href,{waitUntil:"networkidle"});
 await page.waitForTimeout(350);
 await page.getByLabel("E-mail").fill(account.email);
 await page.getByLabel("Senha",{exact:true}).fill(account.password);
 await page.getByRole("button",{name:"Acessar Ecossistema"}).click();
 await page.waitForURL("**"+destination,{timeout:25000});
 await page.getByRole("heading",{name:"Visão geral",exact:true}).first().waitFor({timeout:22000});
 return page;
}
async function checkWidths(role,page){
 for(const width of [320,375,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  await page.waitForTimeout(120);
  const measured=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert.ok(measured.scroll<=measured.viewport+1,role+" overflow at "+width+"px: "+JSON.stringify(measured));
  assert.equal(await page.getByRole("heading",{name:"Visão geral",exact:true}).first().count(),1);
  console.log("PASS "+role+" responsive viewport "+width+" px");
 }
 await page.setViewportSize({width:390,height:900});
 await page.screenshot({path:process.env.RUNNER_TEMP+"/ui3-synthetic-"+role+"-390.png",fullPage:true});
 await page.addScriptTag({content:axe.source});
 const scan=await page.evaluate(async()=>await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));
 const serious=scan.violations.filter(v=>v.impact==="serious"||v.impact==="critical");
 console.log("ACCESSIBILITY",role,JSON.stringify(scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,450),html:n.html?.slice(0,180)}))}))));
 assert.equal(serious.length,0,role+" critical/serious automated WCAG violations: "+JSON.stringify(serious.map(v=>({id:v.id,nodes:v.nodes.length}))));

}
try {
 const customer=await session("client",client,"/","/cliente");
 await checkWidths("client",customer);
 // Inspect an explicitly shared contract in the real portal (desktop nav, all four tabs).
 await customer.setViewportSize({width:1440,height:900});
 await customer.getByRole("navigation",{name:"Navegação do portal"}).getByRole("button",{name:"Contrato"}).click();
 await customer.getByRole("heading",{name:"Contrato Sintético Visível"}).waitFor();
 assert.equal(await customer.getByText("PRIVATE_CONTRACT_CANARY").count(),0,"unshared contract must not be projected");
 const contractTabs=customer.getByRole("tablist",{name:"Detalhes do contrato"});
 for(const label of ["Resumo","Escopo contratado","Documento","Histórico"]){
  await contractTabs.getByRole("tab",{name:label}).click();
  assert.equal(await contractTabs.getByRole("tab",{name:label}).getAttribute("aria-selected"),"true");
  assert.equal(await customer.getByRole("tabpanel").count(),1);
 }
 await contractTabs.getByRole("tab",{name:"Escopo contratado"}).click();
 await customer.getByText("Diagnóstico autorizado").waitFor();
 await customer.getByText("Planejamento autorizado").waitFor();
 await contractTabs.getByRole("tab",{name:"Resumo"}).click();
 await customer.getByText("Escopo aprovado para teste exclusivamente sintético.").waitFor();
 for(const width of [320,375,390,430,768,1024,1440]){
  await customer.setViewportSize({width,height:900});
  await customer.waitForTimeout(100);
  const measure=await customer.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert.ok(measure.scroll<=measure.viewport+1,"Contract page overflow at "+width+"px: "+JSON.stringify(measure));
  await customer.getByRole("heading",{name:"Contrato Sintético Visível"}).waitFor();
  console.log("PASS shared contract responsive viewport",width,"px");
 }
 await customer.setViewportSize({width:390,height:900});
 await customer.screenshot({path:process.env.RUNNER_TEMP+"/ui3-synthetic-shared-contract-390.png",fullPage:true});
 for(const label of ["Resumo","Escopo contratado","Documento","Histórico"]){
  const tab=contractTabs.getByRole("tab",{name:label});
  await tab.click();
  await customer.addScriptTag({content:axe.source});
  const scan=await customer.evaluate(async()=>await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));
  const serious=scan.violations.filter(v=>v.impact==="serious"||v.impact==="critical");
  console.log("ACCESSIBILITY shared contract",label,JSON.stringify(scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,280)}))}))));
  assert.equal(serious.length,0,"Shared contract "+label+" WCAG issues: "+JSON.stringify(serious.map(v=>({id:v.id,nodes:v.nodes.length}))));
 }
 await contractTabs.getByRole("tab",{name:"Resumo"}).click();
 console.log("PASS synthetic shared contract visual, four tabs, authorized scope and hidden contract excluded");

 assert.equal(await customer.getByText("DO_NOT_EXPOSE_INTERNAL_FIXTURE").count(),0,"private data stays hidden");
 await customer.close();
 const strategist=await session("strategist",admin,"/estrategista/login","/admin");
 await checkWidths("strategist",strategist);
 await strategist.close();
 console.log("PASS synthetic client and strategist portal logins, private projection and all seven widths");
} finally {await browser.close();}
