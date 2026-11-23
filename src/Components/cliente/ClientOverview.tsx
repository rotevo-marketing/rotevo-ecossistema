"use client";
import {useEffect,useState} from "react";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {supabase} from "@/lib/supabase";
import {todayInBrazil} from "@/lib/finance/model";
import type {ClientWorkspace,PortalModule} from "@/lib/operations/model";
import {loadOverviewDecisions} from "@/lib/overview/approvals";
import {editorialCandidates,type ApprovalCenterRow,type OperationsProject,type OverviewDecision} from "@/lib/overview/model";
import {usePortalRefresh} from "@/hooks/usePortalRefresh";
import {ApprovalTaskCenter,DailyClientTaskCenters} from "./ProjectTimeline";
import ClientMeetings from "./ClientMeetings";

type Project=Pick<OperationsProject,"id"|"title"|"status"|"updated_at"|"data">&{clientAvatarUrl?:string|null};

export default function ClientOverview({projects,workspace,onNavigate,clientName,personName,assignmentUserId}:{projects:Project[];workspace:ClientWorkspace;clientName?:string;personName?:string;assignmentUserId?:string;onNavigate:(module:PortalModule,projectId?:string,contentId?:string)=>void}){
 const allowed=(module:PortalModule)=>workspace.modules.includes(module);
 const contentAllowed=allowed("content");
 const [revision,setRevision]=useState(0);
 usePortalRefresh(()=>setRevision(value=>value+1),contentAllowed);
 const decisionKey=JSON.stringify([projects.map(p=>[p.id,p.updated_at]),revision,contentAllowed]);
 const [result,setResult]=useState<{key:string;rows:OverviewDecision[];failed:boolean}|null>(null);

 useEffect(()=>{
  if(!contentAllowed)return;
  let active=true;
  void loadOverviewDecisions(supabase,projects)
   .then(rows=>{if(active)setResult({key:decisionKey,rows,failed:false});})
   .catch(()=>{if(active)setResult({key:decisionKey,rows:[],failed:true});});
  return()=>{active=false;};
 },[decisionKey,contentAllowed,projects]);

 const approvalsLoading=contentAllowed&&result?.key!==decisionKey;
 const approvalsFailed=contentAllowed&&result?.key===decisionKey&&result.failed;
 const approvals:ApprovalCenterRow[]=result?.key===decisionKey&&!result.failed?editorialCandidates(projects).flatMap(({project,item})=>{
  const phase=item.status==="idea_pending"?"idea":"final";
  if(result.rows.some(row=>row.project_id===project.id&&row.content_id===item.id&&row.content_version===(item.version??"")&&row.phase===phase))return [];
  return [{id:item.id,projectId:project.id,title:item.title,phase,priority:item.priority,dueDate:item.publishDate,open:()=>onNavigate("content",project.id,item.id)}];
 }):[];

 const hour=Number(new Intl.DateTimeFormat("en-GB",{hour:"2-digit",hourCycle:"h23",timeZone:"America/Sao_Paulo"}).format(new Date()));
 const greeting=hour<12?"Bom dia":hour<18?"Boa tarde":"Boa noite";
 const accountName=(personName??"").trim();
 const personalAccountName=accountName&&!/\b(ltda|consultoria|desenvolvimento|empresa|eireli|financeira)\b/i.test(accountName)&&!/^[A-Z]\.\s/.test(accountName)?accountName.split(/\s+/)[0]:"";
 const greetingName=personalAccountName||(/rubim/i.test(clientName??"")?"Rosane":"");
 const fullDate=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date());
 const datedLabel=fullDate.charAt(0).toUpperCase()+fullDate.slice(1);
 const today=todayInBrazil();
 const card="min-w-0 rounded-xl border border-[#E3E7F0] bg-white p-4";
 return <main aria-label="Visão geral do cliente" className="rv-ui3-client-daily-dashboard space-y-4 pb-6 text-[#323647] sm:space-y-5">
  <header className="py-2">
   <p className="flex items-center gap-2 text-xs font-medium text-[#697386]"><RotevoTablerIcon name="calendar-week" size={15} stroke={1.8}/> {datedLabel}</p>
   <h2 className="mt-2 text-[clamp(23px,2.3vw,32px)] font-semibold tracking-tight text-[#17172A]">{greeting}{greetingName?", "+greetingName:""}.</h2>
   <p className="mt-2 max-w-xl text-[13px] leading-5 text-[#646C80]">Suas entregas, compromissos e decisões em um só lugar.</p>
  </header>
  {allowed("execution")&&<DailyClientTaskCenters day={today} projects={projects} clientName={clientName} assigneeName={personName} assignmentUserId={assignmentUserId} openModule={()=>onNavigate("execution")}/>}
  {contentAllowed&&<section aria-label="Fila de aprovações">
   <ApprovalTaskCenter projects={projects} rows={approvals} clientName={clientName}/>
   {(approvalsLoading||approvalsFailed)&&<p className="mt-2 text-xs" role="status">{approvalsLoading?"Consultando aprovações…":"Não foi possível consultar as aprovações."}</p>}
  </section>}
  {allowed("meetings")&&<section className={card} aria-label="Agenda">
   <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Agenda de hoje</h3><button type="button" onClick={()=>onNavigate("meetings")} className="text-xs font-semibold text-[#6533CF] hover:underline">Ver agenda</button></div>
   <ClientMeetings projects={projects} day={today}/>
  </section>}
 </main>;
}
