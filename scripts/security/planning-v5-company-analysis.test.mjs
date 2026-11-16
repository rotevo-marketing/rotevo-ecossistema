import test from "node:test";
import assert from "node:assert/strict";
import {EMPTY_COMPANY_ANALYSIS,parseCompanyAnalysis,validCompanyAnalysis,publicCompanyAnalysis} from "../../src/lib/planning/companyAnalysis.ts";
import {projectForPresentation} from "../../src/lib/security/projectForPresentation.ts";

const identity={...EMPTY_COMPANY_ANALYSIS.identity,displayName:"Empresa Sintética",mainActivity:"Serviços de treinamento",founded:"2020",traits:[{id:"trait-1",title:"Atendimento online",description:"Entrega realizada à distância.",evidence:"Evidence strictly internal"}]};
const sample={...structuredClone(EMPTY_COMPANY_ANALYSIS),identity,history:{milestones:[{id:"m-1",title:"Início das atividades",description:"Atuação individual.",period:"2020"}],reading:"Trajetória baseada em informação declarada."}};

test("02.01 valida estrutura completa e preserva registros repetíveis",()=>{
 assert.equal(validCompanyAnalysis(sample),true);
 assert.equal(parseCompanyAnalysis(sample).identity.displayName,"Empresa Sintética");
 assert.equal(parseCompanyAnalysis(sample).history.milestones[0].period,"2020");
 assert.equal(validCompanyAnalysis({...sample,history:{milestones:[]}}),false);
 assert.equal(validCompanyAnalysis({...sample,identity:{...sample.identity,traits:Array.from({length:101},(_,i)=>({id:String(i),title:"X",description:"Y"}))}}),false);
});
test("02.01 não publica evidências internas",()=>{
 const visible=publicCompanyAnalysis(sample);
 assert.equal(visible?.identity.traits[0].title,"Atendimento online");
 assert.equal(JSON.stringify(visible).includes("Evidence strictly internal"),false);
});
test("02.01 separa rascunho, página disponibilizada e publicação do projeto",()=>{
 const base={id:"synthetic",client_id:"client",title:"Sintético",slug:"synthetic",description:null,clients:null,status:"draft",
 data:{planningStructureVersion:5,companyAnalysis0201:sample,portalModules:["planning"]}};
 assert.equal(projectForPresentation(base,false,["planning"]),null);
 const publishedProject={...base,status:"published"};
 assert.equal(projectForPresentation(publishedProject,false,["planning"]).data.companyAnalysis0201,null);
 const publishedPage={...publishedProject,data:{...base.data,publishedCompanyAnalysis0201:publicCompanyAnalysis(sample)}};
 const p=projectForPresentation(publishedPage,false,["planning"]);
 assert.equal(p.data.companyAnalysis0201.identity.displayName,"Empresa Sintética");
 assert.equal(JSON.stringify(p).includes("Evidence strictly internal"),false);
 const hidden={...publishedPage,data:{...publishedPage.data,portalModules:["content"]}};
 assert.equal(projectForPresentation(hidden,false,["planning"]),null);
});
