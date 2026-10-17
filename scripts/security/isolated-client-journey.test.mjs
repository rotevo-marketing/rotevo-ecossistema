import test from "node:test";
import assert from "node:assert/strict";
import {validExecutionDependencies} from "../../src/lib/security/executionDependencyValidation.ts";
import {validEcosystemDocumentTransition} from "../../src/lib/security/ecosystemDocumentTransitions.ts";
import {projectForClient} from "../../src/lib/security/projectForClient.ts";

const clientId="00000000-0000-4000-8000-000000000101";
const date="2026-10-17T12:00:00.000Z";
const base=(id,title,data)=>({id,client_id:clientId,title,slug:id,description:null,status:"draft",updated_at:date,data});
const firstId="00000000-0000-4000-8000-000000000201";
const secondId="00000000-0000-4000-8000-000000000202";
const task=(id,status="planned",dependencies=[],visibleToClient=false)=>({id,title:"Entrega "+id,status,dependencies,visibleToClient,dueDate:"2026-11-10"});
const agenda=(relatedTaskId)=>({id:"reuniao-1",title:"Reunião de acompanhamento",kind:"meeting",status:"planned",date:"2026-11-02",time:"10:30",relatedTaskId});
const onboarding=[
 {id:"onb-1",title:"Confirmar dados",done:true,visibleToClient:true,link:"https://example.test/onboarding"},
 {id:"onb-2",title:"Verificar informações internas",done:false,visibleToClient:false}
];

test("synthetic client has two independent projects with different shared data",()=>{
 const first=base(firstId,"Planejamento A",{
  executionTimeline:[task("t1","completed",[],true),task("t2","planned",["t1"],false)],
  operationalAgenda:[agenda("t1")],onboardingChecklist:onboarding,
  editorialCalendar:[{id:"ed-1",title:"Conteúdo público",visibleToClient:true,status:"awaiting_client",version:"01",caption:"Texto teste"},
    {id:"ed-2",title:"Pauta interna",visibleToClient:false,caption:"SEGREDO_TESTE"}],
  internalNotes:"SEGREDO_PROJETO_A"
 });
 const second=base(secondId,"Planejamento B",{
  executionTimeline:[task("t1","planned",[],true)],
  operationalAgenda:[agenda("t1")],
  onboardingChecklist:[{id:"onb-3",title:"Check separado",done:false,visibleToClient:true}],
  internalNotes:"SEGREDO_PROJETO_B"
 });
 assert.equal(validExecutionDependencies(first.data),true);
 assert.equal(validExecutionDependencies(second.data),true);
 const visibleA=projectForClient(first),visibleB=projectForClient(second);
 assert.equal(visibleA.id,firstId);
 assert.equal(visibleB.id,secondId);
 assert.deepEqual(visibleA.data.executionTimeline.map(x=>x.id),["t1"]);
 assert.deepEqual(visibleB.data.executionTimeline.map(x=>x.id),["t1"]);
 assert.equal(visibleA.data.onboardingChecklist.length,1);
 assert.equal(visibleB.data.onboardingChecklist.length,1);
 assert.equal(visibleA.data.editorialCalendar.length,1);
 assert.equal(visibleB.data.editorialCalendar.length,0);
 assert.equal(visibleA.data.onboardingChecklist[0].done,true);
 assert.equal(JSON.stringify([visibleA,visibleB]).includes("SEGREDO"),false);
 assert.equal("operationalAgenda" in visibleA.data,false);
 assert.equal("client_id" in visibleA,false);
});

test("onboarding completed state and client sharing are independent",()=>{
 const row=base(firstId,"Onboarding",{onboardingChecklist:onboarding});
 const publicView=projectForClient(row);
 assert.equal(publicView.data.onboardingChecklist[0].title,"Confirmar dados");
 assert.equal(publicView.data.onboardingChecklist[0].done,true);
 assert.equal(publicView.data.onboardingChecklist[0].link,"https://example.test/onboarding");
 assert.equal(publicView.data.onboardingChecklist.length,1);
 assert.equal(JSON.stringify(publicView).includes("Verificar informações internas"),false);
});

test("execution graph blocks premature completion, cycles and cross-project agenda links",()=>{
 const pending={executionTimeline:[task("t1"),task("t2","completed",["t1"])]};
 assert.equal(validExecutionDependencies(pending),false);
 const completed={executionTimeline:[task("t1","completed"),task("t2","completed",["t1"])]};
 assert.equal(validExecutionDependencies(completed),true);
 assert.equal(validExecutionDependencies({executionTimeline:[task("t1","planned",["t2"]),task("t2","planned",["t1"])]}),false);
 assert.equal(validExecutionDependencies({executionTimeline:[task("t1")],operationalAgenda:[agenda("t2")]}),false);
 assert.equal(validExecutionDependencies({executionTimeline:[task("t1")],operationalAgenda:[agenda("t1")]}),true);
 assert.equal(validExecutionDependencies({executionTimeline:[task("t1")],operationalAgenda:[{...agenda("t1"),date:"2026-02-30"}]}),false);
});

test("document changes cannot skip approval or rewrite published release",()=>{
 const wrap=(doc)=>({ecosystem2027:{version:1,selectedDocumentCodes:["07.05"],presentedDocumentCodes:["07.05"],documents:{"07.05":doc}}});
 const draft={content:"Versão inicial",updatedAt:date,reviewStatus:"draft"};
 const review={...draft,reviewStatus:"review"};
 const approved={...review,reviewStatus:"approved"};
 const release={...approved,publishedContent:"Versão inicial",publishedAt:"2026-10-17T13:00:00.000Z"};
 assert.equal(validEcosystemDocumentTransition(wrap(draft),wrap(review)),true);
 assert.equal(validEcosystemDocumentTransition(wrap(review),wrap(approved)),true);
 assert.equal(validEcosystemDocumentTransition(wrap(approved),wrap(release)),true);
 assert.equal(validEcosystemDocumentTransition(wrap(draft),wrap(approved)),false);
 assert.equal(validEcosystemDocumentTransition(wrap(release),wrap({...release,content:"Novo texto",reviewStatus:"draft",updatedAt:"2026-10-18T12:00:00.000Z"})),true);
 assert.equal(validEcosystemDocumentTransition(wrap(release),wrap({...release,publishedContent:"Texto não aprovado"})),false);
});
