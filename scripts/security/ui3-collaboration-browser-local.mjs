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
await must(service.from("client_workspaces").insert({client_id:clientId,data:{modules:["execution","content"],folders:[],contracts:[]}}),"workspace");
await must(service.from("planning_projects").insert({id:projectId,client_id:clientId,title:"Synthetic Shared Task",slug:"collab-ui-"+suffix,status:"draft",
 data:{executionTimeline:[{id:"browser-task",title:"Tarefa acessível",visibleToClient:true,status:"in_progress",dueDate:"2026-11-20"}],
 editorialCalendar:[]}}),"project");
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
 await menu.getByRole("button",{name:"Tarefas e entregas"}).click();
 await page.getByText("Tarefa acessível").waitFor({timeout:20000});
 await page.getByText("Conversa sobre esta tarefa").click();
 const section=page.getByRole("region",{name:"Conversa sobre este item"});
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
 console.log("ACCESSIBILITY collaboration",JSON.stringify(scan.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.map(n=>n.target)}))));
 assert.equal(serious.length,0,"Collaboration critical/serious WCAG violations");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert.ok(overflow<=1,"Collaboration mobile horizontal overflow: "+overflow);
 await page.screenshot({path:process.env.RUNNER_TEMP+"/ui3-synthetic-collaboration-390.png",fullPage:true});
 console.log("PASS browser collaboration: client login, task access, message send/reload, focus, axe WCAG 2.1 A/AA, mobile 390px");
}finally{await browser.close();}
