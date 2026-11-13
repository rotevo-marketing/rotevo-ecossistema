"use client";
import {useEffect,useMemo,useState} from "react";
import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import DialogFocus from "@/Components/ui/DialogFocus";
import {supabase} from "@/lib/supabase";
import {validOperationalDate} from "@/lib/security/executionDependencyValidation";
import {ContentTablerIcon} from "@/Components/ContentTablerIcon";
import {request} from "@/lib/operations/api";
import {TaskDropdown} from "@/Components/admin/TaskGridCells";
import {editorialChannels,editorialChannelIcon} from "@/lib/editorial/channels";
import EditorialApprovalsPanel from "@/Components/admin/EditorialApprovalsPanel";
import ProjectConversation from "@/Components/shared/ProjectConversation";
import EditorialCalendar,{type EditorialItem,type EditorialProject,editorialStatuses} from "@/Components/cliente/EditorialCalendar";
type Client={id:string;name:string;slug:string;cover_image_url?:string|null};
type Project=Omit<EditorialProject,"data"> & {updated_at:string;clients:Client|Client[]|null;data:{editorialCalendar?:EditorialItem[];executionTimeline?:{id:string;title:string}[]}|null};
const blank:EditorialItem={id:"",title:"",channel:"Instagram",format:"Reels",publishDate:"",caption:"",driveUrl:"",version:"01",status:"idea",visibleToClient:false};
function client(p:Project){return Array.isArray(p.clients)?p.clients[0]:p.clients;}
function safe(u:string){if(!u)return true;try{return new URL(u).protocol==="https:";}catch{return false;}}
export default function EditorialManager({projects,onChanged}:{projects:Project[];onChanged:(id:string,data:Project["data"],updatedAt:string)=>void}){
 const [projectId,setProjectId]=useState(""),[editing,setEditing]=useState<EditorialItem|null>(null);
 const [members,setMembers]=useState<{user_id:string;display_name:string;avatar_url?:string|null}[]>([]);
 const [clientPhotos,setClientPhotos]=useState<Record<string,string>>({});
 useEffect(()=>{let alive=true;void(async()=>{
  const team=await supabase.from("team_members").select("user_id,display_name").eq("active",true).order("display_name");
  if(!alive)return;setMembers(team.error?[]:(team.data??[]));
  try{const directory=await request<{members:{user_id:string;display_name:string;avatar_url:string|null}[]}>("/api/team/directory");if(alive&&directory.members?.length){const avatars=new Map(directory.members.map(m=>[m.user_id,m.avatar_url]));setMembers(prev=>prev.map(m=>({...m,avatar_url:avatars.get(m.user_id)??null})));}}catch{/* Photos unavailable: keep safe initials fallback. */}
  try{const response=await request<{clients:{id:string;cover_image_url:string|null}[]}>("/api/admin/clients");const photos:Record<string,string>={};const assets:{id:string;asset:string}[]=[];for(const row of response.clients){if(row.cover_image_url?.startsWith("https://"))photos[row.id]=row.cover_image_url;else if(row.cover_image_url?.startsWith("asset://"))assets.push({id:row.id,asset:row.cover_image_url.slice(8)});}if(assets.length){const resolved=await request<{links:Record<string,string>}>("/api/assets/resolve","POST",{ids:[...new Set(assets.map(x=>x.asset))]});for(const a of assets)if(resolved.links[a.asset])photos[a.id]=resolved.links[a.asset];}if(alive)setClientPhotos(photos);}catch{/* Keep photo fallback without widening permissions. */}
 })();return()=>{alive=false};},[]);
 const [saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [focusItem,setFocusItem]=useState<{projectId:string;contentId:string;channel:string;publishDate:string;nonce:number}|undefined>();
 const project=projects.find(p=>p.id===projectId);
 const items=useMemo(()=>Array.isArray(project?.data?.editorialCalendar)?project.data.editorialCalendar:[],[project]);
 const baseline=editing?.id?items.find(item=>item.id===editing.id):blank;
 const dirty=!!editing&&JSON.stringify(editing)!==JSON.stringify(baseline);
 useUnsavedChanges(dirty);
 function discard(){return !saving&&(!dirty||window.confirm("Descartar as alterações não salvas do conteúdo?"));}
 function close(){if(discard())setEditing(null);}
 const [decisions,setDecisions]=useState<{content_id:string;content_version:string;decision:"approved"|"changes_requested"}[]>([]);
 const [ideaDecisions,setIdeaDecisions]=useState<typeof decisions>([]);
 const [approvalError,setApprovalError]=useState(false);
 useEffect(()=>{let mounted=true;async function load(){
  if(!projectId){setDecisions([]);setIdeaDecisions([]);setApprovalError(false);return;}
  const {data,error}=await supabase.from("editorial_approvals").select("content_id,content_version,decision").eq("project_id",projectId);
  const ideas=await supabase.from("editorial_idea_approvals").select("content_id,content_version,decision").eq("project_id",projectId);
  if(!mounted)return;
  setApprovalError(!!error||!!ideas.error);setDecisions(error?[]:(data??[]) as typeof decisions);setIdeaDecisions(ideas.error?[]:(ideas.data??[]) as typeof decisions);
 }void load();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},30000);return()=>{mounted=false;window.clearInterval(timer);};},[projectId]);
 function displayStatus(item:EditorialItem){
  const decision=decisions.find(x=>x.content_id===item.id&&x.content_version===(item.version??""));
  const idea=ideaDecisions.find(x=>x.content_id===item.id&&x.content_version===(item.version??""));
  return decision?editorialStatuses[decision.decision]:(item.status==="idea"||item.status==="idea_pending")&&idea?.decision==="approved"?"Ideia aprovada":(item.status==="idea"||item.status==="idea_pending")&&idea?.decision==="changes_requested"?"Ajustes na ideia":editorialStatuses[item.status]??item.status;
 }

 async function persist(next:EditorialItem[],target=project,focus=true){
  if(!target||saving)return;
  setSaving(true);setError("");setNotice("");
  const payload={...(target.data??{}),editorialCalendar:next};
  try {
   const {data:session,error:authError}=await supabase.auth.getSession();
   const token=session.session?.access_token;
   if(authError||!token){setError("Sessão expirada. Entre novamente para salvar.");return;}
   const response=await fetch("/api/admin/project/update",{
    method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify({projectId:target.id,expectedUpdatedAt:target.updated_at,data:payload}),cache:"no-store"
   });
   if(response.status===409){setError("Esse projeto foi modificado em outra sessão. Atualize a página para evitar sobrescrever informações.");return;}
   if(!response.ok){setError("Não foi possível salvar o conteúdo. Confira as permissões.");return;}
   const result=await response.json();
   if(!result?.project||typeof result.project.updated_at!=="string"){setError("Não foi possível confirmar a atualização do conteúdo.");return;}
   onChanged(target.id,result.project.data as Project["data"],result.project.updated_at);
   if(focus){const saved=next.find(x=>x.id===editing?.id)??next[next.length-1];if(saved)setFocusItem({projectId:target.id,contentId:saved.id,channel:saved.channel,publishDate:saved.publishDate,nonce:Date.now()});setEditing(null);setNotice("Conteúdo atualizado. Canal e mês selecionados no calendário.");}
   else setNotice("Conteúdo atualizado. As decisões anteriores foram preservadas.");
   return true;
  }catch{setError("Falha de conexão ao salvar o conteúdo.");}
  finally{setSaving(false);}
 }
 async function changeLifecycle(rows:{projectId:string;id:string}[],action:"archive"|"trash"|"restore"){
  const completed:string[]=[];
  if(saving)return completed;
  const grouped=new Map<string,Set<string>>();
  for(const row of rows){
   const ids=grouped.get(row.projectId)??new Set<string>();
   ids.add(row.id);grouped.set(row.projectId,ids);
  }
  for(const [id,ids] of grouped){
   const target=projects.find(p=>p.id===id);
   if(!target)break;
   const now=new Date().toISOString();
   const next=(target.data?.editorialCalendar??[]).map(row=>!ids.has(row.id)?row:action==="restore"?{...row,archivedAt:undefined,deletedAt:undefined}:action==="archive"?{...row,archivedAt:now,deletedAt:undefined}:{...row,deletedAt:now,archivedAt:undefined});
   if(!await persist(next,target,false))break;
   completed.push(...[...ids].map(itemId=>id+":"+itemId));
  }
  return completed;
 }
 function save(){
  if(!editing||!project)return;
  if(editing.title.trim().length<3){setError("Informe o título do conteúdo.");return;}
  if(!validOperationalDate(editing.publishDate)){setError("Informe uma data de publicação válida.");return;}
  if((editing.owner??"").length>120||!["low","normal","high","urgent"].includes(editing.priority??"normal")){setError("Responsável ou prioridade inválidos.");return;}
   if(!safe(editing.driveUrl??"")||!safe(editing.briefUrl??"")){setError("Os links de roteiro e material precisam usar HTTPS.");return;}
   const refs=(editing.references??[]).filter(ref=>ref.url.trim()||ref.note.trim());
   if(refs.length>10||refs.some(ref=>!ref.url.trim()||ref.url.length>2048||!safe(ref.url.trim())||ref.note.length>400)){setError("Informe até 10 referências com links HTTPS válidos e observações de até 400 caracteres.");return;}
  if(!editorialChannels.some(channel=>channel.value===editing.channel)&&!(editing.id&&items.some(item=>item.id===editing.id&&item.channel===editing.channel))){setError("Selecione um canal da lista.");return;}
  if(!editing.id&&(!editing.ideaSummary?.trim()||!editing.objective?.trim())){setError("Informe o resumo da ideia e o objetivo do conteúdo.");return;}
  const original=items.find(row=>row.id===editing.id);
  const decided=decisions.some(row=>row.content_id===editing.id&&row.content_version===(editing.version??""));
  const materialFields=["title","channel","format","publishDate","caption","driveUrl","briefUrl","ideaSummary","objective","audience","funnelStage","keyMessage","cta","relatedTaskId"] as const;
   const referencesChanged=JSON.stringify(original?.references??[])!==JSON.stringify(refs.map(ref=>({url:ref.url.trim(),note:ref.note.trim()})));
  const ideaDecided=ideaDecisions.some(row=>row.content_id===editing.id&&row.content_version===(editing.version??""));
  if(original&&ideaDecided&&original.version===editing.version&&(referencesChanged||(["title","channel","format","ideaSummary","objective","audience","funnelStage","keyMessage","cta","briefUrl"] as const).some(field=>(original[field]??"")!==(editing[field]??"")))){setError("Esta ideia já recebeu uma decisão do cliente. Crie uma nova versão antes de alterar título, canal ou formato.");return;}
  if(original&&decided&&original.version===editing.version&&(referencesChanged||materialFields.some(field=>(original[field]??"")!==(editing[field]??"")))){
   setError("Esta versão já recebeu uma decisão do cliente. Informe um novo número de versão antes de alterar o material.");
   return;
  }
  if(editing.relatedTaskId&&!project.data?.executionTimeline?.some(t=>t.id===editing.relatedTaskId)){setError("A tarefa vinculada precisa pertencer ao mesmo projeto.");return;}
  const item={...editing,id:editing.id||crypto.randomUUID(),title:editing.title.trim(),driveUrl:editing.driveUrl?.trim(),references:refs.map(ref=>({url:ref.url.trim(),note:ref.note.trim()}))};
  void persist(editing.id?items.map(t=>t.id===editing.id?item:t):[...items,item]);
 }
 return <div className="rv-ui2-module rv-ui2-editorial rv-ui3-editorial mt-3 space-y-3">
  {notice&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
  <EditorialCalendar projects={projects} members={members} clientPhotos={clientPhotos} focusItem={focusItem} saving={saving} onBulkLifecycle={changeLifecycle} onLifecycleChange={(id,item,action)=>{void changeLifecycle([{projectId:id,id:item.id}],action);}} onOwnerChange={(id,item,ownerUserId,owner)=>{const target=projects.find(p=>p.id===id);if(!target||saving)return;void persist((target.data?.editorialCalendar??[]).map(row=>row.id===item.id?{...row,ownerUserId,owner}:row),target,false);}} onPriorityChange={(id,item,priority)=>{const target=projects.find(p=>p.id===id);if(!target||saving)return;void persist((target.data?.editorialCalendar??[]).map(row=>row.id===item.id?{...row,priority}:row),target,false);}} onStatusChange={(id,item,status)=>{if(["approved","changes_requested","idea_approved","idea_changes","idea_pending"].includes(status)){setError("A aprovação formal exige uma decisão registrada no fluxo do cliente.");return;}if(item.status==="idea"&&status!=="idea"){setError("Envie a ideia ao cliente e aguarde a aprovação formal antes de iniciar a produção.");return;}if(item.status==="idea_approved"&&status!=="production"){setError("Após aprovar a ideia, o próximo passo é Em produção.");return;}if(item.status==="idea_changes"){setError("Edite o direcionamento e crie uma nova versão da ideia antes de reenviar ao cliente.");return;}const target=projects.find(p=>p.id===id);if(!target)return;const existing=target.data?.editorialCalendar??[];void persist(existing.map(row=>row.id===item.id?{...row,status}:row),target,false);}} onNew={id=>{if(!discard())return;setProjectId(id||projects[0]?.id||"");setEditing({...blank});setError("");setNotice("");}} onEdit={(id,item)=>{if(!discard())return;setProjectId(id);setEditing({...item});setError("");setNotice("");}}/>
  {project&&<details className="rv-ui3-editorial-approval-history border-t border-[#E3E6ED] py-3">
   <summary className="min-h-9 cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-[#5949D1] hover:bg-[#EDEAFF]">Consultar histórico de aprovações do projeto</summary>
   <EditorialApprovalsPanel key={project.id} projectId={project.id} contentTitles={Object.fromEntries(items.map(item=>[item.id,item.title]))}/>
  </details>}
  {project&&editing&&<div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-5"><button type="button" aria-label="Fechar editor de conteúdo" onClick={close} className="absolute inset-0 bg-[#090D1C]/55"/><section role="dialog" aria-modal="true" aria-label="Editor de conteúdo" className="relative z-10 flex h-[min(94dvh,940px)] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl border border-[#E3E6ED] bg-white shadow-2xl"><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-7">
    <DialogFocus onClose={close}/>{dirty&&<p role="status" className="rv-unsaved">Alterações não salvas no conteúdo</p>}<h3 className="border-b border-[#E3E6ED] pb-3 text-base font-semibold text-[#323647]">{editing.id?"Editar conteúdo":"Novo conteúdo"}</h3>
    {!editing.id&&<label className="mt-4 block text-xs font-medium">Projeto<select value={projectId} onChange={e=>{setProjectId(e.target.value);setError("");}} className="mt-1 block w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm">{projects.map(p=><option key={p.id} value={p.id}>{client(p)?.name??"Cliente"} · {p.title}</option>)}</select></label>}
    {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {approvalError&&<p className="mt-3 text-xs text-[#916000]">A sincronização de aprovações depende da configuração do banco.</p>}
    <div className="rv-ui3-editorial-form mt-4 grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-medium sm:col-span-2">Título *<input value={editing.title} maxLength={150} onChange={e=>setEditing({...editing,title:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Canal *<div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-1"><ContentTablerIcon name={editorialChannelIcon(editing.channel)} size={20}/><select value={editing.channel} onChange={e=>setEditing({...editing,channel:e.target.value})} className="min-w-0 flex-1 cursor-pointer bg-white py-1.5 text-sm">{!editorialChannels.some(x=>x.value===editing.channel)&&<option value={editing.channel}>{editing.channel} (legado)</option>}{editorialChannels.map(channel=><option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></div></label>
     <label className="text-xs font-medium">Formato<input value={editing.format} onChange={e=>setEditing({...editing,format:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Data prevista *<input type="date" value={editing.publishDate} onChange={e=>setEditing({...editing,publishDate:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Versão<input value={editing.version??""} maxLength={30} onChange={e=>setEditing({...editing,version:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Situação<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as EditorialItem["status"]})} className="mt-1 block w-full cursor-pointer rounded-lg border px-3 py-2.5 text-sm">{Object.entries(editorialStatuses).filter(([key])=>!["idea_pending","idea_changes","idea_approved","approved","changes_requested"].includes(key)||key===editing.status).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><span className="mt-1 block text-[11px] text-[#697386]">Aprovações e ajustes são decisões do cliente. Ideias em ajustes exigem nova versão antes do reenvio.</span></label>
     <div className="text-xs font-medium">Responsável<div className="mt-1"><TaskDropdown presentation="detail" kind="people" label="Responsável pelo conteúdo" value={editing.ownerUserId??""} options={[{value:"",label:"Não atribuído"},...members.map(m=>({value:m.user_id,label:m.display_name,photo:m.avatar_url}))]} avatar={{name:editing.owner||"Não atribuído",src:members.find(m=>m.user_id===editing.ownerUserId)?.avatar_url}} onChange={id=>{const person=members.find(m=>m.user_id===id);setEditing({...editing,ownerUserId:id,owner:person?.display_name??""});}}/></div></div>
      <label className="text-xs font-medium">Prioridade<select value={editing.priority??"normal"} onChange={e=>setEditing({...editing,priority:e.target.value as EditorialItem["priority"]})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
      <label className="text-xs font-medium">Tarefa relacionada<select value={editing.relatedTaskId??""} onChange={e=>setEditing({...editing,relatedTaskId:e.target.value||undefined})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"><option value="">Nenhuma tarefa vinculada</option>{(project.data?.executionTimeline??[]).map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select><span className="mt-1 block text-[11px] text-[#697386]">Permite consultar a decisão do cliente na Central de Tarefas. Não conclui a tarefa automaticamente.</span></label>
     <div className="rv-ui3-editorial-form-group sm:col-span-2 mt-3 border-t border-[#E3E6ED] pt-4"><h4 className="text-sm font-semibold">Direcionamento estratégico</h4><p className="text-xs text-[#697386]">Explique o conteúdo de forma simples para facilitar a aprovação.</p></div>
     <label className="text-xs font-medium sm:col-span-2">Resumo da ideia *<textarea value={editing.ideaSummary??""} onChange={e=>setEditing({...editing,ideaSummary:e.target.value})} rows={2} maxLength={1200} placeholder="Em poucas frases, qual é a proposta?" className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium sm:col-span-2">Objetivo do conteúdo *<input value={editing.objective??""} onChange={e=>setEditing({...editing,objective:e.target.value})} maxLength={300} placeholder="O que este conteúdo pretende alcançar?" className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Público (opcional)<input value={editing.audience??""} onChange={e=>setEditing({...editing,audience:e.target.value})} maxLength={300} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Etapa do funil<select value={editing.funnelStage??""} onChange={e=>setEditing({...editing,funnelStage:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"><option value="">Não especificada</option><option value="Atração">Atração</option><option value="Consideração">Consideração</option><option value="Conversão">Conversão</option><option value="Relacionamento">Relacionamento</option><option value="Retenção">Retenção</option></select></label>
     <label className="text-xs font-medium sm:col-span-2">Mensagem principal<input value={editing.keyMessage??""} onChange={e=>setEditing({...editing,keyMessage:e.target.value})} maxLength={500} placeholder="Qual ideia o público deve levar consigo?" className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium sm:col-span-2">CTA (chamada para ação)<input value={editing.cta??""} onChange={e=>setEditing({...editing,cta:e.target.value})} maxLength={300} placeholder="Qual ação queremos incentivar?" className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <div className="sm:col-span-2 border-y border-[#E3E6ED] py-4">
      <div className="flex items-center justify-between gap-2"><div><h4 className="text-sm font-semibold">Referências criativas</h4><p className="mt-1 text-xs text-[#697386]">Links de inspiração e o que aproveitar de cada referência. Campo opcional.</p></div><button type="button" disabled={(editing.references??[]).length>=10} onClick={()=>setEditing({...editing,references:[...(editing.references??[]),{url:"",note:""}]})} className="cursor-pointer rounded-lg border border-[#D8CDF0] px-3 py-2 text-xs font-semibold text-[#6034B7] disabled:opacity-40">+ Adicionar</button></div>
      {(editing.references??[]).map((ref,i)=><div key={i} className="mt-3 rounded-lg bg-[#F7F8FB] p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">Referência {i+1}</span><button type="button" onClick={()=>setEditing({...editing,references:(editing.references??[]).filter((_,j)=>j!==i)})} className="cursor-pointer text-xs font-semibold text-[#7B4775]">Remover</button></div>
       <label className="mt-2 block text-xs font-medium">URL<input type="url" maxLength={2048} placeholder="https://..." value={ref.url} onChange={e=>setEditing({...editing,references:(editing.references??[]).map((r,j)=>j===i?{...r,url:e.target.value}:r)})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
       <label className="mt-2 block text-xs font-medium">O que aproveitar desta referência?<input maxLength={400} value={ref.note} onChange={e=>setEditing({...editing,references:(editing.references??[]).map((r,j)=>j===i?{...r,note:e.target.value}:r)})} placeholder="Ex.: ritmo de edição, narrativa, estilo visual..." className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
      </div>)}
     </div>
     <div className="rv-ui3-editorial-form-group sm:col-span-2 mt-3 border-t border-[#E3E6ED] pt-4"><h4 className="text-sm font-semibold">Legenda e materiais</h4></div>
     <label className="text-xs font-medium">Link do roteiro ou briefing<input type="url" value={editing.briefUrl??""} onChange={e=>setEditing({...editing,briefUrl:e.target.value})} placeholder="https://drive.google.com/..." className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Link do material da publicação<input type="url" value={editing.driveUrl??""} onChange={e=>setEditing({...editing,driveUrl:e.target.value})} placeholder="https://drive.google.com/..." className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium sm:col-span-2">Legenda<textarea rows={3} value={editing.caption??""} onChange={e=>setEditing({...editing,caption:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium sm:col-span-2">Observações de revisão<textarea rows={2} value={editing.reviewNotes??""} onChange={e=>setEditing({...editing,reviewNotes:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
    </div>
    <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.visibleToClient===true} onChange={e=>setEditing({...editing,visibleToClient:e.target.checked})} className="h-4 w-4 accent-[#6D35F5]"/> Compartilhar conteúdo no Portal do Cliente</label>
    {process.env.NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED==="true"&&editing.id&&items.some(item=>item.id===editing.id&&item.visibleToClient===true)&&<div className="mt-5"><ProjectConversation key={project.id+":"+editing.id} projectId={project.id} resourceType="content" resourceId={editing.id}/></div>}
    </div><footer className="flex shrink-0 justify-end gap-2 border-t border-[#E3E6ED] bg-white px-4 py-3 sm:px-7"><button type="button" onClick={close} disabled={saving} className="cursor-pointer rounded-lg border px-4 py-2.5 text-sm">Cancelar</button><button type="button" disabled={saving} onClick={save} className="cursor-pointer rounded-lg bg-[#6C5CE7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5949D1] disabled:opacity-40">{saving?"Salvando...":"Salvar conteúdo"}</button></footer></section></div>}
 </div>;
}
