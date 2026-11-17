"use client";
import {useMemo,useState,type ReactNode} from "react";
import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import {request} from "@/lib/operations/api";
import {supabase} from "@/lib/supabase";
import GoogleCalendarConnection from "@/Components/admin/GoogleCalendarConnection";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {defaultMeetingZone,meetingInterval,meetingIntervalsOverlap,type MeetingTiming} from "@/lib/googleCalendar/meetingTiming";
import {emptyEventOptions,eventOptions,recurrenceOptions,type EventLink,type EventOptions} from "@/lib/googleCalendar/eventSync";
import {validOperationalDate,validOperationalTime} from "@/lib/security/executionDependencyValidation";

export type MeetingActionItem={id:string;title:string;owner:string;dueDate:string;relatedTaskId?:string};
export type MinutesRevision={version:number;text:string;changedAt:string;changedBy:string};
export type AgendaItem={id:string;title:string;kind:"meeting"|"followup"|"checkpoint";date:string;time?:string;status:"planned"|"completed"|"cancelled";notes?:string;owner?:string;relatedTaskId?:string;meetingUrl?:string;visibleToClient?:boolean;modality?:"online"|"presencial";location?:string;duration?:string;minutes?:string;internalNotes?:string;minutesVisibleToClient?:boolean;agendaVisibleToClient?:boolean;actionItems?:MeetingActionItem[];minutesHistory?:MinutesRevision[];materialUrl?:string;timing?:MeetingTiming;googleOptions?:EventOptions;googleLink?:EventLink};
type Data={operationalAgenda?:AgendaItem[];executionTimeline?:{id:string;title:string}[]};
const empty:AgendaItem={id:"",title:"",kind:"meeting",date:"",time:"",status:"planned",notes:"",owner:"",relatedTaskId:"",meetingUrl:"",visibleToClient:false,modality:"online",location:"",duration:"",minutes:"",internalNotes:"",minutesVisibleToClient:false,agendaVisibleToClient:false,actionItems:[],materialUrl:""};
function freshMeeting():AgendaItem{
 const date=new Date().toLocaleDateString("sv-SE");
 return {...empty,date,time:"09:00",timing:{endDate:date,endTime:"10:00",timeZone:defaultMeetingZone,allDay:false}};
}
const kinds={meeting:"Reunião",followup:"Acompanhamento",checkpoint:"Marco de controle"};
function GoogleMeetLink({link}:{link?:EventLink}){
 const [copied,setCopied]=useState(false),[error,setError]=useState("");
 if(link?.cancelled)return null;
 if(link?.meetUrl&&/^https:\/\/meet\.google\.com\/[a-z-]+$/i.test(link.meetUrl)){
  return <div className="flex flex-wrap items-center gap-2 text-xs">
   <a href={link.meetUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 max-w-full truncate text-[#5949D1] underline">{link.meetUrl}</a>
   <button type="button" className="rounded-lg border px-3 py-2" onClick={async()=>{
    try{await navigator.clipboard.writeText(link.meetUrl!);setCopied(true);setError("");}
    catch{setCopied(false);setError("Não foi possível copiar. Selecione o link para copiar manualmente.");}
   }}>{copied?"Link copiado":"Copiar link"}</button>
   {error&&<p role="alert" className="w-full">{error}</p>}
  </div>;
 }
 return link?.meetStatus?<p role="status" className="text-xs">{link.meetStatus==="pending"?"Google Meet em preparação. Sincronize novamente para consultar o link.":link.meetStatus==="failure"?"O Google não conseguiu gerar o Meet. Confira a permissão de videoconferência do calendário.":"O Google ainda não retornou o link do Meet."}</p>:null;
}

export default function OperationalAgenda({projectId,projectData,updatedAt,onSaved,startNew=false,projectPicker,privateOwnerId,privateReady=false}:{projectId:string;projectData:Data;updatedAt:string|null;privateOwnerId?:string;privateReady?:boolean;onSaved:(data:Data,updatedAt:string)=>void;startNew?:boolean;projectPicker?:ReactNode}){
 const [initialDraft,setInitialDraft]=useState<AgendaItem>(freshMeeting);
 const [editing,setEditing]=useState<AgendaItem|null>(startNew?initialDraft:null),[working,setWorking]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [recordMode,setRecordMode]=useState(false);
 const [guestDraft,setGuestDraft]=useState(""),[guestOptional,setGuestOptional]=useState(false);
 const optionsWithDraft=()=>{
  const added=guestDraft.split(/[,;\s]+/).map(value=>value.trim()).filter(Boolean);
  return {...options,guests:guestOptional?options.guests:[...options.guests,...added],optionalGuests:guestOptional?[...(options.optionalGuests??[]),...added]:options.optionalGuests};
 };
 function addGuest(){
  const candidate=eventOptions(optionsWithDraft());
  if(!candidate){setError("Informe um e-mail válido para adicionar o convidado.");return;}
  changeOptions(candidate);setGuestDraft("");setError("");
 }
 const googleEnabled=process.env.NEXT_PUBLIC_ROTEVO_GOOGLE_CALENDAR_ENABLED==="true";
 const [invites,setInvites]=useState<Record<string,boolean>>({});
 const [conflict,setConflict]=useState<{id:string;token:string;canPush:boolean;canPull:boolean}|null>(null);
 const options=editing?.googleOptions??emptyEventOptions;
 const changeOptions=(changes:Partial<EventOptions>)=>{if(editing)setEditing({...editing,googleOptions:{...options,...changes}});};
 async function sync(item:AgendaItem,action:"sync"|"pull"|"push"="sync"){
  if(working||!discard())return;
  setWorking(true);setError("");setMessage("");
  try{
   const result=await request<{project?:{data:Data;updated_at:string};agenda?:{data:Data;updated_at:string};conflict?:boolean;conflictToken?:string;canPush?:boolean;canPull?:boolean;error?:string}>(
    "/api/admin/google-calendar/events","POST",{projectId:projectId||null,...(!projectId?{scope:"personal",expectedOwnerUserId:privateOwnerId}:{}),meetingId:item.id,expectedUpdatedAt:updatedAt,action,notify:invites[item.id]===true,
     ...(action==="sync"?{}:{conflictToken:conflict?.token})});
   const confirmedContainer=projectId?result.project:result.agenda;
   if(result.conflict&&result.conflictToken){
    setConflict({id:item.id,token:result.conflictToken,canPush:result.canPush===true,canPull:result.canPull===true});
    setError(result.error??"Foram detectadas alterações nos dois sistemas.");
   }else if(confirmedContainer){
    onSaved(confirmedContainer.data,confirmedContainer.updated_at);
    setConflict(null);const confirmed=confirmedContainer.data.operationalAgenda?.find(value=>value.id===item.id);setEditing(confirmed?{...confirmed}:null);setRecordMode(!!confirmed);setMessage("Compromisso sincronizado com o Google Calendar.");
   }else throw Error("O servidor não confirmou a sincronização.");
  }catch(e){setError(e instanceof Error?e.message:"Falha na sincronização.");}
  finally{setWorking(false);}
 }
 const rows=useMemo(()=>Array.isArray(projectData.operationalAgenda)?projectData.operationalAgenda.filter(x=>x&&typeof x.id==="string"&&typeof x.title==="string"):[],[projectData]);
 const ordered=[...rows].sort((a,b)=>(a.date+"T"+(a.time||"23:59")).localeCompare(b.date+"T"+(b.time||"23:59")));
 const tasks=projectData.executionTimeline??[];
 const timing=editing?.timing;
 const interval=editing&&timing?meetingInterval(editing.date,editing.time??"",timing):null;
 const [availability,setAvailability]=useState<{key:string;message:string}|null>(null);
 const availabilityKey=interval?interval.start+":"+interval.end:"";
 const overlapping=editing?.status==="planned"&&interval?rows.some(row=>{
  if(row.id===editing.id||row.status!=="planned"||!row.timing)return false;
  const other=meetingInterval(row.date,row.time??"",row.timing);
  return !!other&&meetingIntervalsOverlap(interval,other);
 }):false;
 function newDraft(){
  setRecordMode(false);setGuestDraft("");setError("");
  const draft=freshMeeting();setInitialDraft(draft);setEditing(draft);
 }
 const baseline=editing?.id?rows.find(row=>row.id===editing.id):initialDraft;
 const dirty=!!editing&&(JSON.stringify(editing)!==JSON.stringify(baseline)||guestDraft.trim()!=="");
 useUnsavedChanges(dirty);
 async function checkAvailability(){
  if(!editing||!interval||!timing)return;
  const key=availabilityKey;
  setAvailability({key,message:"Consultando disponibilidade…"});
  try{
   const status=await request<{busy:boolean}>("/api/admin/google-calendar/availability","POST",{date:editing.date,time:editing.time??"",timing});
   setAvailability(previous=>previous?.key===key?{key,message:status.busy?"O calendário tem um horário ocupado nesse intervalo.":"O calendário está livre nesse intervalo."}:previous);
  }catch(error){
   setAvailability(previous=>previous?.key===key?{key,message:error instanceof Error?error.message:"Consulta de disponibilidade indisponível."}:previous);
  }
 }
 function discard(){return !working&&(!dirty||window.confirm("Descartar as alterações não salvas do compromisso?"));}
 function close(){if(discard())setEditing(null);}

 async function save(next:AgendaItem[]){
  if(working)return;
  setWorking(true);setError("");setMessage("");
  try{
   const {data:session,error:sessionError}=await supabase.auth.getSession();
   if(sessionError||!session.session?.access_token)throw new Error("Sessão expirada. Entre novamente.");
   if(!projectId&&session.session.user.id!==privateOwnerId)throw new Error("Sessão alterada. Reabra sua agenda.");
   const response=await fetch(projectId?"/api/admin/project/update":"/api/admin/agenda",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.session.access_token}`},body:JSON.stringify(projectId?{projectId,expectedUpdatedAt:updatedAt,data:{...projectData,operationalAgenda:next}}:{expectedUserId:privateOwnerId,expectedUpdatedAt:updatedAt,data:{operationalAgenda:next}}),cache:"no-store"});
   if(response.status===409)throw new Error("A agenda foi atualizada em outra sessão. Reabra antes de salvar.");
   if(!response.ok)throw new Error("Não foi possível atualizar a agenda autorizada.");
   const result=await response.json();
   const confirmedContainer=projectId?result?.project:result?.agenda;
   if(!confirmedContainer||typeof confirmedContainer.updated_at!=="string")throw new Error("A gravação não pôde ser confirmada.");
   onSaved(confirmedContainer.data as Data,confirmedContainer.updated_at);
   const selectedId=next.find(item=>!rows.some(old=>old.id===item.id))?.id??editing?.id;
   const confirmed=(confirmedContainer.data as Data).operationalAgenda?.find(item=>item.id===selectedId);
   setEditing(confirmed?{...confirmed}:null);setRecordMode(!!confirmed);setGuestDraft("");
   setMessage("Compromisso salvo. Você pode complementar o registro da reunião.");
  }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar agenda.");}
  finally{setWorking(false);}
 }
 function submit(){
  if(!editing)return;
  if(!projectId&&(!privateOwnerId||!privateReady)){setError("Sua agenda privada ainda não está disponível. Aguarde o carregamento ou reabra a agenda.");return;}
  const title=editing.title.trim();
  if(title.length<3||title.length>140){setError("Informe um título entre 3 e 140 caracteres.");return;}
  if((editing.notes??"").length>2000){setError("As observações devem ter no máximo 2.000 caracteres.");return;}
  if((editing.minutes??"").length>5000||(editing.internalNotes??"").length>5000){setError("Ata e notas internas devem ter no máximo 5.000 caracteres cada.");return;}
  if((editing.actionItems??[]).some(item=>item.title.trim().length<3||item.title.length>240||item.owner.length>120||(item.dueDate!==""&&!validOperationalDate(item.dueDate))||(item.relatedTaskId&&!tasks.some(t=>t.id===item.relatedTaskId)))){setError("Confira os encaminhamentos, responsáveis, prazos e tarefas vinculadas.");return;}

  if(editing.materialUrl){try{if(new URL(editing.materialUrl).protocol!=="https:"){setError("O material compartilhado precisa usar HTTPS.");return;}}catch{setError("Informe um link de material HTTPS válido.");return;}}

  if((editing.owner??"").length>120){setError("O responsável deve ter no máximo 120 caracteres.");return;}
  if(!validOperationalDate(editing.date)){setError("Informe uma data válida.");return;}
  if(editing.time&&!validOperationalTime(editing.time)){setError("Informe um horário válido.");return;}
  if(editing.meetingUrl){try{const url=new URL(editing.meetingUrl);if(url.protocol!=="https:"){setError("O link da reunião deve começar com HTTPS.");return;}}catch{setError("Informe um link HTTPS válido.");return;}}
  if(editing.relatedTaskId&&!tasks.some(t=>t.id===editing.relatedTaskId)){setError("A atividade vinculada não pertence ao projeto.");return;}
  if(timing&&!interval){setError("Confira o início, o término e o fuso horário. Um horário ambíguo ou inexistente não pode ser usado.");return;}
  if(overlapping&&!window.confirm("Já existe um compromisso nesta agenda que coincide com este horário. Salvar mesmo assim?"))return;
  const normalized=(editing.googleOptions||guestDraft.trim())?eventOptions(optionsWithDraft()):undefined;
  if(normalized===null){setError("Confira os endereços dos participantes, a recorrência e os lembretes.");return;}
  const value={...editing,...(!projectId?{visibleToClient:false,agendaVisibleToClient:false,minutesVisibleToClient:false,relatedTaskId:""}:{}),...(normalized?{googleOptions:normalized}:{}),...(interval?{duration:`${interval.minutes} min`}:{}),id:editing.id||crypto.randomUUID(),title,notes:(editing.notes??"").trim(),owner:(editing.owner??"").trim(),meetingUrl:(editing.meetingUrl??"").trim()};
  void save(editing.id?rows.map(x=>x.id===editing.id?value:x):[...rows,value]);
 }
 return <section id="agenda-operacional" className="rv-ui3-meeting-editor rv-ui3-meeting-quick mt-2 bg-white py-2">
  {!startNew&&<div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#323647]">Reuniões e acompanhamento</h2><p className="sr-only">Agenda de reuniões, retornos e marcos operacionais. Os registros não criam convites externos automaticamente.</p></div><button type="button" disabled={working} onClick={()=>{if(discard())newDraft();}} className="rounded-lg bg-[#6C5CE7] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#5949D1]">Novo compromisso</button></div>}
  {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="mt-4 text-sm text-emerald-800">{message}</p>}
  {!startNew&&<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-[#E3E6ED] py-2 text-xs text-[#687487]"><span>{ordered.filter(x=>x.status==="planned").length} agendados</span><span>{ordered.filter(x=>x.status==="completed").length} realizados</span><span>{ordered.filter(x=>x.status==="cancelled").length} cancelados</span></div>}
  {!startNew&&<div className="mt-5 divide-y divide-[#E3E7F0]">{ordered.length===0?<p className="text-sm text-[#697386]">Nenhum compromisso registrado.</p>:ordered.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{kinds[item.kind]} · {item.date}{item.time?` às ${item.time}`:""} · {item.status==="completed"?"Concluído":item.status==="cancelled"?"Cancelado":"Planejado"} · {item.owner||"Sem responsável"}</p>{item.relatedTaskId&&<p className="text-xs text-[#697386]">Atividade: {tasks.find(t=>t.id===item.relatedTaskId)?.title??"Referência indisponível"}</p>}{item.notes&&<p className="mt-1 text-xs text-[#697386]">{item.notes}</p>}{item.meetingUrl&&<a href={item.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#5949D1]">Abrir reunião ↗</a>}</div><div className="flex gap-2"><button type="button" disabled={working} onClick={()=>{if(discard()){setRecordMode(false);setGuestDraft("");setEditing({...item});}}} className="rounded-lg border px-3 py-2 text-xs">Editar</button><button type="button" disabled={working||!!item.googleLink||item.status==="completed"||!!item.minutes?.trim()} title={item.status==="completed"||!!item.minutes?.trim()?"Reuniões realizadas e atas registradas são preservadas no histórico.":"Excluir compromisso sem ata"} onClick={()=>{if(window.confirm("Excluir este compromisso sem ata?"))void save(rows.filter(x=>x.id!==item.id));}} className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-35">Excluir</button></div>
  {googleEnabled&&item.timing&&(!item.googleLink?.cancelled)&&(item.status!=="cancelled"||item.googleLink)&&<div className="flex w-full flex-wrap items-center gap-3">
   <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={invites[item.id]===true} disabled={working} onChange={e=>setInvites({...invites,[item.id]:e.target.checked})}/> Enviar convites ou atualizações aos participantes</label>
   <button type="button" disabled={working} onClick={()=>void sync(item)} className="rounded-lg border px-3 py-2 text-xs">Sincronizar com Google Calendar</button>
   <GoogleMeetLink key={item.googleLink?.meetUrl} link={item.googleLink}/>
   {conflict?.id===item.id&&<>
    {conflict.canPull&&<button type="button" disabled={working} onClick={()=>void sync(item,"pull")} className="rounded-lg border px-3 py-2 text-xs">Usar versão do Google</button>}
    {conflict.canPush&&<button type="button" disabled={working} onClick={()=>void sync(item,"push")} className="rounded-lg border px-3 py-2 text-xs">Usar versão da Rotevo</button>}
   </>}
  </div>}
 </div>)}</div>}
  {dirty&&<p role="status" className="rv-unsaved">Alterações não salvas no compromisso</p>}

  {editing&&<div className="rv-meeting-form space-y-3" aria-label={recordMode?"Registro do compromisso":"Agendamento do compromisso"}>
   {recordMode?<div className="space-y-3">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold">{editing.title}</h3><p className="mt-1 text-xs">{editing.date} {editing.time} · {editing.duration}</p></div><button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={()=>setRecordMode(false)}>Editar agendamento</button></div>
    {options.description&&<p className="whitespace-pre-wrap text-sm">{options.description}</p>}
    {editing.meetingUrl&&!options.meet&&<a href={editing.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">Abrir videoconferência</a>}
    {googleEnabled&&editing.timing&&!editing.googleLink?.cancelled&&(editing.status!=="cancelled"||editing.googleLink)&&<div className="flex flex-wrap items-center gap-2">   <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={invites[editing.id]===true} disabled={working} onChange={e=>setInvites({...invites,[editing.id]:e.target.checked})}/> Enviar convites ou atualizações aos participantes</label>
   <button type="button" disabled={working} onClick={()=>void sync(editing)} className="rounded-lg border px-3 py-2 text-xs">Sincronizar com Google Calendar</button>
   <GoogleMeetLink key={editing.googleLink?.meetUrl} link={editing.googleLink}/>
   {conflict?.id===editing.id&&<>
    {conflict.canPull&&<button type="button" disabled={working} onClick={()=>void sync(editing,"pull")} className="rounded-lg border px-3 py-2 text-xs">Usar versão do Google</button>}
    {conflict.canPush&&<button type="button" disabled={working} onClick={()=>void sync(editing,"push")} className="rounded-lg border px-3 py-2 text-xs">Usar versão da Rotevo</button>}
   </>}</div>}
    <h4 className="text-sm font-semibold">Registro da reunião</h4>
    <p className="text-xs text-[#687487]">Complete após o agendamento. Notas internas e histórico da ata permanecem exclusivos da equipe.</p>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-semibold sm:col-span-2">Pauta<textarea rows={3} maxLength={2000} value={editing.notes??""} onChange={e=>setEditing({...editing,notes:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>
     {projectId&&<label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={editing.agendaVisibleToClient!==false} onChange={e=>setEditing({...editing,agendaVisibleToClient:e.target.checked})}/>Permitir consulta da pauta quando o compromisso estiver compartilhado</label>}
     <label className="text-xs font-semibold sm:col-span-2">Link da ata ou materiais (HTTPS)<input type="url" maxLength={2048} value={editing.materialUrl??""} onChange={e=>setEditing({...editing,materialUrl:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>
      <label className="text-xs font-semibold sm:col-span-2">Ata e decisões<textarea rows={5} maxLength={5000} value={editing.minutes??""} onChange={e=>setEditing({...editing,minutes:e.target.value})} placeholder="Resumo da reunião, decisões tomadas e encaminhamentos com responsáveis e prazos" className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-3 text-sm"/></label>
 <div className="sm:col-span-2 border-t border-[#E3E6ED] pt-4">
  <div className="flex items-center justify-between gap-2"><div><h4 className="text-sm font-semibold text-[#323647]">Encaminhamentos</h4><p className="mt-1 text-xs text-[#687487]">Defina o que deve ser feito, responsável, prazo e a tarefa do projeto quando existir.</p></div><button type="button" disabled={(editing.actionItems??[]).length>=25} onClick={()=>setEditing({...editing,actionItems:[...(editing.actionItems??[]),{id:crypto.randomUUID(),title:"",owner:"",dueDate:""}]})} className="min-h-9 shrink-0 rounded-lg border border-[#E3E6ED] px-3 text-xs text-[#5949D1] disabled:opacity-40">+ Encaminhamento</button></div>
  {(editing.actionItems??[]).map((action,index)=><div key={action.id} className="mt-3 grid gap-2 border-b border-[#E3E6ED] pb-3 sm:grid-cols-2">
   <label className="text-xs font-medium sm:col-span-2">Ação<input maxLength={240} value={action.title} onChange={event=>setEditing({...editing,actionItems:(editing.actionItems??[]).map(item=>item.id===action.id?{...item,title:event.target.value}:item)})} placeholder="O que precisa ser realizado" className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-2 text-sm"/></label>
   <label className="text-xs font-medium">Responsável<input maxLength={120} value={action.owner} onChange={event=>setEditing({...editing,actionItems:(editing.actionItems??[]).map(item=>item.id===action.id?{...item,owner:event.target.value}:item)})} className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-2 text-sm"/></label>
   <label className="text-xs font-medium">Prazo<input type="date" value={action.dueDate} onChange={event=>setEditing({...editing,actionItems:(editing.actionItems??[]).map(item=>item.id===action.id?{...item,dueDate:event.target.value}:item)})} className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-2 text-sm"/></label>
   <label className="text-xs font-medium">Tarefa vinculada<select value={action.relatedTaskId??""} onChange={event=>setEditing({...editing,actionItems:(editing.actionItems??[]).map(item=>item.id===action.id?{...item,relatedTaskId:event.target.value}:item)})} className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-2 text-sm"><option value="">Sem vínculo</option>{tasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
   <div className="flex items-end justify-end"><button type="button" onClick={()=>setEditing({...editing,actionItems:(editing.actionItems??[]).filter(item=>item.id!==action.id)})} className="min-h-9 rounded-lg px-3 text-xs text-[#A3223D] hover:bg-red-50">Remover {index+1}</button></div>
  </div>)}
 </div>
 {(editing.minutesHistory??[]).length>0&&<details className="sm:col-span-2 border-t border-[#E3E6ED] pt-3"><summary className="cursor-pointer text-xs font-semibold text-[#5949D1]">Histórico interno das versões da ata ({(editing.minutesHistory??[]).length})</summary><div className="mt-3 space-y-3">{[...(editing.minutesHistory??[])].reverse().map((revision,index)=><div key={revision.version+"-"+revision.changedAt+"-"+index} className="border-b border-[#E3E6ED] pb-3"><p className="text-xs font-medium text-[#323647]">Versão {revision.version} · {new Date(revision.changedAt).toLocaleString("pt-BR")}</p><p className="mt-1 whitespace-pre-wrap text-sm text-[#687487]">{revision.text||"Ata esvaziada nesta revisão"}</p></div>)}</div></details>}
 <label className="text-xs font-semibold sm:col-span-2">Notas internas da equipe (não compartilhadas)<textarea rows={3} maxLength={5000} value={editing.internalNotes??""} onChange={e=>setEditing({...editing,internalNotes:e.target.value})} placeholder="Registros operacionais e observações internas" className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-3 text-sm"/></label>
 {projectId&&<label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={editing.minutesVisibleToClient!==false} onChange={e=>setEditing({...editing,minutesVisibleToClient:e.target.checked})}/>Permitir que o cliente consulte esta ata (quando o compromisso também estiver compartilhado)</label>}
    </div>
   </div>:<>
    <label className="block"><span className="sr-only">Título</span><input autoFocus value={editing.title} placeholder="Adicionar título" maxLength={140} onChange={e=>setEditing({...editing,title:e.target.value})} className="w-full rounded-lg border-0 border-b px-2 py-2 text-xl font-medium focus-visible:outline-2 focus-visible:outline-[#6C5CE7]"/></label>
    <label className="block text-xs"><span className="sr-only">Tipo</span><select aria-label="Tipo" value={editing.kind} onChange={e=>setEditing({...editing,kind:e.target.value as AgendaItem["kind"]})} className="ml-8 rounded-lg border px-3 py-1.5 text-xs">{Object.entries(kinds).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <div className="rv-meeting-line"><RotevoTablerIcon name="clock" size={19}/><div className="space-y-2">
     <div className="grid grid-cols-2 gap-2">
      <label className="text-xs">Data<input type="date" value={editing.date} onChange={e=>setEditing({...editing,date:e.target.value,...(timing&&timing.endDate===editing.date?{timing:{...timing,endDate:e.target.value}}:{})})} className="mt-1 w-full rounded-lg border p-2"/></label>
      <label className="text-xs">{timing?"Horário de início":"Horário (opcional)"}<input disabled={timing?.allDay} type="time" value={editing.time??""} onChange={e=>setEditing({...editing,time:e.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label>
      {timing?<><label className="text-xs">Data de término<input type="date" value={timing.endDate} onChange={e=>setEditing({...editing,timing:{...timing,endDate:e.target.value}})} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs">Horário de término<input type="time" disabled={timing.allDay} value={timing.endTime} onChange={e=>setEditing({...editing,timing:{...timing,endTime:e.target.value}})} className="mt-1 w-full rounded-lg border p-2"/></label></>:<button type="button" className="col-span-2 text-left text-xs underline" onClick={()=>setEditing({...editing,timing:{endDate:editing.date,endTime:"",timeZone:defaultMeetingZone,allDay:false}})}>Definir término e fuso horário</button>}
     </div>
     {timing&&<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={timing.allDay} onChange={e=>setEditing({...editing,timing:{...timing,allDay:e.target.checked}})}/>Dia inteiro</label><details><summary className="cursor-pointer text-[#5949D1]">Fuso horário · {timing.timeZone}</summary><label className="mt-2 block">Fuso horário (IANA)<input value={timing.timeZone} maxLength={100} onChange={e=>setEditing({...editing,timing:{...timing,timeZone:e.target.value}})} className="mt-1 w-full rounded-lg border p-2"/></label></details>{interval&&<span>Duração: {interval.minutes} minutos</span>}</div>}
     {overlapping&&<p role="status" className="text-xs">Há outro compromisso nesta agenda no mesmo horário.</p>}
    </div></div>
    <div className="rv-meeting-line"><RotevoTablerIcon name="users" size={19}/><div>
     <div className="flex flex-wrap gap-1">{[...options.guests.map(email=>({email,optional:false})),...(options.optionalGuests??[]).map(email=>({email,optional:true}))].map(guest=><span key={guest.email} className="rv-meeting-guest inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-1 text-xs"><span className="truncate">{guest.email}</span><button type="button" aria-label={"Classificar "+guest.email+" como "+(guest.optional?"obrigatório":"opcional")} className="underline" onClick={()=>changeOptions({guests:guest.optional?[...options.guests,guest.email]:options.guests.filter(email=>email!==guest.email),optionalGuests:guest.optional?(options.optionalGuests??[]).filter(email=>email!==guest.email):[...(options.optionalGuests??[]),guest.email]})}>{guest.optional?"Opcional":"Obrigatório"}</button><button type="button" aria-label={"Remover "+guest.email} onClick={()=>changeOptions({guests:options.guests.filter(email=>email!==guest.email),optionalGuests:(options.optionalGuests??[]).filter(email=>email!==guest.email)})}><RotevoTablerIcon name="x" size={15}/></button></span>)}</div>
     <div className="flex flex-wrap items-center gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Adicionar convidados</span><input type="email" value={guestDraft} placeholder="Adicionar convidados" onChange={e=>setGuestDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addGuest();}}} className="w-full rounded-lg border p-2 text-sm"/></label><select aria-label="Tipo do novo convidado" value={guestOptional?"optional":"required"} onChange={e=>setGuestOptional(e.target.value==="optional")} className="rounded-lg border p-2 text-xs"><option value="required">Obrigatório</option><option value="optional">Opcional</option></select><button type="button" disabled={!guestDraft.trim()} className="rounded-lg border px-2 py-2 text-xs disabled:opacity-40" onClick={addGuest}>Adicionar</button></div>
     <p className="mt-1 text-[11px] text-[#687487]">Salvar não envia convites. O envio exige confirmação ao sincronizar.</p>
    </div></div>
    <fieldset className="rv-meeting-line"><legend className="sr-only">Videoconferência</legend><RotevoTablerIcon name="external-link" size={19}/><div className="space-y-2">
     {googleEnabled&&<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={options.meet} onChange={e=>setEditing({...editing,googleOptions:{...options,meet:e.target.checked},...(e.target.checked&&!timing?{timing:{endDate:editing.date,endTime:"",timeZone:defaultMeetingZone,allDay:false}}:{})})}/>Gerar link do Google Meet</label>}
     {googleEnabled&&options.meet?<><p className="text-xs text-[#697386]">{editing.googleLink?.meetUrl?"Link confirmado pelo Google para este compromisso.":"Salve o compromisso e use Sincronizar com Google Calendar para solicitar o link."}</p><GoogleMeetLink key={editing.googleLink?.meetUrl} link={editing.googleLink}/></>:<label className="block"><span className="sr-only">Link da reunião (opcional)</span><input type="url" placeholder="Adicionar link de videoconferência" value={editing.meetingUrl??""} onChange={e=>setEditing({...editing,meetingUrl:e.target.value})} className="w-full rounded-lg border p-2 text-sm"/></label>}
    </div></fieldset>
    <div className="rv-meeting-line"><RotevoTablerIcon name="flag" size={19}/><label><span className="sr-only">Local</span><input placeholder="Adicionar local" value={editing.location??""} maxLength={180} onChange={e=>setEditing({...editing,location:e.target.value})} className="w-full rounded-lg border p-2 text-sm"/></label></div>
    <div className="rv-meeting-line"><RotevoTablerIcon name="report" size={19}/><label><span className="sr-only">Descrição</span><textarea rows={2} placeholder="Adicionar descrição" value={options.description} maxLength={2000} onChange={e=>changeOptions({description:e.target.value})} className="w-full resize-y rounded-lg border p-2 text-sm"/></label></div>
    <details className="rv-meeting-more ml-8">
     <summary className="cursor-pointer py-1 text-xs font-semibold text-[#5949D1]">Mais opções</summary>
     <div className="mt-3 space-y-3">
      {!editing.id&&projectPicker}
      {!projectId&&<p className="text-xs text-[#687487]">Somente na sua agenda. Não será exibido em projetos ou portais de clientes.</p>}
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Situação<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as AgendaItem["status"]})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="planned">Planejado</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select></label><label className="text-xs">Responsável<input maxLength={120} value={editing.owner??""} onChange={e=>setEditing({...editing,owner:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label></div>
      {tasks.length>0&&<label className="block text-xs">Atividade vinculada<select value={editing.relatedTaskId??""} onChange={e=>setEditing({...editing,relatedTaskId:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Nenhuma</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>}
      <label className="block text-xs">Modalidade<select value={editing.modality??"online"} onChange={e=>setEditing({...editing,modality:e.target.value as "online"|"presencial"})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="online">Online</option><option value="presencial">Presencial</option></select></label>
      {projectId&&<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.visibleToClient===true} onChange={e=>setEditing({...editing,visibleToClient:e.target.checked})}/>Compartilhar compromisso com o cliente</label>}
      {projectId&&<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.agendaVisibleToClient!==false} onChange={e=>setEditing({...editing,agendaVisibleToClient:e.target.checked})}/>Permitir consulta da pauta quando o compromisso estiver compartilhado</label>}
      {googleEnabled&&<><GoogleCalendarConnection/><p className="text-xs text-[#687487]">Sincronização somente por ação explícita após salvar.</p>
       <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Privacidade<select value={options.visibility??"private"} onChange={e=>changeOptions({visibility:e.target.value as EventOptions["visibility"]})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="private">Privado</option><option value="default">Padrão do calendário</option><option value="public">Público</option></select></label><label className="text-xs">Disponibilidade<select value={options.availability??"opaque"} onChange={e=>changeOptions({availability:e.target.value as EventOptions["availability"]})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="opaque">Ocupado</option><option value="transparent">Livre</option></select></label></div>
         <label className="block text-xs font-semibold">Recorrência
   <select value={options.recurrence.replace(/^RRULE:FREQ=/,"").split(";")[0]} onChange={e=>changeOptions({recurrence:e.target.value?"RRULE:FREQ="+e.target.value:""})} className="mt-1 rounded-lg border p-2">
    <option value="">Não repetir</option>
    {recurrenceOptions.map((frequency,index)=><option key={frequency} value={frequency}>{["Diária","Semanal","Mensal","Anual"][index]}</option>)}
   </select>
  </label>
  {options.recurrence&&<label className="block text-xs font-semibold">Intervalo da repetição
   <input type="number" min={1} max={100} value={options.recurrence.match(/;INTERVAL=(\d+)/)?.[1]??"1"} onChange={e=>{
    const count=options.recurrence.match(/;COUNT=(\d+)/)?.[0]??"";
    changeOptions({recurrence:options.recurrence.split(";")[0]+(e.target.value&&e.target.value!=="1"?";INTERVAL="+e.target.value:"")+count});
   }} className="ml-2 rounded border p-2"/>
  </label>}
  {options.recurrence&&<label className="block text-xs font-semibold">Número de ocorrências (opcional)
   <input type="number" min={1} max={400} value={options.recurrence.split(";COUNT=")[1]??""} onChange={e=>changeOptions({recurrence:options.recurrence.split(";COUNT=")[0]+(e.target.value?";COUNT="+e.target.value:"")})} className="ml-2 rounded border p-2"/>
  </label>}
  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={options.reminders===null} onChange={e=>changeOptions({reminders:e.target.checked?null:[]})}/> Usar lembretes padrão do calendário</label>
  {options.reminders!==null&&<>
   {options.reminders.map((reminder,index)=><div key={index} className="flex flex-wrap items-center gap-2 text-xs">
    <label>Tipo de lembrete <select value={reminder.method} onChange={e=>changeOptions({reminders:options.reminders!.map((item,i)=>i===index?{...item,method:e.target.value as "popup"|"email"}:item)})} className="rounded border p-2"><option value="popup">Notificação</option><option value="email">E-mail</option></select></label>
    <label>Minutos antes <input type="number" min={0} max={40320} value={reminder.minutes} onChange={e=>changeOptions({reminders:options.reminders!.map((item,i)=>i===index?{...item,minutes:e.target.value===""?-1:Number(e.target.value)}:item)})} className="w-24 rounded border p-2"/></label>
    <button type="button" onClick={()=>changeOptions({reminders:options.reminders!.filter((_,i)=>i!==index)})}>Remover lembrete</button>
   </div>)}
   {options.reminders.length<5&&<button type="button" className="rounded border px-3 py-2 text-xs" onClick={()=>changeOptions({reminders:[...options.reminders!,{method:"popup",minutes:10}]})}>Adicionar lembrete</button>}
  </>}
       <p className="text-xs text-[#687487]">As alterações de recorrência se aplicam à série inteira. A edição de uma ocorrência isolada permanece indisponível.</p>
       {interval&&<div><button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={()=>void checkAvailability()}>Verificar disponibilidade no Google</button>{availability?.key===availabilityKey&&<p role="status" className="mt-1 text-xs">{availability.message}</p>}</div>}
      </>}
     </div>
    </details>
   </>}
   <div className="flex flex-wrap justify-end gap-2 pt-2">{editing.id&&!recordMode&&<button type="button" onClick={()=>setRecordMode(true)} className="mr-auto rounded-lg border px-3 py-2 text-xs">Registro da reunião</button>}<button type="button" disabled={working} onClick={close} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm"><RotevoTablerIcon name="x" size={17}/>Cancelar</button><button type="button" disabled={working} onClick={submit} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><RotevoTablerIcon name="check" size={17}/>{working?"Salvando…":recordMode?"Salvar registro":"Salvar compromisso"}</button></div>
  </div>}
 </section>;
}
