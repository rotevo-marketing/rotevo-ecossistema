// Viewport smoke tests of the real Client and Strategist portals on disposable local Supabase.
// No external network, hosted identities or customer data.
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {chromium} from "playwright";
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
await must(db.from("client_workspaces").insert({client_id:clientId,data:{modules:["planning","content","meetings","contract","finance"],contracts:[],folders:[]}}),"workspace");

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
}
try {
 const customer=await session("client",client,"/","/cliente");
 await checkWidths("client",customer);
 assert.equal(await customer.getByText("DO_NOT_EXPOSE_INTERNAL_FIXTURE").count(),0,"private data stays hidden");
 await customer.close();
 const strategist=await session("strategist",admin,"/estrategista/login","/admin");
 await checkWidths("strategist",strategist);
 await strategist.close();
 console.log("PASS synthetic client and strategist portal logins, private projection and all seven widths");
} finally {await browser.close();}
