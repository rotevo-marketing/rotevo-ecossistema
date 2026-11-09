"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
import type {ExecutionItem} from "@/Components/cliente/ProjectTimeline";
import type {AgendaItem} from "@/Components/admin/OperationalAgenda";
import type {EditorialItem} from "@/Components/cliente/EditorialCalendar";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {TaskAvatar,TaskDropdown} from "@/Components/admin/TaskGridCells";
import {request} from "@/lib/operations/api";
type Client={id:string;name:string;slug:string;cover_image_url?:string|null};
export type TaskProject={id:string;title:string;updated_at:string;data:{executionTimeline?:ExecutionItem[];operationalAgenda?:AgendaItem[];editorialCalendar?:EditorialItem[]}|null;clients:Client|Client[]|null};
type Status="planned"|"in_progress"|"blocked"|"completed"|"cancelled";
type Priority="low"|"normal"|"high"|"urgent";
const flagColors:Record<Priority,string>={urgent:"#DA3553",high:"#E39429",normal:"#497BD5",low:"#8591A3"};
const validHttps=(value:string)=>{if(!value.trim())return true;try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&value.length<=2048;}catch{return false;}};

const statuses:{id:Status;name:string;chip:string;bar:string}[]=[
 {id:"planned",name:"Pendente",chip:"bg-[#EDF0F6] text-[#4A5368]",bar:"bg-[#A2ACBD]"},
 {id:"in_progress",name:"Em andamento",chip:"bg-[#DCEBFF] text-[#1659A8]",bar:"bg-[#4C9CF0]"},
 {id:"blocked",name:"Aguardando",chip:"bg-[#FFF1D4] text-[#875400]",bar:"bg-[#E9AE39]"},
 {id:"completed",name:"Concluída",chip:"bg-[#DFF6E7] text-[#176F40]",bar:"bg-[#37B36E]"},
 {id:"cancelled",name:"Cancelada",chip:"bg-[#F3E8EA] text-[#995666]",bar:"bg-[#BB7D8C]"}
];
const priorities:{id:Priority;name:string;chip:string}[]=[
 {id:"urgent",name:"Urgente",chip:"bg-[#FFE4E6] text-[#AE183D]"},
 {id:"high",name:"Alta",chip:"bg-[#FFEBD7] text-[#A54B07]"},
 {id:"normal",name:"Normal",chip:"bg-[#EEEAFE] text-[#6738BC]"},
 {id:"low",name:"Baixa",chip:"bg-[#E7F1FF] text-[#356DAA]"}
];
const getClient=(p:TaskProject)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const formatted=(s?:string)=>s&&/^\d{4}-\d{2}-\d{2}$/.test(s)?`${s.slice(8,10)}/${s.slice(5,7)}`:"Sem prazo";
const isOpen=(t:ExecutionItem)=>t.status!=="completed"&&t.status!=="cancelled";
const selectClass="max-w-full rounded-lg border border-[#E1E5EE] bg-white px-3 py-2 text-xs font-medium text-[#31394B] focus:outline-none focus:ring-2 focus:ring-[#6D35F5]";
const buttonClass="inline-flex items-center gap-2 rounded-lg border border-[#E1E5EE] bg-white px-3 py-2 text-xs font-semibold text-[#344056] hover:bg-[#F7F7FC]";
type Item={task:ExecutionItem;project:TaskProject;client:Client|null};
function ProjectPicker({projects,value,onChange,allowAll=false,photos={}}:{projects:TaskProject[];value:string;onChange:(v:string)=>void;allowAll?:boolean;photos?:Record<string,string>}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState("");
 const current=projects.find(p=>p.id===value);
 const selectedName=current?(getClient(current)?.name??"Cliente"):"Todos os projetos";

 const options=projects.filter(p=>((getClient(p)?.name??"Cliente")+" "+p.title).toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
 return <div className="relative min-w-0">
  <button type="button" aria-expanded={open} aria-haspopup="listbox" className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-[#DDE2ED] bg-white px-2.5 py-2 text-left hover:border-[#A58ADB]" onClick={()=>{setOpen(v=>!v);setQuery("");}}>
   <TaskAvatar name={selectedName} src={current?photos[getClient(current)?.id??""]:null} size={32}/>
   <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{selectedName}</span>{current&&<span className="block truncate text-[11px] text-[#718096]">{current.title}</span>}</span><RotevoTablerIcon name={open?"chevron-up":"chevron-down"} size={17}/>
  </button>
  {open&&<div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[245px] max-w-[440px] rounded-xl border border-[#DCE2EB] bg-white p-2 shadow-xl">
   <input autoFocus type="search" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setOpen(false);}} aria-label="Buscar cliente ou projeto" placeholder="Buscar cliente ou projeto..." className="mb-2 w-full rounded-lg border border-[#E0E4EC] p-2 text-sm"/>
   <div role="listbox" aria-label="Selecionar projeto" className="max-h-56 overflow-y-auto">
    {allowAll&&<button type="button" role="option" aria-selected={value==="all"} onClick={()=>{onChange("all");setOpen(false);}} className="w-full cursor-pointer rounded-lg p-2 text-left text-xs hover:bg-[#F3EFFF]">Todos os projetos</button>}
    {options.map(p=>{const name=getClient(p)?.name??"Cliente";return <button type="button" role="option" aria-selected={value===p.id} key={p.id} onClick={()=>{onChange(p.id);setOpen(false);}} className={"flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left hover:bg-[#F3EFFF] "+(value===p.id?"bg-[#F3EFFF]":"")}><TaskAvatar name={name} src={photos[getClient(p)?.id??""]} size={32}/><span className="min-w-0"><span className="block truncate text-xs font-semibold">{name}</span><span className="block truncate text-[11px] text-[#718096]">{p.title}</span></span></button>;})}
    {!options.length&&<p className="p-2 text-xs text-[#718096]">Nenhum projeto encontrado.</p>}
   </div><button type="button" onClick={()=>setOpen(false)} className="mt-2 w-full cursor-pointer rounded-md bg-[#F6F7FB] p-2 text-xs">Fechar</button>
  </div>}
 </div>;
}
export default function CentralTarefas({projects,onChanged,onOpenContent}:{projects:TaskProject[];onChanged:(id:string,data:TaskProject["data"],updatedAt:string)=>void;onOpenContent?:()=>void}){
 const [projectId,setProjectId]=useState("all"),[owner,setOwner]=useState("all"),[status,setStatus]=useState("all"),[priority,setPriority]=useState("all");
 const [section,setSection]=useState<"active"|"completed"|"archived">("active");
 const [completedWindow,setCompletedWindow]=useState<"7"|"30"|"90"|"all">("30");
 const [page,setPage]=useState(1);
 const pageSize=20;
 const [mineOnly,setMineOnly]=useState(false),[currentUserId,setCurrentUserId]=useState<string|null>(null);
 useEffect(()=>{let active=true;void supabase.auth.getUser().then(({data})=>{if(active)setCurrentUserId(data.user?.id??null);});return()=>{active=false};},[]);
 const [deadline,setDeadline]=useState<"all"|"today"|"overdue"|"upcoming">("all");
 const [periodMode,setPeriodMode]=useState<"due"|"completed">("due");
 const [periodMonth,setPeriodMonth]=useState("");
 const [query,setQuery]=useState(""),[showSearch,setShowSearch]=useState(false),[showFilters,setShowFilters]=useState(false);
 const [view,setView]=useState<"list"|"board">("list"),[order,setOrder]=useState<"urgency"|"due"|"priority">("urgency");
 const [working,setWorking]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const blankDraft=()=>({title:"",projectId:"",ownerUserId:"",priority:"normal" as Priority,dueDate:"",description:"",status:"planned" as Status,driveUrl:"",referenceUrl:"",checklist:[] as {id:string;text:string;done:boolean}[],dependencies:[] as string[]});
 const [creating,setCreating]=useState(false),[draft,setDraft]=useState(blankDraft);
 const [newChecklistText,setNewChecklistText]=useState("");
 const [advanced,setAdvanced]=useState(false);
 const [members,setMembers]=useState<{user_id:string;display_name:string;avatar_url?:string|null}[]>([]);
 const [clientPhotos,setClientPhotos]=useState<Record<string,string>>({});

 const [teamReady,setTeamReady]=useState(false);
 const [approvalRows,setApprovalRows]=useState<{project_id:string;content_id:string;content_version:string;decision:string;comment:string|null;decided_at:string}[]>([]);
 const [approvalUnavailable,setApprovalUnavailable]=useState(false);
 const [detailKey,setDetailKey]=useState<string|null>(null);
 const [detailDraft,setDetailDraft]=useState<{title:string;description:string;driveUrl:string;referenceUrl:string;dueDate:string;visibleToClient:boolean;checklist:{id:string;text:string;done:boolean}[];dependencies:string[]}|null>(null);
 const [detailChecklistText,setDetailChecklistText]=useState("");
 useEffect(()=>{let active=true;void (async()=>{
  const {data,error}=await supabase.from("team_members").select("user_id,display_name").eq("active",true).order("display_name");
  if(!active)return;
  setTeamReady(!error);setMembers(error?[]:(data??[]));
  try{
   const response=await request<{members:{user_id:string;display_name:string;avatar_url:string|null}[]}>("/api/team/directory");
   if(active&&response.members?.length){const photos=new Map(response.members.map(m=>[m.user_id,m.avatar_url]));setMembers(prev=>prev.map(m=>({...m,avatar_url:photos.get(m.user_id)??null}))); }
  }catch{/* A equipe continua utilizável sem a consulta opcional de avatares. */}
  try{
   const response=await request<{clients:{id:string;cover_image_url:string|null}[]}>("/api/admin/clients");
   if(!active)return;
   const direct=Object.fromEntries(response.clients.filter(x=>x.cover_image_url?.startsWith("https://")).map(x=>[x.id,x.cover_image_url!]));
   const refs=response.clients.filter(x=>x.cover_image_url?.startsWith("asset://")).map(x=>({id:x.id,asset:x.cover_image_url!.slice(8)}));
   if(refs.length){const resolved=await request<{links:Record<string,string>}>("/api/assets/resolve","POST",{ids:[...new Set(refs.map(x=>x.asset))]});refs.forEach(x=>{if(resolved.links[x.asset])direct[x.id]=resolved.links[x.asset];});}
   if(active)setClientPhotos(direct);
  }catch{/* Permissões limitadas mantêm iniciais como alternativa segura. */}
 })();return()=>{active=false};},[]);
 const tasks=useMemo<Item[]>(()=>projects.flatMap(project=>(Array.isArray(project.data?.executionTimeline)?project.data.executionTimeline:[])
  .filter(task=>task&&typeof task.id==="string"&&typeof task.title==="string")
  .map(task=>({task,project,client:getClient(project)??null}))),[projects]);
 const selected=tasks.find(x=>x.project.id+":"+x.task.id===detailKey);
 const openDetails=(x:Item)=>{setDetailKey(x.project.id+":"+x.task.id);setDetailDraft({title:x.task.title,description:x.task.description??"",driveUrl:x.task.driveUrl??"",referenceUrl:x.task.referenceUrl??"",dueDate:x.task.dueDate??"",visibleToClient:x.task.visibleToClient===true,checklist:x.task.checklist??[],dependencies:x.task.dependencies??[]});setError("");};
 const linkedContent=selected?(selected.project.data?.editorialCalendar??[]).filter(item=>item.relatedTaskId===selected.task.id):[];
 useEffect(()=>{let mounted=true;const pairs=projects.flatMap(p=>(p.data?.editorialCalendar??[]).filter(i=>!!i.relatedTaskId).map(()=>p.id));const ids=[...new Set(pairs)];if(!ids.length){void Promise.resolve().then(()=>{if(mounted){setApprovalRows([]);setApprovalUnavailable(false);}});return()=>{mounted=false;};}void (async()=>{const {data,error}=await supabase.from("editorial_approvals").select("project_id,content_id,content_version,decision,comment,decided_at").in("project_id",ids).order("decided_at",{ascending:false}).limit(150);if(mounted){setApprovalUnavailable(!!error);setApprovalRows(error?[]:(data??[]));}})();return()=>{mounted=false};},[projects]);
 const owners=useMemo(()=>[...new Set(tasks.map(x=>x.task.owner?.trim()).filter((x):x is string=>!!x))].sort(),[tasks]);
 const appointments=useMemo(()=>projects.flatMap(project=>(Array.isArray(project.data?.operationalAgenda)?project.data.operationalAgenda:[])
  .filter(item=>item&&item.status==="planned"&&typeof item.date==="string"&&typeof item.title==="string")
  .map(appointment=>({appointment,project,client:getClient(project)}))),[projects]);
 const todayAppointments=appointments.filter(x=>x.appointment.date===today()).sort((a,b)=>(a.appointment.time??"23:59").localeCompare(b.appointment.time??"23:59"));
 const filtered=useMemo(()=>tasks.filter(({task,project,client})=>
  (section==="archived"?!!task.archivedAt:!task.archivedAt&&(section==="active"?isOpen(task):task.status==="completed"))&&
  (section!=="completed"||completedWindow==="all"||!!task.completedAt&&new Date(task.completedAt).getTime()>=Date.now()-Number(completedWindow)*86400000)&&
  (projectId==="all"||project.id===projectId)&&
  (!mineOnly||(!!currentUserId&&task.ownerUserId===currentUserId))&&
  (owner==="all"||(owner==="unassigned"?!task.owner?.trim():task.owner?.trim()===owner))&&
  (section!=="active"||status==="all"||(task.status??"planned")===status)&&
  (!periodMonth||(periodMode==="due"?task.dueDate?.startsWith(periodMonth):task.status==="completed"&&typeof task.completedAt==="string"&&task.completedAt.slice(0,7)===periodMonth))&&
  (priority==="all"||(task.priority??"normal")===priority)&&
  (deadline==="all"||(deadline==="today"?task.dueDate===today()&&isOpen(task):deadline==="overdue"?!!task.dueDate&&task.dueDate<today()&&isOpen(task):!!task.dueDate&&task.dueDate>today()&&isOpen(task)))&&
  (`${task.title} ${project.title} ${client?.name??""} ${task.owner??""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))
 ).sort((a,b)=>{
  const weights:Record<Priority,number>={urgent:0,high:1,normal:2,low:3};
  const priorityScore=(t:ExecutionItem)=>weights[t.priority??"normal"];
  const dateScore=(t:ExecutionItem)=>t.dueDate??"9999-99-99";
  const openScore=(t:ExecutionItem)=>isOpen(t)?0:1;
  const urgencyScore=(t:ExecutionItem)=>!isOpen(t)?4:t.dueDate&&t.dueDate<today()?0:t.status==="blocked"?1:t.dueDate===today()?2:3;
  if(section==="completed")return (b.task.completedAt??"").localeCompare(a.task.completedAt??"");
  if(section==="archived")return (b.task.archivedAt??"").localeCompare(a.task.archivedAt??"");
  return openScore(a.task)-openScore(b.task)+(order==="priority"?priorityScore(a.task)-priorityScore(b.task)||dateScore(a.task).localeCompare(dateScore(b.task)):
   order==="due"?dateScore(a.task).localeCompare(dateScore(b.task))||priorityScore(a.task)-priorityScore(b.task):
   urgencyScore(a.task)-urgencyScore(b.task)||priorityScore(a.task)-priorityScore(b.task)||dateScore(a.task).localeCompare(dateScore(b.task)));
 }),[tasks,projectId,owner,status,priority,deadline,query,order,periodMonth,periodMode,mineOnly,currentUserId,section,completedWindow]);
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const paginated=filtered.slice((Math.min(page,pages)-1)*pageSize,Math.min(page,pages)*pageSize);
 async function persist(project:TaskProject,nextTasks:ExecutionItem[],key:string,success:string){
  if(working)return false;
  setWorking(key);setError("");setNotice("");
  try{
   const {data:session,error:authError}=await supabase.auth.getSession();
   const token=session.session?.access_token;
   if(authError||!token)throw new Error("Sessão expirada. Entre novamente.");
   const response=await fetch("/api/admin/project/update",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({projectId:project.id,expectedUpdatedAt:project.updated_at,data:{...(project.data??{}),executionTimeline:nextTasks}}),cache:"no-store"});
   if(response.status===409)throw new Error("O projeto mudou em outra sessão. Atualize a página para evitar sobrescrever alterações.");
   if(!response.ok)throw new Error("Não foi possível salvar a tarefa. Verifique as permissões.");
   const result=await response.json();
   if(!result?.project||typeof result.project.updated_at!=="string")throw new Error("Não foi possível confirmar a gravação.");
   onChanged(project.id,result.project.data as TaskProject["data"],result.project.updated_at);
   setNotice(success);
   return true;
  }catch(e){setError(e instanceof Error?e.message:"Falha de conexão.");return false;}
  finally{setWorking("");}
 }
 async function updateTask(project:TaskProject,task:ExecutionItem,patch:Partial<ExecutionItem>){
  const timeline=project.data?.executionTimeline??[];
  const next=patch.status??task.status??"planned";
  if(next==="completed"&&(task.dependencies??[]).some(id=>timeline.find(t=>t.id===id)?.status!=="completed")){setError("Conclua os pré-requisitos antes desta tarefa.");return;}
  if(next!=="completed"&&task.status==="completed"&&timeline.some(t=>t.status==="completed"&&(t.dependencies??[]).includes(task.id))){setError("Reabra primeiro as tarefas que dependem desta.");return;}
  const completionPatch=patch.status!==undefined?{completedAt:next==="completed"?(task.status==="completed"?task.completedAt:new Date().toISOString()):undefined}:{}; 
  if(patch.archivedAt&&!["completed","cancelled"].includes(task.status??"planned")){setError("Conclua ou cancele a tarefa antes de arquivar.");return;}
  const changed=Object.keys(patch).filter(k=>JSON.stringify(task[k as keyof ExecutionItem])!==JSON.stringify(patch[k as keyof ExecutionItem]));
  if(!changed.length)return;
  const log=[...(task.activityLog??[]),{at:new Date().toISOString(),summary:"Alteração: "+changed.map(k=>({status:"situação",priority:"prioridade",owner:"responsável",dueDate:"prazo",checklist:"checklist"} as Record<string,string>)[k]??k).join(", ")}].slice(-100);
  await persist(project,timeline.map(t=>t.id===task.id?{...t,...patch,...completionPatch,activityLog:log}:t),project.id+":"+task.id,"Tarefa atualizada.");
 }
 async function createTask(){
  const project=projects.find(p=>p.id===draft.projectId);
  if(!project){setError("Selecione um projeto válido.");return;}
  if(draft.title.trim().length<3||draft.title.trim().length>140){setError("Informe um título entre 3 e 140 caracteres.");return;}
  if(draft.description.length>2000){setError("A descrição excede 2.000 caracteres.");return;}
  if(draft.dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate)){setError("Informe um prazo válido.");return;}
  if(!validHttps(draft.driveUrl)||!validHttps(draft.referenceUrl)){setError("Os links precisam usar HTTPS válido.");return;}
  if(draft.dependencies.some(id=>!project.data?.executionTimeline?.some(t=>t.id===id))){setError("Pré-requisito inválido.");return;}
  const member=members.find(x=>x.user_id===draft.ownerUserId);
  if(draft.ownerUserId&&!member){setError("Escolha um responsável válido.");return;}
  const task:ExecutionItem={id:crypto.randomUUID(),title:draft.title.trim(),description:draft.description.trim(),kind:"task",status:draft.status,priority:draft.priority,owner:member?.display_name??"",ownerUserId:member?.user_id??"",dueDate:draft.dueDate,driveUrl:draft.driveUrl.trim(),referenceUrl:draft.referenceUrl.trim(),checklist:draft.checklist,dependencies:draft.dependencies,visibleToClient:false,activityLog:[{at:new Date().toISOString(),summary:"Tarefa criada"}]};
  const ok=await persist(project,[...(project.data?.executionTimeline??[]),task],project.id+":create","Tarefa criada no projeto selecionado.");
  if(ok){setCreating(false);setDraft(blankDraft());}
 }
 async function saveDetails(){
  if(!selected||!detailDraft)return;
  const title=detailDraft.title.trim(),driveUrl=detailDraft.driveUrl.trim();
  if(title.length<3||title.length>140){setError("O título deve ter entre 3 e 140 caracteres.");return;}
  if(detailDraft.description.length>2000){setError("A descrição deve ter no máximo 2.000 caracteres.");return;}
  if(!validHttps(driveUrl)||!validHttps(detailDraft.referenceUrl)){setError("Informe links HTTPS válidos.");return;}
  if(detailDraft.dependencies.some(id=>id===selected.task.id||!selected.project.data?.executionTimeline?.some(t=>t.id===id))){setError("Pré-requisito inválido.");return;}
  if(selected.task.status==="completed"&&detailDraft.dependencies.some(id=>selected.project.data?.executionTimeline?.find(t=>t.id===id)?.status!=="completed")){setError("Não é possível adicionar um pré-requisito pendente a uma tarefa concluída.");return;}
  if(detailDraft.dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(detailDraft.dueDate)){setError("Informe uma data válida.");return;}
  const patch:Partial<ExecutionItem>={title,description:detailDraft.description.trim(),driveUrl,referenceUrl:detailDraft.referenceUrl.trim(),checklist:detailDraft.checklist,dependencies:detailDraft.dependencies,dueDate:detailDraft.dueDate,visibleToClient:detailDraft.visibleToClient};
  const changed=Object.keys(patch).filter(k=>JSON.stringify(selected.task[k as keyof ExecutionItem])!==JSON.stringify(patch[k as keyof ExecutionItem]));
  const log=changed.length?[...(selected.task.activityLog??[]),{at:new Date().toISOString(),summary:"Detalhes atualizados: "+changed.join(", ")}].slice(-100):selected.task.activityLog;
  const previous=selected.project.data?.executionTimeline??[];
  const ok=await persist(selected.project,previous.map(x=>x.id===selected.task.id?{...x,...patch,activityLog:log}:x),selected.project.id+":"+selected.task.id,"Detalhes da tarefa atualizados.");
  if(ok){setDetailKey(null);setDetailDraft(null);}
 }
 const reset=()=>{setPage(1);setProjectId("all");setOwner("all");setStatus("all");setPriority("all");setDeadline("all");setPeriodMode("due");setPeriodMonth("");setQuery("");setMineOnly(false);};
 const overdue=tasks.filter(x=>!x.task.archivedAt&&x.task.dueDate&&x.task.dueDate<today()&&isOpen(x.task)).length;
 const todayCount=tasks.filter(x=>!x.task.archivedAt&&x.task.dueDate===today()&&isOpen(x.task)).length;
 const chipStatus=(task:ExecutionItem)=>statuses.find(s=>s.id===(task.status??"planned"))??statuses[0];
 const statusOptions=statuses.map(s=>({value:s.id,label:s.name,color:({planned:"#8E9BAF",in_progress:"#4D96E8",blocked:"#F2AA39",completed:"#12A66C",cancelled:"#B57A89"} as Record<Status,string>)[s.id]}));
 const priorityOptions=priorities.map(p=>({value:p.id,label:p.name,color:flagColors[p.id]}));
 const ownerOptions=[{value:"",label:"Não atribuído",photo:null},...members.map(m=>({value:m.user_id,label:m.display_name,photo:m.avatar_url??null}))];
 const chipPriority=(task:ExecutionItem)=>priorities.find(p=>p.id===(task.priority??"normal"))??priorities[2];
 const projectLink=(project:TaskProject)=>`/admin/planejamentos/${getClient(project)?.slug??""}?projectId=${encodeURIComponent(project.id)}`;
 const taskControls=(x:Item,compact=false)=><div className={compact?"flex flex-wrap gap-1":"flex flex-wrap items-center gap-2"}>
  <div className="w-[126px]"><TaskDropdown label={`Situação de ${x.task.title}`} value={x.task.status??"planned"} options={statusOptions} disabled={!!working||!!x.task.archivedAt} onChange={value=>void updateTask(x.project,x.task,{status:value})}/></div>
  <div className="w-[110px]"><TaskDropdown label={`Prioridade de ${x.task.title}`} kind="priority" value={x.task.priority??"normal"} options={priorityOptions} disabled={!!working} onChange={value=>void updateTask(x.project,x.task,{priority:value})}/></div>
 </div>;
 return <div className="mt-7 space-y-4">
  <section aria-label="Prioridades e reuniões do dia" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E3E7F0] bg-white p-4">
   <div><h2 className="text-sm font-bold">Minha visão do dia</h2><p className="mt-1 text-xs text-[#697386]">Tarefas e reuniões dos projetos · {formatted(today())}</p></div>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={()=>{setDeadline("today");setStatus("all");}} className={buttonClass}>Hoje <strong>{todayCount}</strong></button>
    <button type="button" onClick={()=>{setDeadline("overdue");setStatus("all");}} className={buttonClass}>Atrasadas <strong>{overdue}</strong></button>
    <button type="button" onClick={()=>{setDeadline("all");setStatus("all");}} className={buttonClass}>Todas <strong>{tasks.length}</strong></button>
    <span className="inline-flex items-center gap-2 rounded-lg bg-[#F5F3FF] px-3 py-2 text-xs font-semibold text-[#6034B7]"><RotevoTablerIcon name="calendar-week" size={16} stroke={1.9}/> Reuniões hoje: {todayAppointments.length}</span>
   </div>
  </section>
  {todayAppointments.length>0&&<section className="rounded-xl border bg-white p-4"><h3 className="text-sm font-semibold">Agenda de hoje</h3><div className="mt-2 flex flex-wrap gap-2">{todayAppointments.map(({appointment,project})=><Link key={project.id+":"+appointment.id} href={projectLink(project)} className="rounded-lg bg-[#F6F7FB] px-3 py-2 text-xs">{appointment.time??"Sem horário"} · {appointment.title} · {project.title}</Link>)}</div></section>}
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-4 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Central de tarefas</h2><p className="mt-1 text-xs text-[#697386]">Todos os projetos · {filtered.length} tarefa(s) encontrada(s)</p></div>
    <div className="flex flex-wrap items-center gap-2">
     <button type="button" onClick={()=>{setDraft(d=>({...d,projectId:projectId!=="all"?projectId:projects[0]?.id??""}));setCreating(true);setError("");}} className="inline-flex items-center gap-2 rounded-lg bg-[#ADE60A] px-4 py-2 text-xs font-semibold text-[#090D1C] transition hover:bg-[#9BCC00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D35F5]"><RotevoTablerIcon name="square-rounded-plus" size={17} stroke={1.9}/> Nova tarefa</button>
     <div className="w-full min-w-[205px] sm:w-[235px]"><ProjectPicker projects={projects} value={projectId} onChange={setProjectId} allowAll photos={clientPhotos}/></div>
     <button type="button" aria-pressed={mineOnly} onClick={()=>setMineOnly(v=>!v)} disabled={!currentUserId} className={buttonClass+(mineOnly?" border-[#6D35F5] bg-[#F2ECFF] text-[#6034B7]":"")}>Minhas tarefas</button>
     <button type="button" aria-label="Buscar tarefas" aria-expanded={showSearch} onClick={()=>setShowSearch(v=>!v)} className={buttonClass}><RotevoTablerIcon name="search" size={17} stroke={1.9}/> <span className="hidden sm:inline">Buscar</span></button>
     <button type="button" aria-label="Mostrar filtros" aria-expanded={showFilters} onClick={()=>setShowFilters(v=>!v)} className={buttonClass}><RotevoTablerIcon name="filter" size={17} stroke={1.9}/> <span className="hidden sm:inline">Filtros</span></button>
     <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E3E7F0] bg-white px-2"><RotevoTablerIcon name="arrows-sort" size={17}/><select aria-label="Ordenar tarefas" className="max-w-[150px] cursor-pointer border-0 bg-transparent text-xs font-medium text-[#090D1C] outline-none" value={order} onChange={e=>setOrder(e.target.value as typeof order)}><option value="urgency">Prioridades primeiro</option><option value="due">Prazo</option><option value="priority">Prioridade</option></select></label>
     <div className="flex overflow-hidden rounded-lg border border-[#E1E5EE]"><button type="button" aria-pressed={view==="list"} onClick={()=>setView("list")} className={`inline-flex items-center gap-2 px-3 py-2 text-xs ${view==="list"?"bg-[#EDE8FF] font-semibold text-[#6034B7]":""}`}><RotevoTablerIcon name="list" size={16} stroke={1.9}/> <span className="hidden sm:inline">Lista</span></button><button type="button" aria-pressed={view==="board"} onClick={()=>setView("board")} className={`inline-flex items-center gap-2 border-l px-3 py-2 text-xs ${view==="board"?"bg-[#EDE8FF] font-semibold text-[#6034B7]":""}`}><RotevoTablerIcon name="layout-kanban" size={16} stroke={1.9}/> <span className="hidden sm:inline">Kanban</span></button></div>
    </div>
   </div>
   <nav aria-label="Organização das tarefas" className="mt-4 flex flex-wrap gap-2">{([{id:"active",label:"Ativas"},{id:"completed",label:"Concluídas"},{id:"archived",label:"Arquivo"}] as const).map(tab=><button type="button" key={tab.id} aria-pressed={section===tab.id} onClick={()=>{setSection(tab.id);setPage(1);setStatus("all");setDeadline("all");setPeriodMonth("");setPeriodMode(tab.id==="completed"?"completed":"due");}} className={"cursor-pointer rounded-lg border px-4 py-2 text-xs font-semibold "+(section===tab.id?"border-[#6D35F5] bg-[#F0EBFF] text-[#6034B7]":"border-[#DCE2EC] text-[#525B70]")}>{tab.label}</button>)}</nav>
    {section==="completed"&&<div className="mt-3 flex items-center gap-2"><label className="text-xs font-semibold text-[#697386]">Conclusão<select aria-label="Período das tarefas concluídas" value={completedWindow} onChange={e=>{setCompletedWindow(e.target.value as typeof completedWindow);setPage(1);}} className="ml-2 rounded-lg border border-[#E1E5EE] bg-white px-3 py-2 text-xs"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todos os períodos</option></select></label></div>}
    {section==="completed"&&<p className="mt-3 text-xs text-[#697386]">Tarefas concluídas antes do registro da data de conclusão só aparecem em “Todos os períodos”.</p>}
    {section==="archived"&&<p className="mt-3 text-xs text-[#697386]">Tarefas arquivadas permanecem armazenadas e podem ser restauradas pelo painel de detalhes.</p>}
    {showSearch&&<input autoFocus aria-label="Buscar por tarefa, projeto, cliente ou responsável" className="mt-4 w-full rounded-lg border border-[#E1E5EE] px-4 py-3 text-sm" placeholder="Buscar tarefa, projeto, cliente ou responsável..." type="search" value={query} onChange={e=>setQuery(e.target.value)}/>}
   {showFilters&&<section aria-label="Filtros avançados das tarefas" className="mt-3 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4"><div className="flex flex-wrap items-center gap-3">
    
    <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E1E5EE] bg-white pl-2 pr-1 text-[#525B70]"><RotevoTablerIcon name="user-check" size={17} stroke={1.9}/><select aria-label="Filtrar responsável" value={owner} onChange={e=>setOwner(e.target.value)} className="max-w-[190px] cursor-pointer appearance-none border-0 bg-transparent py-2 text-xs font-medium text-[#090D1C] outline-none"><option value="all">Todas as pessoas</option><option value="unassigned">Não atribuído</option>{owners.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E1E5EE] bg-white pl-2 pr-1 text-[#525B70]"><RotevoTablerIcon name="flag" size={17} stroke={1.9}/><select aria-label="Filtrar prioridade" value={priority} onChange={e=>setPriority(e.target.value)} className="max-w-[190px] cursor-pointer appearance-none border-0 bg-transparent py-2 text-xs font-medium text-[#090D1C] outline-none"><option value="all">Todas as prioridades</option>{priorities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E3E7F0] bg-white px-2 text-[#525B70]"><RotevoTablerIcon name="filter" size={17} stroke={1.9}/><select aria-label="Filtrar situação" value={status} onChange={e=>setStatus(e.target.value)} className="max-w-[170px] cursor-pointer appearance-none border-0 bg-transparent py-2 text-xs font-medium text-[#090D1C] outline-none"><option value="all">Todas as situações</option>{statuses.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E3E7F0] bg-white px-2 text-[#525B70]"><RotevoTablerIcon name="calendar-week" size={17} stroke={1.9}/><select aria-label="Filtrar prazo" value={deadline} onChange={e=>setDeadline(e.target.value as typeof deadline)} className="max-w-[170px] cursor-pointer appearance-none border-0 bg-transparent py-2 text-xs font-medium text-[#090D1C] outline-none"><option value="all">Todos os prazos</option><option value="today">Hoje</option><option value="overdue">Atrasadas</option><option value="upcoming">Futuras</option></select></label>
    <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E1E5EE] bg-white pl-2 pr-1 text-[#525B70]"><RotevoTablerIcon name="calendar-week" size={18} stroke={1.9}/><select aria-label="Tipo de período" value={periodMode} onChange={e=>{setPeriodMode(e.target.value as "due"|"completed");setDeadline("all");}} className="max-w-[190px] cursor-pointer appearance-none border-0 bg-transparent py-2 text-xs font-medium text-[#090D1C] outline-none"><option value="due">Prazo no mês</option><option value="completed">Concluídas no mês</option></select></label>
    <label className="inline-flex items-center gap-2 rounded-lg border border-[#E3E7F0] bg-white px-2 text-[#525B70]"><RotevoTablerIcon name="calendar-week" size={18}/><select aria-label="Selecionar mês das tarefas" value={periodMonth} onChange={e=>{setPeriodMonth(e.target.value);setDeadline("all");}} className="max-w-[190px] cursor-pointer border-0 bg-transparent py-2.5 text-xs text-[#090D1C] outline-none"><option value="">Todos os meses</option>{Array.from({length:49},(_,i)=>{const now=new Date();const d=new Date(now.getFullYear(),now.getMonth()+12-i,1);const value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;return <option key={value} value={value}>{new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(d)}</option>})}</select></label>
    <button type="button" className={buttonClass} onClick={reset}>Limpar filtros</button>
   </div></section>}
   {periodMonth&&periodMode==="completed"&&<p className="mt-3 text-xs text-[#697386]">O relatório considera a data real de conclusão registrada. Tarefas concluídas antes da implantação desse registro podem não aparecer porque não é possível determinar quando foram finalizadas.</p>}
   {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {notice&&<p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
   {creating&&<section aria-label="Nova tarefa" className="mt-4 rounded-xl border border-[#DDD4FB] bg-[#FCFAFF] p-4"><h3 className="text-base font-semibold">Nova tarefa</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-medium sm:col-span-2">Nome da tarefa *<input value={draft.title} maxLength={140} onChange={e=>setDraft({...draft,title:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
     <div className="text-xs font-medium">Projeto *<div className="mt-1"><ProjectPicker projects={projects} value={draft.projectId} onChange={projectId=>setDraft({...draft,projectId,dependencies:[]})} photos={clientPhotos}/></div></div>
     <label className="text-xs font-medium">Responsável<select disabled={!teamReady||members.length===0} value={draft.ownerUserId} onChange={e=>setDraft({...draft,ownerUserId:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"><option value="">Não atribuído</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></label>
     <div className="text-xs font-medium sm:col-span-2">Prioridade<div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{priorities.map(p=><button type="button" key={p.id} aria-pressed={draft.priority===p.id} onClick={()=>setDraft({...draft,priority:p.id})} className={"flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs font-semibold "+(draft.priority===p.id?"border-[#6D35F5] bg-[#F4F0FF]":"border-[#DDE2ED] bg-white")}><span style={{color:flagColors[p.id]}}><RotevoTablerIcon name="flag" size={18}/></span>{p.name}</button>)}</div></div>
     <label className="text-xs font-medium">Prazo<input type="date" value={draft.dueDate} onChange={e=>setDraft({...draft,dueDate:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
     <label className="text-xs font-medium">Status inicial<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as Status})} className="mt-1 w-full rounded-lg border p-3 text-sm">{statuses.filter(s=>["planned","in_progress","blocked"].includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <div className="hidden sm:block"/>
      <label className="text-xs font-medium sm:col-span-2">Descrição opcional<textarea rows={3} maxLength={2000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
      <label className="text-xs font-medium sm:col-span-2">Pasta ou documento no Drive (HTTPS)<input type="url" maxLength={2048} value={draft.driveUrl} onChange={e=>setDraft({...draft,driveUrl:e.target.value})} placeholder="https://drive.google.com/..." className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
      <label className="text-xs font-medium sm:col-span-2">Link de referência adicional (opcional)<input type="url" maxLength={2048} value={draft.referenceUrl} onChange={e=>setDraft({...draft,referenceUrl:e.target.value})} placeholder="https://..." className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
      <div className="sm:col-span-2"><button type="button" onClick={()=>setAdvanced(v=>!v)} className="cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold">{advanced?"Ocultar":"Mostrar"} checklist e dependências</button></div>
      {advanced&&<div className="space-y-3 rounded-lg border border-[#DDD4FB] bg-white p-3 sm:col-span-2"><p className="text-xs font-semibold">Checklist</p><div className="flex gap-2"><input value={newChecklistText} maxLength={240} onChange={e=>setNewChecklistText(e.target.value)} placeholder="Adicionar etapa..." className="min-w-0 flex-1 rounded-lg border p-2 text-sm"/><button type="button" onClick={()=>{if(newChecklistText.trim()&&draft.checklist.length<50){setDraft({...draft,checklist:[...draft.checklist,{id:crypto.randomUUID(),text:newChecklistText.trim(),done:false}]});setNewChecklistText("");}}} className="cursor-pointer rounded-lg border px-3 text-xs">Adicionar</button></div>{draft.checklist.map(ch=><div key={ch.id} className="flex items-center justify-between gap-2 text-xs">{ch.text}<button type="button" onClick={()=>setDraft({...draft,checklist:draft.checklist.filter(x=>x.id!==ch.id)})} className="cursor-pointer text-[#B33653]">Remover</button></div>)}<p className="text-xs font-semibold">Pré-requisitos</p>{(projects.find(p=>p.id===draft.projectId)?.data?.executionTimeline??[]).filter(t=>t.status!=="cancelled").map(t=><label key={t.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.dependencies.includes(t.id)} onChange={e=>setDraft({...draft,dependencies:e.target.checked?[...draft.dependencies,t.id]:draft.dependencies.filter(id=>id!==t.id)})}/>{t.title}</label>)}<p className="text-[11px] text-[#718096]">Essas tarefas precisarão ser concluídas antes da nova atividade.</p></div>}
    </div><div className="mt-4 flex justify-end gap-2"><button type="button" disabled={!!working} className={buttonClass} onClick={()=>setCreating(false)}>Cancelar</button><button type="button" disabled={!!working||projects.length===0} className="rounded-lg bg-[#0B142A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" onClick={()=>void createTask()}>{working?"Salvando...":"Criar tarefa"}</button></div></section>}
   {filtered.length===0?<div className="mt-4 rounded-lg bg-[#F6F7FB] p-5 text-sm text-[#697386]">Nenhuma tarefa corresponde aos filtros. Use “Nova tarefa” para cadastrar uma atividade em um projeto.</div>:view==="list"?
   <div className="mt-4 overflow-x-auto rounded-xl border border-[#E3E7F0]"><table className="w-full min-w-[820px] border-collapse text-left text-sm"><thead className="bg-[#F7F8FC] text-xs font-semibold text-[#525B70]"><tr>{([["Tarefa","list"],["Projeto","folder"],["Responsável","user-check"],["Situação","filter"],["Prioridade","flag"],["Prazo","calendar-week"]] as const).map(([name,icon])=><th key={name} className="border-b border-[#E3E7F0] px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name={icon} size={17} stroke={1.9}/>{name}</span></th>)}</tr></thead><tbody className="divide-y divide-[#EEF0F5]">{paginated.map(({task,project,client})=>{
    
    return <tr key={project.id+":"+task.id} className="hover:bg-[#FBFAFF]">
     <td className="max-w-[280px] border-l-4 px-3 py-3 font-medium" style={{borderLeftColor:task.status==="completed"?"#37B36E":task.priority==="urgent"?"#E04961":task.priority==="high"?"#E9AE39":"#9C78F4"}}><button type="button" onClick={()=>openDetails({task,project,client})} className="group inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md py-1 text-left font-semibold text-[#4E2CA8] underline decoration-[#C9B8F3] underline-offset-4 transition hover:bg-[#F2ECFF] hover:text-[#5622C5] hover:decoration-[#5622C5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D35F5]">{task.title}<span aria-hidden="true" className="text-xs opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100">↗</span></button>{(task.dependencies??[]).length>0&&<span className="mt-1 block text-[10px] text-[#697386]">Pré-requisitos: {(task.dependencies??[]).length}</span>}</td>
     <td className="px-3 py-3"><Link title={`${client?.name??"Cliente"} · ${project.title}`} className="inline-flex max-w-[185px] items-center gap-2 text-xs font-semibold text-[#323B51] hover:text-[#6D35F5]" href={projectLink(project)}><TaskAvatar name={client?.name??"Cliente"} src={clientPhotos[client?.id??""]} size={28}/><span className="truncate">{client?.name??"Cliente"}</span></Link></td>
     <td className="px-3 py-3">{teamReady&&members.length>0?<div className="w-[158px]"><TaskDropdown label={`Responsável por ${task.title}`} kind="people" value={task.ownerUserId&&members.some(m=>m.user_id===task.ownerUserId)?task.ownerUserId:""} options={ownerOptions} disabled={!!working||!!task.archivedAt} avatar={task.ownerUserId?{name:task.owner||"Responsável",src:members.find(m=>m.user_id===task.ownerUserId)?.avatar_url}:undefined} onChange={id=>{const m=members.find(x=>x.user_id===id);void updateTask(project,task,{ownerUserId:m?.user_id??"",owner:m?.display_name??""});}}/></div>:<span className="text-xs text-[#525B70]">{task.owner||"Não atribuído"}</span>}</td>
     <td className="px-3 py-3"><div className="w-[132px]"><TaskDropdown label={`Situação de ${task.title}`} value={task.status??"planned"} options={statusOptions} disabled={!!working||!!task.archivedAt} onChange={value=>void updateTask(project,task,{status:value})}/></div></td>
     <td className="px-3 py-3"><div className="w-[110px]"><TaskDropdown label={`Prioridade de ${task.title}`} kind="priority" value={task.priority??"normal"} options={priorityOptions} disabled={!!working||!!task.archivedAt} onChange={value=>void updateTask(project,task,{priority:value})}/></div></td>
     <td className={`whitespace-nowrap px-3 py-3 text-xs ${task.dueDate&&task.dueDate<today()&&isOpen(task)?"font-bold text-[#BB3041]":"text-[#525B70]"}`}>{formatted(task.dueDate)}</td>
    </tr>;
   })}</tbody></table></div>:
   <div className="mt-4 flex gap-3 overflow-x-auto pb-3">{statuses.filter(col=>section==="active"?col.id!=="completed"&&col.id!=="cancelled":section==="completed"?col.id==="completed":true).map(col=><section key={col.id} className="w-64 shrink-0 rounded-xl bg-[#F6F7FB] p-3"><h3 className="mb-3 flex items-center justify-between gap-2 text-xs font-semibold"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${col.bar}`}/>{col.name}</span><span>{filtered.filter(x=>(x.task.status??"planned")===col.id).length}</span></h3><div className="space-y-2">{paginated.filter(x=>(x.task.status??"planned")===col.id).map(x=><article key={x.project.id+":"+x.task.id} className="rounded-lg border bg-white p-3"><button type="button" onClick={()=>openDetails(x)} className="group inline-flex cursor-pointer items-center gap-1 rounded-md py-1 text-left text-xs font-semibold text-[#4E2CA8] underline decoration-[#C9B8F3] underline-offset-4 hover:bg-[#F2ECFF] hover:text-[#5622C5]">{x.task.title}<span aria-hidden="true">↗</span></button><Link href={projectLink(x.project)} className="mt-2 inline-flex max-w-full items-center gap-2 text-[11px] font-semibold text-[#6034B7] hover:underline"><TaskAvatar name={x.client?.name??"Cliente"} src={clientPhotos[x.client?.id??""]} size={22}/><span className="truncate">{x.client?.name??"Cliente"}</span></Link><div className="mt-2 flex justify-between gap-1 text-[11px] text-[#697386]"><span className="flex min-w-0 items-center gap-1.5">{x.task.ownerUserId&&<TaskAvatar name={x.task.owner||"Responsável"} src={members.find(m=>m.user_id===x.task.ownerUserId)?.avatar_url} size={20}/>}<span className="truncate">{x.task.owner||"Não atribuído"}</span></span><span>{formatted(x.task.dueDate)}</span></div><div className="mt-2 inline-flex items-center gap-1.5 text-[11px]" style={{color:flagColors[x.task.priority??"normal"]}}><RotevoTablerIcon name="flag" size={16}/>{chipPriority(x.task).name}</div><div className="mt-3">{taskControls(x,true)}</div></article>)}</div></section>)}</div>}
  {filtered.length>pageSize&&<nav aria-label="Paginação de tarefas" className="mt-4 flex items-center justify-end gap-3"><button type="button" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="cursor-pointer rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Anterior</button><span className="text-xs text-[#697386]">Página {Math.min(page,pages)} de {pages}</span><button type="button" disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="cursor-pointer rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Próxima</button></nav>}
   </section>
  {selected&&detailDraft&&<div className="fixed inset-0 z-[100] flex justify-end">
   <button type="button" aria-label="Fechar detalhes" className="absolute inset-0 bg-[#0B142A]/50" onClick={()=>{setDetailKey(null);setDetailDraft(null);}}/>
   <aside role="dialog" aria-modal="true" aria-label="Detalhes da tarefa" className="relative z-10 flex h-full w-full max-w-[540px] flex-col overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
    <div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold text-[#525B70]">Detalhes da tarefa</div><button type="button" aria-label="Fechar" className={buttonClass} onClick={()=>{setDetailKey(null);setDetailDraft(null);}}><RotevoTablerIcon name="x" size={19}/></button></div>
    <label className="mt-6 text-xs font-semibold text-[#525B70]">Título<input maxLength={140} value={detailDraft.title} onChange={e=>setDetailDraft({...detailDraft,title:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E1E5EE] px-3 py-3 text-lg font-bold"/></label>
    <Link className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6D35F5]" href={projectLink(selected.project)}><RotevoTablerIcon name="folder" size={17}/> {selected.client?.name??"Cliente"} · {selected.project.title}</Link>
    <div className="mt-4 flex flex-wrap items-center gap-2">{selected.task.archivedAt?<button type="button" disabled={!!working} onClick={()=>void updateTask(selected.project,selected.task,{archivedAt:undefined})} className="cursor-pointer rounded-lg border border-[#D4C7F5] px-3 py-2 text-xs font-semibold text-[#6034B7]">Restaurar tarefa</button>:["completed","cancelled"].includes(selected.task.status??"planned")&&<button type="button" disabled={!!working} onClick={()=>void updateTask(selected.project,selected.task,{archivedAt:new Date().toISOString()})} className="cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold text-[#525B70]">Arquivar tarefa</button>}</div>
     <div className="mt-5 grid grid-cols-2 gap-3">
     <div className="rounded-lg bg-[#F6F7FB] p-3"><p className="text-xs text-[#697386]">Situação</p><p className="mt-1 text-sm font-semibold">{chipStatus(selected.task).name}</p></div>
     <div className="rounded-lg bg-[#F6F7FB] p-3"><p className="text-xs text-[#697386]">Responsável</p><p className="mt-1 text-sm font-semibold">{selected.task.owner||"Não atribuído"}</p></div>
     <div className="rounded-lg bg-[#F6F7FB] p-3"><p className="inline-flex items-center gap-1 text-xs text-[#697386]"><RotevoTablerIcon name="flag" size={15}/> Prioridade</p><p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold"><span style={{color:flagColors[selected.task.priority??"normal"]}}><RotevoTablerIcon name="flag" size={17}/></span>{chipPriority(selected.task).name}</p></div>
     <label className="rounded-lg bg-[#F6F7FB] p-3 text-xs text-[#697386]"><span className="inline-flex items-center gap-1"><RotevoTablerIcon name="calendar-week" size={15}/> Prazo</span><input aria-label="Prazo da tarefa" type="date" value={detailDraft.dueDate} onChange={e=>setDetailDraft({...detailDraft,dueDate:e.target.value})} className="mt-1 block w-full rounded-md border border-[#E1E5EE] bg-white p-1 text-xs text-[#242A3A]"/></label>
    </div>
    <label className="mt-5 text-xs font-semibold text-[#525B70]">Descrição da tarefa<textarea rows={5} maxLength={2000} value={detailDraft.description} onChange={e=>setDetailDraft({...detailDraft,description:e.target.value})} placeholder="Briefing, instruções ou contexto..." className="mt-2 w-full rounded-xl border border-[#E1E5EE] p-3 text-sm"/></label>
    <label className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#525B70]"><RotevoTablerIcon name="link" size={18}/> Material no Google Drive (HTTPS)</label>
    <input aria-label="Link do material" type="url" placeholder="https://drive.google.com/..." value={detailDraft.driveUrl} onChange={e=>setDetailDraft({...detailDraft,driveUrl:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E1E5EE] p-3 text-sm"/>
    {selected.task.driveUrl&&/^https:\/\//.test(selected.task.driveUrl)&&<a target="_blank" rel="noopener noreferrer" href={selected.task.driveUrl} className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#6D35F5]"><RotevoTablerIcon name="link" size={16}/> Abrir material salvo no Drive ↗</a>}
    <label className="mt-4 block text-xs font-semibold text-[#525B70]">Referência adicional (HTTPS)<input type="url" maxLength={2048} placeholder="https://..." value={detailDraft.referenceUrl} onChange={e=>setDetailDraft({...detailDraft,referenceUrl:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E1E5EE] p-3 text-sm"/></label>
    <section className="mt-5 rounded-xl border border-[#E3E7F0] p-4"><h3 className="text-sm font-bold">Checklist</h3><div className="mt-3 space-y-2">{detailDraft.checklist.map(ch=><div key={ch.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ch.done} onChange={e=>setDetailDraft({...detailDraft,checklist:detailDraft.checklist.map(x=>x.id===ch.id?{...x,done:e.target.checked}:x)})}/><span className="min-w-0 flex-1">{ch.text}</span><button type="button" onClick={()=>setDetailDraft({...detailDraft,checklist:detailDraft.checklist.filter(x=>x.id!==ch.id)})} className="cursor-pointer text-xs text-[#AA4052]">Remover</button></div>)}</div><div className="mt-3 flex gap-2"><input value={detailChecklistText} maxLength={240} onChange={e=>setDetailChecklistText(e.target.value)} placeholder="Nova etapa..." className="min-w-0 flex-1 rounded-lg border p-2 text-sm"/><button type="button" onClick={()=>{if(detailChecklistText.trim()&&detailDraft.checklist.length<50){setDetailDraft({...detailDraft,checklist:[...detailDraft.checklist,{id:crypto.randomUUID(),text:detailChecklistText.trim(),done:false}]});setDetailChecklistText("");}}} className="cursor-pointer rounded-lg border px-3 text-xs">Adicionar</button></div></section>
    <section className="mt-4 rounded-xl border border-[#E3E7F0] p-4"><h3 className="text-sm font-bold">Pré-requisitos</h3><div className="mt-3 space-y-2">{(selected.project.data?.executionTimeline??[]).filter(t=>t.id!==selected.task.id&&t.status!=="cancelled").map(t=><label key={t.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={detailDraft.dependencies.includes(t.id)} onChange={e=>setDetailDraft({...detailDraft,dependencies:e.target.checked?[...detailDraft.dependencies,t.id]:detailDraft.dependencies.filter(id=>id!==t.id)})}/>{t.title}</label>)}{(selected.project.data?.executionTimeline??[]).length<=1&&<p className="text-xs text-[#718096]">Nenhuma outra tarefa neste projeto.</p>}</div></section>
    <section className="mt-4 rounded-xl bg-[#F8F9FC] p-4"><h3 className="text-sm font-bold">Histórico da atividade</h3><div className="mt-2 space-y-2">{(selected.task.activityLog??[]).slice(-10).reverse().map((e,i)=><div key={i} className="text-xs text-[#627087]">{new Date(e.at).toLocaleString("pt-BR")} · {e.summary}</div>)}{!(selected.task.activityLog?.length)&&<p className="text-xs text-[#718096]">Sem histórico detalhado anterior a esta atualização.</p>}</div></section>
    <label className="mt-5 flex items-center gap-2 text-xs text-[#525B70]"><input type="checkbox" checked={detailDraft.visibleToClient} onChange={e=>setDetailDraft({...detailDraft,visibleToClient:e.target.checked})}/> Compartilhar esta tarefa com o cliente</label>
    <section aria-label="Conteúdo vinculado" className="mt-5 rounded-xl border border-[#E3E7F0] bg-[#F8F9FC] p-4">
     <p className="inline-flex items-center gap-2 text-sm font-semibold"><RotevoTablerIcon name="link" size={18}/> Conteúdo vinculado</p>
     {linkedContent.length===0?<p className="mt-2 text-xs leading-5 text-[#525B70]">Nenhuma publicação vinculada. Se esta tarefa envolver material editorial, associe-a a um conteúdo no Calendário Editorial. Compartilhar a tarefa com o cliente não cria uma publicação automaticamente.</p>:
     <div className="mt-3 space-y-3">{linkedContent.map(item=>{const decision=approvalRows.find(r=>r.project_id===selected.project.id&&r.content_id===item.id&&r.content_version===(item.version??""));return <article key={item.id} className="rounded-lg border border-[#E0E4EC] bg-white p-3">
      <p className="text-sm font-semibold">{item.title}</p>
      <p className="mt-1 text-xs text-[#697386]">Versão {item.version||"não informada"} · {decision?(decision.decision==="approved"?"Aprovado pelo cliente":"Ajustes solicitados"):item.status==="awaiting_client"?"Aguardando decisão":item.status==="approved"?"Aprovado (status editorial)":"Situação editorial: "+item.status}</p>
      {decision?.comment&&<div className="mt-2 flex items-start gap-2 rounded-lg bg-[#FFF7E8] p-2 text-xs"><RotevoTablerIcon name="message-circle" size={17}/><p className="whitespace-pre-wrap">{decision.comment}</p></div>}
      {approvalUnavailable&&<p className="mt-2 text-xs text-amber-800">O histórico de aprovações ainda não está disponível neste ambiente.</p>}
     </article>;})}</div>}
     {onOpenContent&&<button type="button" className="mt-3 cursor-pointer rounded-lg border border-[#DDD4FB] bg-white px-3 py-2 text-xs font-semibold text-[#6D35F5]" onClick={()=>{setDetailKey(null);setDetailDraft(null);onOpenContent();}}>Abrir Calendário de Conteúdo →</button>}
    </section>
    {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-auto flex justify-end gap-2 border-t border-[#E1E5EE] pt-5"><button type="button" className={buttonClass} onClick={()=>{setDetailKey(null);setDetailDraft(null);}}>Cancelar</button><button type="button" disabled={!!working} onClick={()=>void saveDetails()} className="rounded-lg bg-[#6D35F5] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{working?"Salvando...":"Salvar alterações"}</button></div>
   </aside>
  </div>}
 </div>;
}
