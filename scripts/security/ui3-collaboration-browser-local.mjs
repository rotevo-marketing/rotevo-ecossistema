// Accessible, authenticated collaboration smoke in disposable local Supabase and Next.js only.
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {chromium} from "playwright";
import axe from "axe-core";
const api=process.env.API_URL,app=process.env.ROTEVO_LOCAL_APP_URL;
assert.equal(process.env.ROTEVO_LOCAL_API_TESTS,"YES_LOCAL_ONLY");
assert.equal(api,"http://127.0.0.1:54321");
assert.equal(app,"http://127.0.0.1:3000/");
assert.equal(process.env.ROTEVO_COLLABORATION_ENABLED,"true");
assert.equal(process.env.NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED,"true");
const service=createClient(api,process.env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const must=async(p,context)=>{const r=await p;assert.equal(r.error,null,context+": "+(r.error?.message??""));return r.data;};
const suffix=randomUUID(),clientId=randomUUID(),projectId=randomUUID();
const email="collab-ui-"+suffix+"@synthetic.invalid",password="SyntheticUIOnly!"+suffix;
const client=await must(service.from("clients").insert({id:clientId,name:"Synthetic Conversation",slug:"collab-ui-"+suffix}),"client");
const user=await must(service.auth.admin.createUser({email,password,email_confirm:true}),"create user");
await must(service.from("profiles").insert({id:user.user.id,role:"client",client_id:clientId,email,full_name:"Synthetic Client"}),"profile");
await must(service.from("client_users").insert({client_id:clientId,user_id:user.user.id}),"client membership");
const ownerEmail="editorial-owner-"+suffix+"@synthetic.invalid";
const owner=await must(service.auth.admin.createUser({email:ownerEmail,password,email_confirm:true}),"strategist identity");
await must(service.from("profiles").insert({id:owner.user.id,role:"strategist",email:ownerEmail,full_name:"Synthetic Strategist"}),"strategist profile");
await must(service.from("team_members").insert({user_id:owner.user.id,display_name:"Synthetic Strategist",role:"admin",active:true}),"strategist team membership");
await must(service.from("client_workspaces").insert({client_id:clientId,data:{modules:["execution","content"],folders:[],contracts:[]}}),"workspace");
await must(service.from("planning_projects").insert({id:projectId,client_id:clientId,title:"Synthetic Shared Task",slug:"collab-ui-"+suffix,status:"draft",
 data:{executionTimeline:[{id:"browser-task",title:"Tarefa acessível",visibleToClient:true,status:"in_progress",dueDate:"2026-11-20"}],
 editorialCalendar:[{id:"browser-content",title:"Conteúdo acessível",channel:"YouTube",format:"Vídeo",status:"idea",ideaSummary:"Resumo sintético",objective:"Objetivo sintético",caption:"Primeira linha\n\nTerceira linha",briefUrl:"https://example.com/brief",driveUrl:"https://drive.google.com/file/d/synthetic/view",references:[{url:"https://example.net/inspiration",note:"Orientação sintética"}],publishDate:new Date().toISOString().slice(0,7)+"-15",version:"02",visibleToClient:true}]}}),"project");
const ownerAuth=createClient(api,process.env.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {session}=await must(ownerAuth.auth.signInWithPassword({email:ownerEmail,password}),"strategist login");
async function workflow(path,body){
 const response=await fetch(new URL(path,app),{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({...body,projectId,phase:"idea",expectedAuthorUserId:owner.user.id})});
 assert.equal(response.status,200,await response.text());
}
await workflow("/api/workflow/editorial/designate-approver",{approverUserId:user.user.id,reason:"Aprovador de teste sintético"});
await workflow("/api/workflow/editorial/request",{contentId:"browser-content",contentVersion:"02"});
const initialEditorial=await must(service.from("planning_projects").select("data").eq("id",projectId).single(),"stage before plain message");
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},locale:"pt-BR"});
 await page.goto(new URL("/",app).href,{waitUntil:"networkidle"});
 await page.getByLabel("E-mail").fill(email);
 await page.getByLabel("Senha",{exact:true}).fill(password);
 await page.getByRole("button",{name:"Acessar Ecossistema"}).click();
 await page.waitForURL("**/cliente",{timeout:25000});
 // Use the actual portal navigation rather than mounting a synthetic component.
 await page.getByRole("button",{name:"Menu",exact:true}).click();
 const menu=page.getByRole("navigation",{name:"Navegação do portal"});
 await menu.getByRole("button",{name:"Tarefas",exact:true}).click();
 await page.getByRole("button",{name:"Tarefa acessível",exact:true}).click({timeout:20000});
 const detail=page.getByRole("dialog",{name:"Detalhes da tarefa Tarefa acessível",exact:true});
 const section=detail.getByRole("region",{name:"Conversa sobre este item"});
 await section.getByRole("heading",{name:"Conversa sobre este item"}).waitFor();
 const input=section.getByRole("textbox",{name:"Nova mensagem"});
 await input.fill("Mensagem de teste acessível");
 await section.getByRole("button",{name:"Enviar mensagem"}).click();
 await section.getByText("Mensagem de teste acessível").waitFor({timeout:12000});
 assert.equal(await section.getByText("Mensagem de teste acessível").count(),1);
 await page.waitForFunction(() => Array.from(document.querySelectorAll("textarea")).some(el => el.value === ""),{timeout:10000});
 assert.equal(await input.inputValue(),"");
 await input.click();
 await page.keyboard.insertText("Teste de teclado");
 await page.waitForFunction(() => Array.from(document.querySelectorAll("textarea")).some(el => el.value === "Teste de teclado"));
 assert.equal(await input.inputValue(),"Teste de teclado","Input must accept real keyboard entry");
 await input.fill("");
 await page.addScriptTag({content:axe.source});
 const scan=await page.evaluate(async()=>await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));
 const serious=scan.violations.filter(x=>x.impact==="serious"||x.impact==="critical");
 console.log("ACCESSIBILITY collaboration",JSON.stringify(scan.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary}))}))));
 assert.equal(serious.length,0,"Collaboration critical/serious WCAG violations");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert.ok(overflow<=1,"Collaboration mobile horizontal overflow: "+overflow);
 await page.screenshot({path:process.env.RUNNER_TEMP+"/ui3-synthetic-collaboration-390.png",fullPage:true});
 console.log("PASS browser collaboration: client login, task access, message send/reload, focus, axe WCAG 2.1 A/AA, mobile 390px");
 await detail.getByRole("button",{name:"Fechar",exact:true}).click();
 await page.getByRole("button",{name:"Menu",exact:true}).click();
 await menu.getByRole("button",{name:"Conteúdo",exact:true}).click();
 // Client content automatically selects compact list at 390px; legacy view toggle is hidden.\n assert.equal(await page.getByRole("group",{name:"Visualização de conteúdos"}).count(),0);
 await page.getByRole("button",{name:"Conteúdo acessível",exact:true}).click();
 const editorial=page.getByRole("dialog");
 const editorialThread=editorial.getByRole("region",{name:"Conversa sobre este item"});
 await editorial.getByRole("heading",{name:"Solicitar ajustes",exact:true}).waitFor();
 assert.equal(await editorial.getByRole("textbox").count(),1);
 const badges=editorial.getByRole("list",{name:"Canal, formato e versão"});
 assert.deepEqual(await badges.getByRole("listitem").allTextContents(),["YouTube","Vídeo","Versão 02"]);
 const colors=await badges.getByRole("listitem").evaluateAll(items=>items.map(item=>getComputedStyle(item).backgroundColor));
 assert.equal(new Set(colors).size,3);
 assert.ok(colors.every(color=>color!=="rgba(0, 0, 0, 0)"));
 const links=editorial.getByRole("region",{name:"Materiais e referências"});
 assert.deepEqual(await links.getByRole("link").evaluateAll(items=>items.map(item=>item.href)),["https://example.com/brief","https://drive.google.com/file/d/synthetic/view","https://example.net/inspiration"]);
 await links.getByText("Orientação sintética",{exact:true}).waitFor();
 await editorialThread.getByRole("button",{name:"Aprovar ideia"}).waitFor();
 await editorialThread.getByRole("textbox",{name:"Nova mensagem"}).fill("Comentário editorial sintético");
 await editorialThread.getByRole("button",{name:"Enviar mensagem"}).click();
 await editorialThread.getByText("Comentário editorial sintético",{exact:true}).waitFor();
 await editorialThread.getByText(/Versão 02/).waitFor();
 assert.equal(await editorialThread.getByText("Mensagem de teste acessível",{exact:true}).count(),0);
 const ordinary=await must(service.from("planning_projects").select("data").eq("id",projectId).single(),"status after plain message");
 assert.equal(ordinary.data.editorialCalendar[0].status,initialEditorial.data.editorialCalendar[0].status);
 const decisionsBefore=await must(service.from("editorial_idea_approvals").select("decision").eq("project_id",projectId).eq("content_id","browser-content"),"decisions after plain message");
 assert.deepEqual(decisionsBefore,[]);
 assert.equal(await editorialThread.getByRole("button",{name:"Solicitar ajuste",exact:true}).count(),0);
 for(const title of ["Resumo da ideia","Direcionamento estratégico","Legenda"]){
  const block=editorial.getByRole("region",{name:title,exact:true});
  await block.getByRole("heading",{name:title,exact:true}).waitFor();
  const style=await block.evaluate(e=>{
   const style=getComputedStyle(e.lastElementChild);
   return {heading:e.firstElementChild.tagName,surface:style.backgroundColor,whiteSpace:style.whiteSpace};
  });
  assert.deepEqual(style,{heading:"H4",surface:"rgb(246, 247, 251)",whiteSpace:"pre-wrap"});
 }
 const result=page.waitForResponse(response=>response.url().endsWith("/api/workflow/editorial/decision")&&response.request().method()==="POST");
 await editorialThread.getByRole("button",{name:"Aprovar ideia",exact:true}).click();
 assert.equal((await result).status(),200);
 await editorialThread.getByText("Aprovação registrada.",{exact:true}).waitFor();
 console.log("PASS client detail: light text boxes, single composer, hidden adjustment control, plain message and confirmed idea approval");
}finally{await browser.close();}
