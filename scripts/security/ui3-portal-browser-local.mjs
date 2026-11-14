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
await must(db.from("client_users").insert({client_id:clientId,user_id:client.id}),"client account membership for workflow authorization");
const releasedRich={format:"blocknote-v1",blocks:[{id:"released-html",type:"visualHtml",props:{label:"Documento publicado sintético",description:"Leitura autorizada",height:300,markup:"<section><p>PLANNING_PUBLIC_CANARY</p></section>",stylesheet:"section{padding:12px}p{color:#344054}"},children:[]}]};
const unreleasedRich={format:"blocknote-v1",blocks:[{id:"unreleased",type:"paragraph",content:"PLANNING_DRAFT_SECRET"}]};
const planData={internalNotes:"DO_NOT_EXPOSE_INTERNAL_FIXTURE",editorialCalendar:[{id:"ui3-drive-demo",title:"Synthetic Drive Delivery",version:"01",status:"idea",visibleToClient:true}],planningClientAccessEnabled:true,ecosystem2027:{version:1,selectedDocumentCodes:["01.06"],presentedDocumentCodes:["01.06"],documents:{"01.06":{content:"PLANNING_DRAFT_SECRET",richContent:unreleasedRich,reviewStatus:"approved",updatedAt:"2026-11-10T00:00:00Z",publishedAt:"2026-11-10T00:00:00Z",publishedContent:"PLANNING_PUBLIC_CANARY",publishedRichContent:releasedRich}}}};
await must(db.from("planning_projects").insert({id:projectId,client_id:clientId,title:"Synthetic Portal Plan",slug:"browser-"+suffix,status:"published",data:planData}),"project");
const secondClientId=randomUUID(),secondProjectId=randomUUID();
await must(db.from("clients").insert({id:secondClientId,name:"Synthetic Other Client",slug:"browser-other-"+suffix}),"second synthetic client");
await must(db.from("planning_projects").insert({id:secondProjectId,client_id:secondClientId,title:"Synthetic Other Project",slug:"browser-other-"+suffix,status:"published",data:{executionTimeline:[]}}),"second synthetic project");
const sharedContract={id:randomUUID(),title:"Contrato Sintético Visível",status:"active",service:"Planejamento Estratégico",summary:"Escopo aprovado para teste exclusivamente sintético.",scope:["Diagnóstico autorizado","Planejamento autorizado"],startDate:"2026-11-10",endDate:"2027-02-10",signedDate:"2026-11-10",documentUrl:"",visibleToClient:true,history:[{id:randomUUID(),title:"Contrato formalizado",date:"2026-11-10"}]};
const privateContract={...sharedContract,id:randomUUID(),title:"PRIVATE_CONTRACT_CANARY",visibleToClient:false};
await must(db.from("client_workspaces").insert({client_id:clientId,data:{modules:["planning","content","meetings","contract","finance"],contracts:[sharedContract,privateContract],folders:[]}}),"workspace");

// Only synthetic tenant and a loopback API: assign a Drive delivery before testing browser reload.
const syntheticAuth=createClient(api,process.env.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const adminLogin=await must(syntheticAuth.auth.signInWithPassword({email:admin.email,password:admin.password}),"login synthetic strategist to assign client deliverable");
const assignResult=await fetch(new URL("/api/workflow/client-actions",app),{
 method:"POST",headers:{Authorization:"Bearer "+adminLogin.session.access_token,"Content-Type":"application/json"},
 body:JSON.stringify({projectId,resourceType:"content",resourceId:"ui3-drive-demo",resourceVersion:"01",
 clientUserId:client.id,actionType:"send_material",instructions:"Enviar URL sintética da entrega no Google Drive",
 dueDate:null,requestKey:"ui3-browser-delivery-"+randomUUID(),expectedAuthorUserId:admin.id})
});
assert.equal(assignResult.status,200,"synthetic assignment must be available before client browser login");
const assignmentPayload=await assignResult.json();assert.ok(assignmentPayload.assignment?.id);
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
/** Synthetic-only visual audit; no feature flags enabled, no backend mutations. */
async function auditAppearance(role,page){
 for(const mode of ["light","dark"]){
  await page.setViewportSize({width:390,height:900});
  await page.evaluate(value=>{document.documentElement.dataset.rotevoAppearance=value;},mode);
  await page.waitForTimeout(180);
  const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert.ok(dimensions.scroll<=dimensions.viewport+1,role+" "+mode+" horizontal overflow");
  await page.screenshot({path:process.env.RUNNER_TEMP+"/ui3-synthetic-"+role+"-"+mode+"-390.png",fullPage:true});
  await page.addScriptTag({content:axe.source});
  const report=await page.evaluate(async()=>await window.axe.run(document,{runOnly:{type:"rule",values:["color-contrast"]}}));
  const issues=report.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,190)}))}));
  console.log("APPEARANCE_VISUAL_AUDIT",role,mode,JSON.stringify(issues));
  if(mode==="dark"&&issues.length)console.log("NO_GO_DARK_VISUAL_AUDIT",role,JSON.stringify(issues));
 }
 await page.evaluate(()=>document.documentElement.removeAttribute("data-rotevo-appearance"));
}

try {
 const customer=await session("client",client,"/","/cliente");
  await auditAppearance('client',customer);
 // Verify the actual per-account UI preference, media query switching, and persistence (not only forced CSS tokens).
 await customer.setViewportSize({width:390,height:900});
 await customer.emulateMedia({colorScheme:"dark"});
 await customer.getByRole("button",{name:"Abrir menu da conta"}).click();
 const appearance=customer.getByRole("group",{name:"Aparência da plataforma"});
 await appearance.getByRole("button",{name:"Sistema"}).waitFor();
 await appearance.getByRole("button",{name:"Sistema"}).click();
 await customer.waitForFunction(()=>document.documentElement.dataset.rotevoAppearance==="dark");
 assert.equal(await appearance.getByRole("button",{name:"Sistema"}).getAttribute("aria-pressed"),"true");
 await customer.emulateMedia({colorScheme:"light"});
 await customer.waitForFunction(()=>document.documentElement.dataset.rotevoAppearance==="light");
 await appearance.getByRole("button",{name:"Escuro"}).click();
 await customer.waitForFunction(()=>document.documentElement.dataset.rotevoAppearance==="dark");
 await customer.emulateMedia({colorScheme:"light"});
 assert.equal(await customer.locator("html").getAttribute("data-rotevo-appearance"),"dark","explicit dark overrides system");
 await appearance.getByRole("button",{name:"Sistema"}).click();
 await customer.waitForFunction(()=>document.documentElement.dataset.rotevoAppearance==="light");
 await customer.getByRole("button",{name:"Fechar menu da conta"}).click();
 await customer.reload({waitUntil:"domcontentloaded",timeout:45000});
 await customer.getByRole("heading",{name:"Visão geral",exact:true}).first().waitFor();
 await customer.waitForFunction(()=>document.documentElement.dataset.rotevoAppearance==="light");
 await customer.getByRole("button",{name:"Abrir menu da conta"}).click();
 const savedChoice=customer.getByRole("group",{name:"Aparência da plataforma"}).getByRole("button",{name:"Sistema"});
 await savedChoice.waitFor();
 assert.equal(await savedChoice.getAttribute("aria-pressed"),"true","system preference persists across reload");
 await customer.getByRole("button",{name:"Fechar menu da conta"}).click();
 console.log("PASS client appearance UI: system dark/light, explicit override, saved account preference and reload");
 // Verify an actual assigned delivery survives refresh, submits a URL and persists the submitted status.
 const delivery=customer.locator("[data-ui3-client-actions]");
 await delivery.getByText("Enviar URL sintética da entrega no Google Drive").waitFor({timeout:20000});
 await customer.reload({waitUntil:"domcontentloaded",timeout:45000});
 await delivery.getByText("Enviar URL sintética da entrega no Google Drive").waitFor({timeout:20000});
 await delivery.getByLabel("Link do arquivo no Google Drive").fill("https://drive.google.com/file/d/synthetic-browser-ui3/view");
 await delivery.getByRole("button",{name:"Enviar link para validação"}).click();
 await delivery.getByText("submitted",{exact:true}).waitFor({timeout:20000});
 await customer.reload({waitUntil:"domcontentloaded",timeout:45000});
 await delivery.getByText("submitted",{exact:true}).waitFor({timeout:20000});
 assert.equal(await delivery.getByLabel("Link do arquivo no Google Drive").count(),0,"submitted delivery is no longer editable after refresh");
 console.log("PASS browser client Drive URL submission and persisted status after refresh");
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
  // Audit settled visual states, not intermediate CSS transition frames.
  await customer.waitForTimeout(400);
  await customer.addScriptTag({content:axe.source});
  const scan=await customer.evaluate(async()=>await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));
  const serious=scan.violations.filter(v=>v.impact==="serious"||v.impact==="critical");
  console.log("ACCESSIBILITY shared contract",label,JSON.stringify(scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,280)}))}))));
  assert.equal(serious.length,0,"Shared contract "+label+" WCAG issues: "+JSON.stringify(serious.map(v=>({id:v.id,nodes:v.nodes.length}))));
 }
 await contractTabs.getByRole("tab",{name:"Resumo"}).click();
 // Keyboard navigation test is automated and does not replace a human screen reader.
 const firstTab=contractTabs.getByRole("tab",{name:"Resumo"});
 await firstTab.focus();
 assert.equal(await firstTab.getAttribute("aria-selected"),"true");
 await customer.keyboard.press("ArrowRight");
 const scopeTab=contractTabs.getByRole("tab",{name:"Escopo contratado"});
 assert.equal(await scopeTab.getAttribute("aria-selected"),"true","ArrowRight must activate next tab");
 assert.equal(await scopeTab.evaluate(node=>node===document.activeElement),true,"focus must follow active tab");
 await customer.keyboard.press("End");
 const lastTab=contractTabs.getByRole("tab",{name:"Histórico"});
 assert.equal(await lastTab.getAttribute("aria-selected"),"true","End must activate last tab");
 await customer.keyboard.press("Home");
 assert.equal(await firstTab.getAttribute("aria-selected"),"true","Home must activate first tab");
 assert.equal(await customer.getByRole("tabpanel").getAttribute("aria-labelledby"),await firstTab.getAttribute("id"),"tabpanel maps active tab");
 console.log("PASS shared contract keyboard ArrowRight/Home/End, focus and ARIA tabpanel mapping");
 console.log("PASS synthetic shared contract visual, four tabs, authorized scope and hidden contract excluded");

 // Published strategic document: browser-rendered released HTML/CSS, not the private draft.
 await customer.setViewportSize({width:1440,height:900});
 await customer.getByRole("navigation",{name:"Navegação do portal"}).getByRole("button",{name:"Planejamento",exact:true}).click();
 await customer.getByRole("button",{name:"Ler primeiro documento disponível"}).click();
 await customer.frameLocator('iframe[title="Documento publicado sintético"]').getByText("PLANNING_PUBLIC_CANARY").waitFor({timeout:15000});
 assert.equal(await customer.getByText("PLANNING_DRAFT_SECRET").count(),0,"private draft must not be displayed");
 assert.equal(await customer.getByText("DO_NOT_EXPOSE_INTERNAL_FIXTURE").count(),0,"internal notes must remain absent");
 for(const width of [320,375,390,430,768,1024,1440]){
  await customer.setViewportSize({width,height:900});
  await customer.waitForTimeout(100);
  const measure=await customer.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert.ok(measure.scroll<=measure.viewport+1,"Published planning overflow at "+width+"px: "+JSON.stringify(measure));
  await customer.frameLocator('iframe[title="Documento publicado sintético"]').getByText("PLANNING_PUBLIC_CANARY").waitFor();
  console.log("PASS published planning responsive viewport",width,"px");
 }
 await customer.setViewportSize({width:390,height:900});
 await customer.screenshot({path:process.env.RUNNER_TEMP+"/ui3-synthetic-published-planning-390.png",fullPage:true});
 await customer.addScriptTag({content:axe.source});
 const planScan=await customer.evaluate(async()=>await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));
 console.log("ACCESSIBILITY published planning",JSON.stringify(planScan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,280)}))}))));
 assert.equal(planScan.violations.filter(v=>v.impact==="serious"||v.impact==="critical").length,0,"published planning critical/serious WCAG violations");
 console.log("PASS synthetic published planning HTML/CSS, private draft exclusion and seven viewports");
 assert.equal(await customer.getByText("DO_NOT_EXPOSE_INTERNAL_FIXTURE").count(),0,"private data stays hidden");
 await customer.close();
 const strategist=await session("strategist",admin,"/estrategista/login","/admin");
 await checkWidths("strategist",strategist);
  await auditAppearance('strategist',strategist);
 await strategist.setViewportSize({width:1440,height:900});
 const accountButton=strategist.getByRole("button",{name:/Abrir menu de/});
 await accountButton.waitFor();
 assert.ok((await accountButton.innerText()).trim().length<=2,"strategist name must stay inside the expanded account menu");
 await accountButton.click();
 await strategist.getByRole("button",{name:"Sair",exact:true}).waitFor();
 await accountButton.click();
 await strategist.getByRole("button",{name:"Clientes",exact:true}).click();
 await strategist.getByRole("heading",{name:"Cadastro de clientes"}).waitFor();
 const clientDirectoryRow=strategist.locator(".rv-ui2-directory-row").filter({hasText:"Synthetic Portal Client"});
  await clientDirectoryRow.waitFor({state:"visible",timeout:20000});
  await clientDirectoryRow.getByRole("button",{name:"Detalhes",exact:true}).click();
 const details=strategist.getByRole("dialog",{name:"Synthetic Portal Client"});
 await details.waitFor();
 assert.equal(await details.locator('button[aria-label="Fechar detalhes do cliente"]').count(),1,"client modal needs accessible close button");
 const detailsBox=await details.boundingBox();
 assert.ok(detailsBox&&Math.abs(detailsBox.x+detailsBox.width/2-720)<50,"client details must be centered");
 await details.getByRole("button",{name:"Fechar detalhes do cliente"}).click();
 assert.equal(await strategist.getByRole("dialog",{name:"Synthetic Portal Client"}).count(),0);
 console.log("PASS admin client details central modal, close and visible user menu");
 await strategist.getByRole("button",{name:"Onboarding",exact:true}).click();
 const onboardingRow=strategist.getByRole("row").filter({hasText:"Synthetic Portal Client"});
 await onboardingRow.waitFor();
 assert.ok(await onboardingRow.locator("span[aria-hidden=true] > span, span[aria-hidden=true]").count()>0,"onboarding row includes client avatar");
 await onboardingRow.getByRole("button",{name:/Iniciar|Gerenciar/}).click();
 const onboardingModal=strategist.getByRole("dialog",{name:"Gerenciar onboarding"});
 await onboardingModal.waitFor();
 const onboardingBox=await onboardingModal.boundingBox();
 assert.ok(onboardingBox&&Math.abs(onboardingBox.x+onboardingBox.width/2-720)<50,"onboarding management must be centered");
 await onboardingModal.getByRole("button",{name:"Fechar"}).click();
 assert.equal(await strategist.getByRole("dialog",{name:"Gerenciar onboarding"}).count(),0);
 console.log("PASS admin onboarding avatar/action and central modal with close; no checklist mutations");
 // The second client's new task must appear immediately even when urgency sorting would place it on another page.
 await strategist.getByRole("button",{name:"Tarefas",exact:true}).click();
 await strategist.getByRole("heading",{name:"Central de tarefas"}).waitFor();
 await strategist.getByRole("button",{name:"Criar tarefa",exact:true}).click();
 const newTaskDialog=strategist.getByRole("dialog",{name:"Nova tarefa"});
 await newTaskDialog.waitFor();
 await newTaskDialog.getByLabel("Nome da tarefa *").fill("Synthetic Other Client Task");
 await newTaskDialog.getByRole("button",{name:"Projeto da tarefa"}).click();
 await newTaskDialog.getByRole("option",{name:/Synthetic Other Client.*Synthetic Other Project/}).click();
 await newTaskDialog.getByRole("button",{name:"Criar tarefa",exact:true}).click();
 await newTaskDialog.waitFor({state:"hidden"});
 await strategist.getByRole("button",{name:"Synthetic Other Client Task",exact:true}).waitFor({timeout:15000});
 const otherProject=await must(db.from("planning_projects").select("data").eq("id",secondProjectId).single(),"read synthetic other project");
 assert.equal(otherProject.data.executionTimeline.filter(x=>x.title==="Synthetic Other Client Task").length,1,"second client task persisted exactly once");
 console.log("PASS synthetic cross-client task creation, persisted task visible on first filtered page");
 await strategist.getByRole("button",{name:"Ações da tarefa Synthetic Other Client Task"}).click();
 await strategist.getByRole("menuitem",{name:"Arquivar",exact:true}).click();
 await strategist.getByRole("button",{name:"Arquivo",exact:true}).click();
 await strategist.getByRole("button",{name:"Ações da tarefa Synthetic Other Client Task"}).click();
 await strategist.getByRole("menuitem",{name:"Restaurar do Arquivo"}).click();
 await strategist.getByRole("button",{name:"Ativas",exact:true}).click();
 await strategist.getByRole("button",{name:"Synthetic Other Client Task",exact:true}).waitFor();
 console.log("PASS synthetic archive and restore using real local API");
 await strategist.getByRole("button",{name:"Ações da tarefa Synthetic Other Client Task"}).click();
 strategist.once("dialog",dialog=>void dialog.accept());
 await strategist.getByRole("menuitem",{name:"Excluir (Lixeira)"}).click();
 await strategist.getByRole("button",{name:"Lixeira",exact:true}).click();
 await strategist.getByRole("button",{name:"Ações da tarefa Synthetic Other Client Task"}).click();
 await strategist.getByRole("menuitem",{name:"Restaurar da Lixeira"}).click();
 await strategist.getByRole("button",{name:"Ativas",exact:true}).click();
 await strategist.getByRole("button",{name:"Synthetic Other Client Task",exact:true}).waitFor();
 console.log("PASS synthetic reversible trash and restore without permanent deletion");
 // Create a YouTube editorial entry for the second synthetic client and verify the dynamic channel tab.
 await strategist.getByRole("button",{name:"Conteúdo",exact:true}).click();
 await strategist.getByRole("button",{name:/Novo conteúdo/}).click();
 const newEditorial=strategist.getByRole("dialog",{name:"Editor de conteúdo"});
 await newEditorial.waitFor();
 await newEditorial.locator("select").first().selectOption(secondProjectId);
 await newEditorial.getByLabel("Título *").fill("Synthetic Other YouTube Editorial");
 await newEditorial.locator("select").nth(1).selectOption("YouTube");
 const editorialDate=new Date().toISOString().slice(0,7)+"-15";
 await newEditorial.getByLabel("Data de publicação *").fill(editorialDate);
 await newEditorial.getByLabel("Resumo da ideia *").fill("Canal novo e visualização contextual do calendário.");
 await newEditorial.getByLabel("Objetivo do conteúdo *").fill("Testar a persistência isolada de conteúdo editorial.");
 await newEditorial.getByRole("button",{name:"Salvar conteúdo"}).click();
 await newEditorial.waitFor({state:"hidden"});
 await strategist.getByRole("button",{name:"YouTube",exact:true}).waitFor({timeout:15000});
 await strategist.getByRole("button",{name:/^Synthetic Other YouTube Editorial ·/}).click();
 const editorialDetails=strategist.getByRole("dialog",{name:"Detalhes do conteúdo"});
 await editorialDetails.waitFor();
 await editorialDetails.getByRole("heading",{name:"Conversa e atividade"}).waitFor();
 const otherEditorial=await must(db.from("planning_projects").select("data").eq("id",secondProjectId).single(),"read synthetic editorial");
 assert.equal(otherEditorial.data.editorialCalendar.filter(x=>x.title==="Synthetic Other YouTube Editorial"&&x.channel==="YouTube").length,1,"YouTube entry persisted for second client only");
 await editorialDetails.getByRole("button",{name:"Fechar"}).click();
 console.log("PASS synthetic editorial creation, new channel tab, centered detail and cross-client isolation");
 await strategist.close();
 console.log("PASS synthetic client and strategist portal logins, private projection and all seven widths");
} finally {await browser.close();}
