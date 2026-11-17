"use client";
import {useMemo,useState} from "react";
import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import {request} from "@/lib/operations/api";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {defaultMeetingZone,meetingInterval,meetingIntervalsOverlap,type MeetingTiming} from "@/lib/googleCalendar/meetingTiming";
import {emptyEventOptions,eventOptions,recurrenceOptions,type EventLink,type EventOptions} from "@/lib/googleCalendar/eventSync";
import {validOperationalDate,validOperationalTime} from "@/lib/security/executionDependencyValidation";

export type MeetingActionItem={id:string;title:string;owner:string;dueDate:string;relatedTaskId?:string};
export type MinutesRevision={version:number;text:string;changedAt:string;changedBy:string};
export type AgendaItem={id:string;title:string;kind:"meeting"|"followup"|"checkpoint";date:string;time?:string;status:"planned"|"completed"|"cancelled";notes?:string;owner?:string;relatedTaskId?:string;meetingUrl?:string;visibleToClient?:boolean;modality?:"online"|"presencial";location?:string;duration?:string;minutes?:string;internalNotes?:string;minutesVisibleToClient?:boolean;actionItems?:MeetingActionItem[];minutesHistory?:MinutesRevision[];materialUrl?:string;timing?:MeetingTiming;googleOptions?:EventOptions;googleLink?:EventLink};
type Data={operationalAgenda?:AgendaItem[];executionTimeline?:{id:string;title:string}[]};
const empty:AgendaItem={id:"",title:"",kind:"meeting",date:"",time:"",status:"planned",notes:"",owner:"",relatedTaskId:"",meetingUrl:"",visibleToClient:false,modality:"online",location:"",duration:"",minutes:"",internalNotes:"",minutesVisibleToClient:false,actionItems:[],materialUrl:""};
const kinds={meeting:"Reunião",followup:"Acompanhamento",checkpoint:"Marco de controle"};
export default function OperationalAgenda({projectId,projectData,updatedAt,onSaved,startNew=false}:{projectId:string;projectData:Data;updatedAt:string;onSaved:(data:Data,updatedAt:string)=>void;startNew?:boolean}){
 const [editing,setEditing]=useState<AgendaItem|null>(startNew?{...empty}:null),[working,setWorking]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const googleEnabled=process.env.NEXT_PUBLIC_ROTEVO_GOOGLE_CALENDAR_ENABLED==="true";
 const [invites,setInvites]=useState<Record<string,boolean>>({});
 const [conflict,setConflict]=useState<{id:string;token:string;canPush:boolean;canPull:boolean}|null>(null);
 const options=editing?.googleOptions??emptyEventOptions;
 const changeOptions=(changes:Partial<EventOptions>)=>{if(editing)setEditing({...editing,googleOptions:{...options,...changes}});};
 async function sync(item:AgendaItem,action:"sync"|"pull"|"push"="sync"){
  if(working||!discard())return;
  setWorking(true);setError("");setMessage("");
  try{
   const result=await request<{project?:{data:Data;updated_at:string};conflict?:boolean;conflictToken?:string;canPush?:boolean;canPull?:boolean;error?:string}>(
    "/api/admin/google-calendar/events","POST",{projectId,meetingId:item.id,expectedUpdatedAt:updatedAt,action,notify:invites[item.id]===true,
     ...(action==="sync"?{}:{conflictToken:conflict?.token})});
   if(result.conflict&&result.conflictToken){
    setConflict({id:item.id,token:result.conflictToken,canPush:result.canPush===true,canPull:result.canPull===true});
    setError(result.error??"Foram detectadas alterações nos dois sistemas.");
   }else if(result.project){
    onSaved(result.project.data,result.project.updated_at);
    setConflict(null);setEditing(null);setMessage("Compromisso sincronizado com o Google Calendar.");
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
 const baseline=editing?.id?rows.find(row=>row.id===editing.id):empty;
 const dirty=!!editing&&JSON.stringify(editing)!==JSON.stringify(baseline);
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
   const response=await fetch("/api/admin/project/update",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.session.access_token}`},body:JSON.stringify({projectId,expectedUpdatedAt:updatedAt,data:{...projectData,operationalAgenda:next}}),cache:"no-store"});
   if(response.status===409)throw new Error("O projeto foi atualizado em outra sessão. Recarregue antes de salvar.");
   if(!response.ok)throw new Error("Não foi possível atualizar a agenda autorizada.");
   const result=await response.json();
   if(!result?.project||typeof result.project.updated_at!=="string")throw new Error("A gravação não pôde ser confirmada.");
   onSaved(result.project.data as Data,result.project.updated_at);
   setEditing(null);setMessage("Agenda operacional atualizada.");
  }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar agenda.");}
  finally{setWorking(false);}
 }
 function submit(){
  if(!editing)return;
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
  if(overlapping&&!window.confirm("Já existe um compromisso neste projeto que coincide com este horário. Salvar mesmo assim?"))return;
  const normalized=editing.googleOptions?eventOptions({...options,guests:options.guests.map(value=>value.trim()).filter(Boolean),optionalGuests:(options.optionalGuests??[]).map(value=>value.trim()).filter(Boolean)}):undefined;
  if(normalized===null){setError("Confira os endereços dos participantes, a recorrência e os lembretes.");return;}
  const value={...editing,...(normalized?{googleOptions:normalized}:{}),...(interval?{duration:`${interval.minutes} min`}:{}),id:editing.id||crypto.randomUUID(),title,notes:(editing.notes??"").trim(),owner:(editing.owner??"").trim(),meetingUrl:(editing.meetingUrl??"").trim()};
  void save(editing.id?rows.map(x=>x.id===editing.id?value:x):[...rows,value]);
 }
 return <section id="agenda-operacional" className="rv-ui3-meeting-editor mt-4 bg-white py-3">
  {!startNew&&<div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#323647]">Reuniões e acompanhamento</h2><p className="sr-only">Agenda de reuniões, retornos e marcos operacionais. Os registros não criam convites externos automaticamente.</p></div><button type="button" disabled={working} onClick={()=>{if(discard())setEditing({...empty});}} className="rounded-lg bg-[#6C5CE7] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#5949D1]">Novo compromisso</button></div>}
  {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="mt-4 text-sm text-emerald-800">{message}</p>}
  {!startNew&&<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-[#E3E6ED] py-2 text-xs text-[#687487]"><span>{ordered.filter(x=>x.status==="planned").length} agendados</span><span>{ordered.filter(x=>x.status==="completed").length} realizados</span><span>{ordered.filter(x=>x.status==="cancelled").length} cancelados</span></div>}
  {!startNew&&<div className="mt-5 divide-y divide-[#E3E7F0]">{ordered.length===0?<p className="text-sm text-[#697386]">Nenhum compromisso registrado.</p>:ordered.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{kinds[item.kind]} · {item.date}{item.time?` às ${item.time}`:""} · {item.status==="completed"?"Concluído":item.status==="cancelled"?"Cancelado":"Planejado"} · {item.owner||"Sem responsável"}</p>{item.relatedTaskId&&<p className="text-xs text-[#697386]">Atividade: {tasks.find(t=>t.id===item.relatedTaskId)?.title??"Referência indisponível"}</p>}{item.notes&&<p className="mt-1 text-xs text-[#697386]">{item.notes}</p>}{item.meetingUrl&&<a href={item.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#5949D1]">Abrir reunião ↗</a>}</div><div className="flex gap-2"><button type="button" disabled={working} onClick={()=>{if(discard())setEditing({...item});}} className="rounded-lg border px-3 py-2 text-xs">Editar</button><button type="button" disabled={working||!!item.googleLink||item.status==="completed"||!!item.minutes?.trim()} title={item.status==="completed"||!!item.minutes?.trim()?"Reuniões realizadas e atas registradas são preservadas no histórico.":"Excluir compromisso sem ata"} onClick={()=>{if(window.confirm("Excluir este compromisso sem ata?"))void save(rows.filter(x=>x.id!==item.id));}} className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-35">Excluir</button></div>
  {googleEnabled&&item.timing&&(!item.googleLink?.cancelled)&&(item.status!=="cancelled"||item.googleLink)&&<div className="flex w-full flex-wrap items-center gap-3">
   <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={invites[item.id]===true} disabled={working} onChange={e=>setInvites({...invites,[item.id]:e.target.checked})}/> Enviar convites ou atualizações aos participantes</label>
   <button type="button" disabled={working} onClick={()=>void sync(item)} className="rounded-lg border px-3 py-2 text-xs">Sincronizar com Google Calendar</button>
   {item.googleLink?.meetUrl&&<a href={item.googleLink.meetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#5949D1]">Abrir Google Meet</a>}
   {!item.googleLink?.meetUrl&&item.googleLink?.meetStatus&&<span className="text-xs">{item.googleLink.meetStatus==="pending"?"Google Meet em preparação":"Confira a disponibilidade do Google Meet no calendário."}</span>}
   {conflict?.id===item.id&&<>
    {conflict.canPull&&<button type="button" disabled={working} onClick={()=>void sync(item,"pull")} className="rounded-lg border px-3 py-2 text-xs">Usar versão do Google</button>}
    {conflict.canPush&&<button type="button" disabled={working} onClick={()=>void sync(item,"push")} className="rounded-lg border px-3 py-2 text-xs">Usar versão da Rotevo</button>}
   </>}
  </div>}
 </div>)}</div>}
  {dirty&&<p role="status" className="rv-unsaved">Alterações não salvas no compromisso</p>}
  {editing&&<div className="mt-4 grid gap-4 rounded-xl border border-[#E3E7F0] bg-[#FAFBFD] p-4 sm:grid-cols-2 sm:p-5"><label className="text-xs font-semibold">Título<input value={editing.title} maxLength={140} onChange={e=>setEditing({...editing,title:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold">Data<input type="date" value={editing.date} onChange={e=>setEditing({...editing,date:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold">{timing?"Horário de início":"Horário (opcional)"}<input disabled={timing?.allDay} type="time" value={editing.time??""} onChange={e=>setEditing({...editing,time:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><fieldset className="space-y-3 rounded-lg border p-3 sm:col-span-2"><legend className="px-1 text-xs font-semibold">Data e horário do compromisso</legend>
 {timing?<><div className="grid gap-3 sm:grid-cols-3">
 <label className="text-xs font-semibold">Data de término<input type="date" value={timing.endDate} onChange={e=>setEditing({...editing,timing:{...timing,endDate:e.target.value}})} className="mt-1 w-full rounded-lg border p-2"/></label>
 <label className="text-xs font-semibold">Horário de término<input type="time" disabled={timing.allDay} value={timing.endTime} onChange={e=>setEditing({...editing,timing:{...timing,endTime:e.target.value}})} className="mt-1 w-full rounded-lg border p-2"/></label>
 <label className="text-xs font-semibold">Fuso horário (IANA)<input value={timing.timeZone} maxLength={100} onChange={e=>setEditing({...editing,timing:{...timing,timeZone:e.target.value}})} className="mt-1 w-full rounded-lg border p-2"/></label>
 </div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={timing.allDay} onChange={e=>setEditing({...editing,time:e.target.checked?"":editing.time,timing:{...timing,allDay:e.target.checked,endTime:e.target.checked?"":timing.endTime}})}/>Dia inteiro</label>
 {interval&&<p className="text-xs">Duração: {interval.minutes} minutos</p>}
 {process.env.NEXT_PUBLIC_ROTEVO_GOOGLE_CALENDAR_ENABLED==="true"&&interval&&<div>
  <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={()=>void checkAvailability()}>Verificar disponibilidade no Google</button>
  {availability?.key===availabilityKey&&<p role="status" className="mt-1 text-xs">{availability.message}</p>}
 </div>}
 {overlapping&&<p role="status" className="text-xs">Há outro compromisso neste projeto no mesmo horário.</p>}
 <button type="button" onClick={()=>setEditing({...editing,timing:undefined})} className="rounded-lg border px-3 py-2 text-xs">Remover horário de término</button></>:
 <button type="button" onClick={()=>setEditing({...editing,timing:{endDate:editing.date,endTime:"",timeZone:defaultMeetingZone,allDay:false}})} className="rounded-lg border px-3 py-2 text-xs">Definir término e fuso horário</button>}
 </fieldset>
 {googleEnabled&&timing&&<fieldset className="space-y-3 rounded-lg border p-3 sm:col-span-2">
  <legend className="px-1 text-xs font-semibold">Google Calendar</legend>
  <label className="block text-xs font-semibold">Descrição no Google Calendar
   <textarea value={options.description} maxLength={2000} onChange={e=>changeOptions({description:e.target.value})} className="mt-1 w-full rounded-lg border p-2"/>
  </label>
  <label className="block text-xs font-semibold">Participantes separados por vírgula
   <input value={options.guests.join(",")} onChange={e=>changeOptions({guests:e.target.value.split(",")})} className="mt-1 w-full rounded-lg border p-2"/>
  </label>
  <label className="block text-xs font-semibold">Participantes opcionais separados por vírgula
   <input value={(options.optionalGuests??[]).join(",")} onChange={e=>changeOptions({optionalGuests:e.target.value.split(",")})} className="mt-1 w-full rounded-lg border p-2"/>
  </label>
  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={options.meet} onChange={e=>changeOptions({meet:e.target.checked})}/> Gerar link do Google Meet</label>
  <div className="grid gap-3 sm:grid-cols-2">
   <label className="block text-xs font-semibold">Visibilidade no Google
    <select value={options.visibility??"private"} onChange={e=>changeOptions({visibility:e.target.value as EventOptions["visibility"]})} className="mt-1 w-full rounded-lg border p-2">
     <option value="private">Privado</option><option value="default">Padrão do calendário</option><option value="public">Público</option>
    </select>
   </label>
   <label className="block text-xs font-semibold">Disponibilidade no Google
    <select value={options.availability??"opaque"} onChange={e=>changeOptions({availability:e.target.value as EventOptions["availability"]})} className="mt-1 w-full rounded-lg border p-2">
     <option value="opaque">Ocupado</option><option value="transparent">Livre</option>
    </select>
   </label>
  </div>
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
 </fieldset>}
 <label className="text-xs font-semibold">Tipo<select value={editing.kind} onChange={e=>setEditing({...editing,kind:e.target.value as AgendaItem["kind"]})} className="mt-1 w-full rounded-lg border p-2 text-sm">{Object.entries(kinds).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label className="text-xs font-semibold">Situação<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as AgendaItem["status"]})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="planned">Planejado</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select></label><label className="text-xs font-semibold">Responsável<input value={editing.owner??""} maxLength={120} onChange={e=>setEditing({...editing,owner:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold">Atividade vinculada<select value={editing.relatedTaskId??""} onChange={e=>setEditing({...editing,relatedTaskId:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Nenhuma</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label className="text-xs font-semibold sm:col-span-2">Link da reunião (opcional)<input type="url" placeholder="https://meet.google.com/..." value={editing.meetingUrl??""} onChange={e=>setEditing({...editing,meetingUrl:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold sm:col-span-2">Observações<textarea rows={3} maxLength={2000} value={editing.notes??""} onChange={e=>setEditing({...editing,notes:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold">Modalidade<select value={editing.modality??"online"} onChange={e=>setEditing({...editing,modality:e.target.value as "online"|"presencial"})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="online">Online</option><option value="presencial">Presencial</option></select></label>{([{key:"location",label:"Local ou plataforma",max:180},{key:"duration",label:"Duração",max:60},{key:"materialUrl",label:"Link da ata ou materiais (HTTPS)",max:2048}] as const).map(f=><label key={f.key} className="text-xs font-semibold">{f.label}<input value={f.key==="duration"&&timing?(interval?`${interval.minutes} min`:""):(editing[f.key]??"")} maxLength={f.max} readOnly={f.key==="duration"&&!!timing} onChange={e=>setEditing({...editing,[f.key]:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>)}<div className="sm:col-span-2 border-t border-[#E3E6ED] pt-4"><h4 className="text-sm font-semibold text-[#323647]">Registro da reunião</h4><p className="mt-1 text-xs text-[#687487]">Pauta e ata compartilháveis são diferentes das notas exclusivas da equipe. Identifique decisões e encaminhamentos com responsável e prazo.</p></div>
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
 <label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={editing.minutesVisibleToClient!==false} onChange={e=>setEditing({...editing,minutesVisibleToClient:e.target.checked})}/>Permitir que o cliente consulte esta ata (quando o compromisso também estiver compartilhado)</label><label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={editing.visibleToClient===true} onChange={e=>setEditing({...editing,visibleToClient:e.target.checked})}/>Compartilhar compromisso e pauta com o cliente (ata controlada separadamente)</label><div className="flex flex-wrap justify-end gap-2 border-t border-[#E3E6ED] pt-4 sm:col-span-2"><button type="button" disabled={working} onClick={close} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#DDE2EC] bg-white px-4 py-2 text-sm font-medium text-[#525B70] hover:bg-[#F6F7FB]"><RotevoTablerIcon name="x" size={17}/> Cancelar</button><button type="button" disabled={working} onClick={submit} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5949D1] disabled:opacity-60"><RotevoTablerIcon name="check" size={17}/> Salvar compromisso</button></div></div>}
 </section>;
}
