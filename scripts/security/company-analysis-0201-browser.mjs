import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const origin=process.env.ROTEVO_TEST_ORIGIN||"http://127.0.0.1:3000",out="company-analysis-artifacts";
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],requests=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("request",r=>{if(/\/api\//.test(r.url()))requests.push(r.url());});
await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
page.on("dialog",d=>d.accept());
async function openDocument(){
 await page.getByRole("button",{name:/^02 \| Diagnosticar/}).click();
 await page.getByRole("button",{name:/02\.01.*Análise da Empresa/}).click();
 await page.locator("[data-company-analysis-editor]").waitFor();
}
async function block(title){await page.getByRole("navigation",{name:"Blocos da Análise da Empresa"}).getByRole("button",{name:new RegExp(title)}).click();}
async function save(){await page.getByRole("button",{name:"Salvar rascunho",exact:true}).first().click();await page.getByRole("status").filter({hasText:"Análise da Empresa salva."}).waitFor();}
async function capture(name){await page.screenshot({path:out+"/"+name+".png",fullPage:true});}
async function a11y(label){
 await page.addScriptTag({path:"node_modules/axe-core/axe.min.js"});
 const findings=await page.evaluate(async()=>{const node=document.querySelector("[data-company-analysis-editor]");return node?await window.axe.run(node):{violations:[]};});
 fs.writeFileSync(out+"/axe-"+label+".json",JSON.stringify(findings.violations,null,2));
 assert.deepEqual(findings.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],label);
}
async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),"No horizontal page overflow");}
try{
 await page.goto(origin+"/previa/analise-empresa-0201");await page.locator('[data-preview-ready="true"]').waitFor();
 await page.getByRole("button",{name:"Portal do Cliente",exact:true}).click();assert.match(await page.locator("main").innerText(),/Página ainda não disponibilizada/);
 await page.getByRole("button",{name:"Painel do Estrategista",exact:true}).click();await openDocument();
 const titles=["Caracterização Empresarial","Trajetória e Evolução","Estrutura e Governança","Estágio e Condições Atuais","Síntese da Análise"];
 for(const name of titles)assert.equal(await page.getByRole("heading",{name,exact:true}).count(),1);
 await page.getByRole("textbox",{name:"Nome de apresentação",exact:true}).fill("Empresa sintética revisada");
 const description=page.getByRole("textbox",{name:"Descrição do negócio",exact:true});
 await description.fill("Descrição sintética formatada");await description.press("ControlOrMeta+a");
 const toolbar=page.getByRole("group",{name:"Formatação de Descrição do negócio",exact:true});
 await toolbar.getByRole("button",{name:"Negrito",exact:true}).click();
 await toolbar.getByRole("button",{name:"Itálico",exact:true}).click();
 await toolbar.getByRole("button",{name:"Sublinhado",exact:true}).click();
 assert.equal(await description.locator("strong em u, strong u em, em strong u, u strong em, em u strong, u em strong").count(),1);
 await page.getByRole("button",{name:"Visualizar",exact:true}).click();
 assert.equal(await page.getByRole("heading",{name:"Empresa sintética revisada",exact:true}).count(),1);
 assert.equal(await page.locator("[data-company-analysis-presentation] strong").filter({hasText:"Descrição sintética formatada"}).count(),1);
 await page.getByRole("button",{name:"Editar",exact:true}).click();
 const originalSetter=await page.evaluate(()=>{window.__storageSetter=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error("Falha sintética de armazenamento");};return true;});
 assert.ok(originalSetter);await page.getByRole("button",{name:"Salvar rascunho",exact:true}).first().click();
 await page.getByRole("alert").filter({hasText:"Falha sintética de armazenamento"}).waitFor();
 assert.equal(await page.getByRole("textbox",{name:"Nome de apresentação",exact:true}).inputValue(),"Empresa sintética revisada");
 await page.evaluate(()=>{Storage.prototype.setItem=window.__storageSetter;delete window.__storageSetter;});
 await save();
 await block("Trajetória e Evolução");
 await page.getByRole("button",{name:"Adicionar em Marcos da trajetória",exact:true}).click();
 await page.getByRole("textbox",{name:"Título de Marcos da trajetória 4",exact:true}).fill("Marco de teste");
 await page.getByRole("textbox",{name:"Período de Marcos da trajetória 4",exact:true}).fill("2026–2027");
 await page.getByRole("textbox",{name:"Descrição de Marcos da trajetória 4",exact:true}).fill("Descrição do marco");
 await page.getByRole("button",{name:"Subir Marcos da trajetória 4",exact:true}).click();
 assert.equal(await page.getByRole("textbox",{name:"Título de Marcos da trajetória 3",exact:true}).inputValue(),"Marco de teste");
 await page.getByRole("button",{name:"Descer Marcos da trajetória 3",exact:true}).click();await save();
 await page.reload();await page.locator('[data-preview-ready="true"]').waitFor();await openDocument();
 assert.equal(await page.getByRole("textbox",{name:"Nome de apresentação",exact:true}).inputValue(),"Empresa sintética revisada");
 assert.equal(await page.getByRole("textbox",{name:"Descrição do negócio",exact:true}).locator("strong").count(),1);
 await block("Trajetória e Evolução");assert.equal(await page.getByRole("textbox",{name:"Período de Marcos da trajetória 4",exact:true}).inputValue(),"2026–2027");
 await page.getByRole("button",{name:"Excluir Marcos da trajetória 4",exact:true}).click();assert.equal(await page.getByRole("textbox",{name:"Título de Marcos da trajetória 4",exact:true}).count(),0);await save();
 await page.getByRole("textbox",{name:"Nome de apresentação",exact:true}).fill("");
 assert.equal(await page.getByRole("button",{name:"Disponibilizar página",exact:true}).first().isDisabled(),true);await save();
 assert.equal(await page.getByRole("button",{name:"Disponibilizar página",exact:true}).first().isDisabled(),true);
 await page.getByRole("textbox",{name:"Nome de apresentação",exact:true}).fill("Empresa sintética revisada");await save();
 await page.getByRole("button",{name:"Disponibilizar página",exact:true}).first().click();
 await page.getByRole("status").filter({hasText:/Página disponibilizada/}).waitFor();
 // New draft changes must not replace the customer snapshot.
 await page.getByRole("textbox",{name:"Nome de apresentação",exact:true}).fill("RASCUNHO NÃO DISPONIBILIZADO");await save();
 await page.getByRole("button",{name:"Portal do Cliente",exact:true}).click();
 assert.equal(await page.getByRole("heading",{name:"Empresa sintética revisada",exact:true}).count(),1);
 assert.equal(await page.getByRole("textbox").count(),0);assert.doesNotMatch(await page.locator("main").innerText(),/RASCUNHO NÃO DISPONIBILIZADO|Disponibilizar página|Salvar rascunho|Investigar/);
 await overflow();await a11y("client-light");await capture("portal-cliente-claro-desktop");
 await page.getByRole("button",{name:"Alternar tema",exact:true}).click();await a11y("client-dark");await capture("portal-cliente-escuro-desktop");
 await page.setViewportSize({width:390,height:844});await overflow();await a11y("client-mobile-dark");await capture("portal-cliente-escuro-mobile");
 await page.setViewportSize({width:320,height:740});await overflow();
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole("button",{name:"Painel do Estrategista",exact:true}).click();await openDocument();
 await page.getByRole("textbox",{name:"Nome de apresentação",exact:true}).fill("Empresa sintética revisada");await save();
 // Five accordion sections remain navigable, including via keyboard.
 for(const name of titles)await block(name);
 const summaries=page.locator('[data-company-analysis-editor] > details > summary');assert.equal(await summaries.count(),5);
 await summaries.first().focus();await page.keyboard.press("Enter");assert.equal(await summaries.first().evaluate(n=>n.parentElement.open),false);await page.keyboard.press("Enter");assert.equal(await summaries.first().evaluate(n=>n.parentElement.open),true);
 await a11y("form-dark");await capture("painel-estrategista-escuro-desktop");
 await page.getByRole("button",{name:"Alternar tema",exact:true}).click();await a11y("form-light");await capture("painel-estrategista-claro-desktop");
 await page.setViewportSize({width:768,height:1024});await overflow();
 await page.setViewportSize({width:390,height:844});await overflow();await a11y("form-mobile-light");await capture("painel-estrategista-claro-mobile");
 assert.equal(requests.length,0,"Synthetic review never invokes a database/API");
 assert.deepEqual(errors,[],"No client runtime errors");
 fs.writeFileSync(out+"/result.json",JSON.stringify({status:"passed",checks:["five blocks","rich editor keyboard controls","draft preview before save","add/edit/reorder/delete repeaters","save/reload","publication validation","separate customer snapshot","customer read only","light/dark","320/390/768/1440 responsive","keyboard accordion","axe scans","no API or external requests"],screenshots:6},null,2));
 console.log("02.01 browser checks passed; synthetic storage only; no external data writes.");
}finally{await browser.close();}
