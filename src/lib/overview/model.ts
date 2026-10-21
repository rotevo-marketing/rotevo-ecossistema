import type {ExecutionItem} from "../../Components/cliente/ProjectTimeline";
import type {EditorialItem} from "../../Components/cliente/EditorialCalendar";
import type {AgendaItem} from "../../Components/admin/OperationalAgenda";

export type OperationsProject={
 id:string;title:string;slug:string;status:string;updated_at:string;
 data:{executionTimeline?:ExecutionItem[];editorialCalendar?:EditorialItem[];operationalAgenda?:AgendaItem[];ecosystem2027?:{selectedDocumentCodes?:string[];documents?:Record<string,{content?:string;reviewStatus?:string}>}}|null;
 clients:{id:string;name:string;slug:string}|{id:string;name:string;slug:string}[]|null;
};
export type OverviewDecision={id:string;project_id:string;content_id:string;content_version:string;decision:"approved"|"changes_requested";decided_at:string};
export type OverviewSource="loading"|"ready"|"unavailable"|"forbidden";
export type OverviewItem={key:string;kind:"task"|"editorial"|"document"|"meeting";title:string;project:OperationsProject;owner:string;due?:string;time?:string;priority:1|2|3;reasons:string[];personal:boolean;taskPriority:number};
export const overviewClient=(p:OperationsProject)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
export function overviewProjectHref(p:OperationsProject){
 const slug=overviewClient(p)?.slug;
 return slug?`/admin/planejamentos/${encodeURIComponent(slug)}?projectId=${encodeURIComponent(p.id)}`:null;
}
export function overviewToday(now=new Date()){
 return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
export function overviewDate(value?:string){return value?value.split("-").reverse().join("/"):"Sem prazo registrado";}
export function validOverviewDate(value:unknown):value is string{
 if(typeof value!=="string"||!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value))return false;
 const date=new Date(value+"T12:00:00Z");return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
const distance=(date:string,today:string)=>Math.round((Date.parse(date+"T12:00:00Z")-Date.parse(today+"T12:00:00Z"))/86400000);
const open=(task:ExecutionItem)=>task.status!=="completed"&&task.status!=="cancelled";
const unique=<T extends {id:string;title:string}>(rows:T[])=>[...new Map(rows.filter(x=>x&&typeof x.id==="string"&&x.id&&typeof x.title==="string").map(x=>[x.id,x])).values()];
export function editorialCandidates(projects:OperationsProject[]){
 return projects.filter(p=>p.status!=="archived"&&p.status!=="cancelled"&&p.status!=="closed").flatMap(project=>unique(Array.isArray(project.data?.editorialCalendar)?project.data.editorialCalendar:[]).filter(x=>x.status==="awaiting_client"&&x.visibleToClient===true).map(item=>({project,item})));
}
export function buildOperationsOverview(projects:OperationsProject[],userId:string|null,decisions:OverviewDecision[],decisionSource:OverviewSource,today=overviewToday(),now=new Date()){
 const usable=[...new Map(projects.map(p=>[p.id,p])).values()].filter(p=>!["archived","closed","cancelled"].includes(p.status));
 const attention:OverviewItem[]=[],routine:OverviewItem[]=[],meetings:OverviewItem[]=[];
 let overdueTasks=0,pendingDecisions=0,unlinkedOwners=0,invalidDates=0;
 const executionUnavailable=usable.some(p=>p.data==null||(p.data?.executionTimeline!==undefined&&!Array.isArray(p.data.executionTimeline)));
 const agendaUnavailable=usable.some(p=>p.data==null||(p.data?.operationalAgenda!==undefined&&!Array.isArray(p.data.operationalAgenda)));
 const editorialUnavailable=usable.some(p=>p.data==null||(p.data?.editorialCalendar!==undefined&&!Array.isArray(p.data.editorialCalendar)));
 const currentTime=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(now);
 for(const project of usable){
  const tasks=unique(Array.isArray(project.data?.executionTimeline)?project.data.executionTimeline:[]);
  for(const task of tasks.filter(open)){
   const due=validOverviewDate(task.dueDate)?task.dueDate:undefined;if(task.dueDate&&!due)invalidDates++;
   const overdue=!!due&&due<today,blocked=task.status==="blocked",remaining=[...new Set(task.dependencies??[])].filter(id=>tasks.find(x=>x.id===id)?.status!=="completed");
   const personal=!!userId&&task.ownerUserId===userId;
   if(task.owner?.trim()&&!task.ownerUserId)unlinkedOwners++;
   const reasons:string[]=[];if(overdue){overdueTasks++;reasons.push("Prazo vencido");}if(blocked)reasons.push("Entrega marcada como bloqueada");
   if(remaining.length)reasons.push(`${remaining.length} pré-requisito(s) ainda não concluído(s)`);
   if(!overdue&&due&&distance(due,today)<=2)reasons.push(due===today?"Vence hoje":"Prazo nos próximos dois dias");
   if(task.priority==="urgent")reasons.push("Prioridade urgente registrada");
   const priority:1|2|3=overdue||blocked?1:due&&distance(due,today)<=2||task.priority==="urgent"?2:3;
   const item:OverviewItem={key:JSON.stringify([project.id,"task",task.id]),kind:"task",title:task.title,project,owner:task.owner?.trim()||(personal?"Você":"Responsável não informado"),due,priority,reasons,personal,taskPriority:({urgent:0,high:1,normal:2,low:3})[task.priority??"normal"]};
   if(reasons.length)attention.push(item);if(personal)routine.push(item);
  }
  const selected=[...new Set([...(Array.isArray(project.data?.ecosystem2027?.selectedDocumentCodes)?project.data.ecosystem2027.selectedDocumentCodes:[]),...Object.keys(project.data?.ecosystem2027?.documents??{}).filter(code=>/^00\.0[1-7]$/.test(code))])];
  for(const code of selected){
   if(!/^\d{2}\.\d{2}$/.test(code))continue;const doc=project.data?.ecosystem2027?.documents?.[code];
   if(doc?.reviewStatus!=="review"||typeof doc.content!=="string"||!doc.content.trim())continue;
   pendingDecisions++;attention.push({key:JSON.stringify([project.id,"document",code]),kind:"document",title:`Revisar documento ${code}`,project,owner:"Revisor não vinculado",priority:3,reasons:["Documento estratégico em revisão formal"],personal:false,taskPriority:2});
  }
  const appointments=unique(Array.isArray(project.data?.operationalAgenda)?project.data.operationalAgenda:[]);
  for(const row of appointments.filter(x=>x.status==="planned")){
   if(!validOverviewDate(row.date)){invalidDates++;continue;}
   const time=row.time&&/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)?row.time:undefined;
   const past=row.date<today||(row.date===today&&!!time&&time<currentTime);
   const linked=tasks.find(x=>x.id===row.relatedTaskId);const personal=!!userId&&linked?.ownerUserId===userId;
   const item:OverviewItem={key:JSON.stringify([project.id,"meeting",row.id]),kind:"meeting",title:row.title,project,owner:row.owner?.trim()||"Responsável não informado",due:row.date,time,priority:past?1:2,reasons:past?["Compromisso vencido, ainda marcado como agendado"]:[({meeting:"Reunião",followup:"Acompanhamento",checkpoint:"Marco de controle"})[row.kind]??"Compromisso"],personal,taskPriority:2};
   if(past)attention.push(item);else if(distance(row.date,today)<=7)meetings.push(item);
   if(personal&&(past||distance(row.date,today)<=7))routine.push(item);
  }
 }
 const latest=new Map<string,OverviewDecision>();
 for(const row of decisions){const key=JSON.stringify([row.project_id,row.content_id,row.content_version]);const previous=latest.get(key);if(!previous||row.decided_at>previous.decided_at)latest.set(key,row);}
 const candidates=editorialCandidates(usable);
 if(decisionSource==="ready")for(const {project,item} of candidates){
  const decision=latest.get(JSON.stringify([project.id,item.id,item.version??""]));if(decision){if(decision.decision==="changes_requested"){const due=validOverviewDate(item.publishDate)?item.publishDate:undefined;attention.push({key:JSON.stringify([project.id,"editorial",item.id]),kind:"editorial",title:item.title,project,owner:"Ajuste pela Rotevo",due,priority:due&&due<today?1:2,reasons:["Cliente solicitou ajustes na versão "+decision.content_version],personal:false,taskPriority:2});}continue;}
  const due=validOverviewDate(item.publishDate)?item.publishDate:undefined;if(item.publishDate&&!due)invalidDates++;
  const priority:1|2|3=due&&due<today?1:due&&distance(due,today)<=2?2:3;
  pendingDecisions++;attention.push({key:JSON.stringify([project.id,"editorial",item.id]),kind:"editorial",title:item.title,project,owner:"Decisão do cliente",due,priority,reasons:["Aprovação solicitada; versão sem decisão registrada",...(due&&due<today?["Data prevista de publicação vencida"]:[])],personal:false,taskPriority:2});
 }
 attention.sort((a,b)=>a.priority-b.priority||(a.due??"9999").localeCompare(b.due??"9999")||a.key.localeCompare(b.key));
 const urgency=(x:OverviewItem)=>x.due&&x.due<today?0:x.due===today?1:2;
 routine.sort((a,b)=>urgency(a)-urgency(b)||(a.due??"9999").localeCompare(b.due??"9999")||a.taskPriority-b.taskPriority||(a.time??"23:59").localeCompare(b.time??"23:59")||a.key.localeCompare(b.key));
 meetings.sort((a,b)=>(a.due+"T"+(a.time??"23:59")).localeCompare(b.due+"T"+(b.time??"23:59"))) ;
 const projectAttention=usable.map(project=>({project,items:attention.filter(x=>x.project.id===project.id)})).filter(x=>x.items.length).sort((a,b)=>a.items[0].priority-b.items[0].priority||b.items.length-a.items.length);
 return {activeProjects:usable.filter(p=>p.status==="draft"||p.status==="in_progress").length,overdueTasks:executionUnavailable?null:overdueTasks,pendingDecisions:editorialUnavailable||(candidates.length>0&&decisionSource!=="ready")?null:pendingDecisions,attention,routine,meetings,projectAttention,unlinkedOwners,invalidDates,executionUnavailable,agendaUnavailable,editorialUnavailable,hasEditorialCandidates:candidates.length>0};
}
