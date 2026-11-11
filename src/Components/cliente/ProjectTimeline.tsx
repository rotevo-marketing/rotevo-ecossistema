"use client";
import {useMemo,useState} from "react";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {TaskAvatar} from "@/Components/admin/TaskGridCells";
import ProjectConversation from "@/Components/shared/ProjectConversation";
import DialogFocus from "@/Components/ui/DialogFocus";
export type ExecutionItem = {
  id:string;
  title:string;
  description?:string;
  projectTitle?:string;
  projectKey?:string;
  projectAvatarUrl?:string;
  documentCode?:string;
  priority?:"low"|"normal"|"high"|"urgent";
  phase?:string;
  owner?:string;
  ownerAvatarUrl?:string;
  ownerUserId?:string;
  startDate?:string;
  dueDate?:string;
  completedAt?:string;
  archivedAt?:string;
  deletedAt?:string;
  status?:"planned"|"in_progress"|"blocked"|"completed"|"cancelled";
  kind?:"deliverable"|"milestone"|"task";
  dependencies?:string[];
  driveUrl?:string;
  referenceUrl?:string;
  checklist?:{id:string;text:string;done:boolean}[];
  activityLog?:{at:string;summary:string}[];
  visibleToClient?:boolean;
};

type Project={id:string;title:string;clientAvatarUrl?:string|null;data:{executionTimeline?:ExecutionItem[];deliverySchedule?:Record<string,string>|null}|null};
type Row=ExecutionItem&{projectKey:string;projectTitle:string;projectAvatarUrl?:string};
type Status="planned"|"in_progress"|"blocked"|"completed"|"cancelled";
type Priority="low"|"normal"|"high"|"urgent";
const statuses:{id:Status;name:string;color:string}[]=[
{id:"planned",name:"Pendente",color:"#8E9BAF"},
{id:"in_progress",name:"Em andamento",color:"#4D96E8"},
{id:"blocked",name:"Aguardando",color:"#F2AA39"},
{id:"completed",name:"Concluída",color:"#12A66C"},
{id:"cancelled",name:"Cancelada",color:"#B57A89"}];
const priorities:{id:Priority;name:string;color:string}[]=[
{id:"urgent",name:"Urgente",color:"#D9415C"},{id:"high",name:"Alta",color:"#E89639"},
{id:"normal",name:"Normal",color:"#5C80C7"},{id:"low",name:"Baixa",color:"#9CA5B2"}];
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const prettyDate=(v?:string)=>v&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v.slice(8,10)+"/"+v.slice(5,7)+"/"+v.slice(0,4):"Sem prazo";
const relativeDate=(v?:string)=>{if(!v||!/^\d{4}-\d{2}-\d{2}$/.test(v))return "Sem prazo";
const ms=(x:string)=>Date.UTC(+x.slice(0,4),+x.slice(5,7)-1,+x.slice(8,10));
const n=Math.round((ms(v)-ms(today()))/86400000);
return n===0?"Hoje":n===-1?"Ontem":n===1?"Amanhã":n<0&&n>=-6?"Há "+(-n)+" dias":n>1&&n<=6?"Em "+n+" dias":prettyDate(v);};
const isOpen=(v:Row)=>v.status!=="completed"&&v.status!=="cancelled";
const safeLink=(v?:string)=>{if(!v)return null;try{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const label=(status?:string)=>statuses.find(s=>s.id===status)?.name??"Pendente";
const statusColor=(status?:string)=>statuses.find(s=>s.id===status)?.color??statuses[0].color;
const priorityInfo=(priority?:string)=>priorities.find(p=>p.id===priority)??priorities[2];
const isRow=(v:unknown):v is ExecutionItem=>!!v&&typeof v==="object"&&typeof (v as ExecutionItem).id==="string"&&typeof (v as ExecutionItem).title==="string";

export default function ProjectTimeline({projects,clientName}:{projects:Project[];clientName?:string}){
 const [view,setView]=useState<"list"|"board">("list");
 const [section,setSection]=useState<"active"|"completed">("active");
 const [search,setSearch]=useState(""),[searchOpen,setSearchOpen]=useState(false);
 const [owner,setOwner]=useState("all"),[peopleOpen,setPeopleOpen]=useState(false);
 const [status,setStatus]=useState("all"),[priority,setPriority]=useState("all"),[deadline,setDeadline]=useState("all");
 const [projectFilter,setProjectFilter]=useState("all"),[filterOpen,setFilterOpen]=useState(false);
 const [sort,setSort]=useState<"due"|"priority"|"title">("due");
 const [group,setGroup]=useState<"client"|"project"|"flat">("client");
 const [columns,setColumns]=useState({project:true,owner:true,status:true,priority:true,due:true}),[columnsOpen,setColumnsOpen]=useState(false);
 const [moreOpen,setMoreOpen]=useState(false),[collapsed,setCollapsed]=useState<Record<string,boolean>>({});
 const [selected,setSelected]=useState<Row|null>(null),[page,setPage]=useState(1);
 const [completedMonth,setCompletedMonth]=useState("");
 const pageSize=30;
 const items=useMemo<Row[]>(()=>projects.flatMap(p=>(p.data?.executionTimeline??[]).filter(i=>isRow(i)&&i.visibleToClient===true&&!i.deletedAt&&!i.archivedAt).map(i=>({...i,projectKey:p.id,projectTitle:p.title,projectAvatarUrl:p.clientAvatarUrl??undefined}))),[projects]);
 const people=useMemo(()=>[...new Set(items.map(i=>i.owner?.trim()).filter((v):v is string=>!!v))].sort((a,b)=>a.localeCompare(b,"pt-BR")),[items]);
 const filtered=useMemo(()=>items.filter(i=>{
  if(section==="completed"?(i.status!=="completed"||(completedMonth&&!i.completedAt?.startsWith(completedMonth))):(view==="list"&&(i.status==="completed"||i.status==="cancelled")))return false;
  if(projectFilter!=="all"&&i.projectKey!==projectFilter)return false;
  if(owner!=="all"&&(owner==="unassigned"?!!i.owner?.trim():i.owner!==owner))return false;
  if(status!=="all"&&(i.status??"planned")!==status)return false;
  if(priority!=="all"&&(i.priority??"normal")!==priority)return false;
  if(deadline!=="all"){const d=i.dueDate??"";if(deadline==="today"&&d!==today())return false;if(deadline==="overdue"&&!(d&&d<today()&&isOpen(i)))return false;if(deadline==="upcoming"&&!(d&&d>today()))return false;}
  const q=search.trim().toLocaleLowerCase("pt-BR");return !q||[i.title,i.projectTitle,i.owner,i.description].some(v=>v?.toLocaleLowerCase("pt-BR").includes(q));
 }).sort((a,b)=>sort==="title"?a.title.localeCompare(b.title,"pt-BR"):sort==="priority"?priorities.findIndex(p=>p.id===(a.priority??"normal"))-priorities.findIndex(p=>p.id===(b.priority??"normal")):(a.dueDate??"9999").localeCompare(b.dueDate??"9999")),[items,section,completedMonth,projectFilter,owner,status,priority,deadline,search,sort,view]);
 const currentPage=Math.min(page,Math.max(1,Math.ceil(filtered.length/pageSize)));
 const paged=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
 const groupRows=useMemo(()=>{
  const m=new Map<string,{name:string;items:Row[];avatar?:string}>();
  for(const item of paged){const key=group==="flat"?"all":group==="project"?item.projectKey:"client";
  const name=group==="flat"?"Todas as tarefas":group==="project"?item.projectTitle:(clientName||"Tarefas do cliente");
  if(!m.has(key))m.set(key,{name,items:[],avatar:item.projectAvatarUrl});m.get(key)!.items.push(item);}
  return [...m.entries()];
 },[paged,group,clientName]);
 const reset=()=>{setSearch("");setOwner("all");setStatus("all");setPriority("all");setDeadline("all");setProjectFilter("all");setCompletedMonth("");setSort("due");setPage(1);};
 const tableColumns=1+Object.values(columns).filter(Boolean).length;
 const tabler=(name:Parameters<typeof RotevoTablerIcon>[0]["name"],size=16)=><RotevoTablerIcon name={name} size={size} stroke={1.7}/>;
 const action="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-[#323647] hover:bg-[#F3F4F8] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]";
 const conversationEnabled=process.env.NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED==="true";
 return <div className="rv-ui2-module rv-ui2-client-execution rv-ui3-client-task-center space-y-4 text-[#323647]">
  <section className="relative rounded-xl border border-[#E3E7F0] bg-white p-4">
   <header><h2 className="text-lg font-semibold">Central de tarefas</h2><p className="mt-1 text-xs text-[#697386]">Atividades e entregas compartilhadas · {filtered.length} tarefa(s)</p></header>
   <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-[#E3E7F0] pb-3">
    <div className="flex items-center gap-1"><button type="button" className={action} aria-label="Pesquisar tarefas" aria-expanded={searchOpen} onClick={()=>setSearchOpen(x=>!x)}>{tabler("search",17)} Pesquisar</button>{searchOpen&&<input autoFocus aria-label="Buscar tarefa, projeto ou responsável" type="search" placeholder="Pesquisar..." className="h-9 w-40 rounded-md border border-[#D9DEEB] px-2 text-xs focus:border-[#6C5CE7] sm:w-56" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>}</div>
    <div className="relative"><button type="button" className={action} aria-label="Filtrar por pessoa" aria-expanded={peopleOpen} onClick={()=>{setPeopleOpen(x=>!x);setFilterOpen(false);setColumnsOpen(false);setMoreOpen(false);}}>{tabler("user-check",17)} Pessoa</button>{peopleOpen&&<div className="absolute left-0 top-full z-30 mt-1 w-52 rounded-lg border border-[#DDE2EC] bg-white p-2 shadow-xl">{[{value:"all",name:"Todas as pessoas"},{value:"unassigned",name:"Não atribuído"},...people.map(name=>({value:name,name}))].map(person=><button type="button" key={person.value} aria-pressed={owner===person.value} onClick={()=>{setOwner(person.value);setPeopleOpen(false);setPage(1);}} className="block w-full rounded-md px-2 py-2 text-left text-xs hover:bg-[#F3F0FF]">{person.name}</button>)}</div>}</div>
    <button type="button" aria-label="Filtros avançados" aria-expanded={filterOpen} onClick={()=>{setFilterOpen(x=>!x);setPeopleOpen(false);setColumnsOpen(false);setMoreOpen(false);}} className={action}>{tabler("filter",17)} Filtro {tabler("chevron-down",13)}</button>
    <label className={action}>{tabler("arrows-sort",17)} <select aria-label="Ordenar tarefas" value={sort} onChange={e=>{setSort(e.target.value as typeof sort);setPage(1);}} className="max-w-[145px] cursor-pointer bg-transparent outline-none"><option value="due">Por prazo</option><option value="priority">Por prioridade</option><option value="title">Por título</option></select></label>
    {view==="list"&&<div className="relative"><button type="button" className={action} aria-label="Ocultar colunas" aria-expanded={columnsOpen} onClick={()=>{setColumnsOpen(x=>!x);setPeopleOpen(false);setFilterOpen(false);setMoreOpen(false);}}>{tabler("eye",17)} Ocultar</button>{columnsOpen&&<div className="absolute left-0 top-full z-30 mt-1 w-48 rounded-lg border border-[#DDE2EC] bg-white p-3 shadow-xl"><p className="mb-2 text-xs font-semibold">Colunas visíveis</p>{([["project","Projeto"],["owner","Responsável"],["status","Situação"],["priority","Prioridade"],["due","Prazo"]] as const).map(([key,name])=><label key={key} className="flex cursor-pointer items-center gap-2 py-1.5 text-xs"><input type="checkbox" className="accent-[#6C5CE7]" checked={columns[key]} onChange={e=>setColumns(x=>({...x,[key]:e.target.checked}))}/>{name}</label>)}</div>}</div>}
    {view==="list"&&<label className={action}>{tabler("folder",16)} <select aria-label="Agrupar tarefas" value={group} onChange={e=>{setGroup(e.target.value as typeof group);setCollapsed({});}} className="max-w-[130px] cursor-pointer bg-transparent outline-none"><option value="client">Por cliente</option><option value="project">Por projeto</option><option value="flat">Lista única</option></select></label>}
    <div className="relative"><button type="button" className={action} aria-label="Mais opções" aria-expanded={moreOpen} onClick={()=>{setMoreOpen(x=>!x);setPeopleOpen(false);setFilterOpen(false);setColumnsOpen(false);}}>•••</button>{moreOpen&&<div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border bg-white p-2 shadow-xl"><button type="button" className="w-full p-2 text-left text-xs hover:bg-[#F3F0FF]" onClick={()=>{reset();setMoreOpen(false);}}>Limpar filtros</button></div>}</div>
    <div className="ml-auto flex overflow-hidden rounded-md border border-[#E1E5EE]"><button type="button" aria-label="Lista" aria-pressed={view==="list"} onClick={()=>{setView("list");setPage(1);}} className={"inline-flex h-9 items-center gap-1 px-2.5 text-xs "+(view==="list"?"bg-[#EDE8FF] font-semibold text-[#6034B7]":"")}>{tabler("list")} Lista</button><button type="button" aria-label="Kanban" aria-pressed={view==="board"} onClick={()=>{setView("board");setPage(1);}} className={"inline-flex h-9 items-center gap-1 border-l px-2.5 text-xs "+(view==="board"?"bg-[#EDE8FF] font-semibold text-[#6034B7]":"")}>{tabler("layout-kanban")} Kanban</button></div>
   </div>
   <nav aria-label="Organização das tarefas" className="mt-4 flex flex-wrap gap-2">{([{id:"active",label:"Ativas"},{id:"completed",label:"Concluídas"}] as const).map(t=><button type="button" key={t.id} aria-pressed={section===t.id} onClick={()=>{setSection(t.id);setPage(1);setStatus("all");}} className={"cursor-pointer rounded-lg border px-4 py-2 text-xs font-semibold "+(section===t.id?"border-[#6D35F5] bg-[#F0EBFF] text-[#6034B7]":"border-[#DCE2EC] text-[#525B70]")}>{t.label}</button>)}</nav>
   {filterOpen&&<div role="group" aria-label="Filtros avançados das tarefas" className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-[#E3E7F0] bg-[#FBFCFE] p-3">{[
    {label:"Projeto",value:projectFilter,set:setProjectFilter,choices:[{id:"all",name:"Todos os projetos"},...projects.map(p=>({id:p.id,name:p.title}))]},
    {label:"Situação",value:status,set:setStatus,choices:[{id:"all",name:"Todas as situações"},...statuses.map(s=>({id:s.id,name:s.name}))]},
    {label:"Prioridade",value:priority,set:setPriority,choices:[{id:"all",name:"Todas as prioridades"},...priorities.map(p=>({id:p.id,name:p.name}))]},
    {label:"Prazo",value:deadline,set:setDeadline,choices:[{id:"all",name:"Todos os prazos"},{id:"today",name:"Hoje"},{id:"overdue",name:"Atrasadas"},{id:"upcoming",name:"Futuras"}]}
   ].map(f=><label key={f.label} className="text-xs font-semibold text-[#525B70]">{f.label}<select value={f.value} onChange={e=>{f.set(e.target.value);setPage(1);}} className="mt-1 block h-9 max-w-[220px] rounded-lg border border-[#DDE2EC] bg-white px-2 text-xs">{f.choices.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>)}<button type="button" onClick={reset} className="mt-4 rounded-lg border px-3 py-2 text-xs">Limpar filtros</button></div>}
   {section==="completed"&&<label className="mt-3 flex items-center gap-2 text-xs text-[#525B70]">Mês de conclusão<input type="month" value={completedMonth} onChange={e=>{setCompletedMonth(e.target.value);setPage(1);}} className="rounded-lg border border-[#DDE2EC] p-2 text-xs"/></label>}
   {filtered.length===0?<div className="mt-4 rounded-lg bg-[#F6F7FB] p-5"><p className="text-sm font-semibold">Nenhuma tarefa compartilhada corresponde aos filtros.</p><p className="mt-2 text-xs text-[#697386]">As tarefas aparecem quando a Rotevo as disponibiliza para este cliente.</p></div>:view==="list"?
   <div className="rv-ui2-task-board mt-4 overflow-x-auto rounded-lg border border-[#E3E7F0]"><table className="w-full min-w-[850px] border-collapse text-left text-sm">
    <thead className="bg-[#F7F8FC] text-xs font-semibold text-[#525B70]"><tr>{([["Tarefa","list","title"],["Projeto","folder","project"],["Responsável","user-check","owner"],["Situação","filter","status"],["Prioridade","flag","priority"],["Prazo","calendar-week","due"]] as const).filter(([, ,key])=>key==="title"||columns[key as keyof typeof columns]).map(([title,ico])=><th scope="col" key={title} className="border-b border-r border-[#E3E7F0] px-3 py-3"><span className="inline-flex items-center gap-2">{tabler(ico)}{title}</span></th>)}</tr></thead>
    <tbody className="divide-y divide-[#EDF0F6]">{groupRows.map(([groupKey,g])=><>{group!=="flat"&&<tr key={"header-"+groupKey} className="bg-[#FAF9FE]"><td colSpan={tableColumns} className="border-b border-[#E9E6F2] p-0"><button type="button" aria-expanded={!collapsed[groupKey]} onClick={()=>setCollapsed(v=>({...v,[groupKey]:!v[groupKey]}))} className="flex min-h-11 w-full items-center gap-2 border-l-[3px] border-[#8173C8] px-3 text-left text-xs font-semibold">{tabler(collapsed[groupKey]?"chevron-right":"chevron-down")}{g.avatar&&<TaskAvatar name={g.name} src={g.avatar} size={24}/>}<span>{g.name}</span><span className="ml-auto text-xs font-normal text-[#697386]">{g.items.length} tarefa(s)</span></button></td></tr>}{!collapsed[groupKey]&&g.items.map(item=><tr key={item.projectKey+":"+item.id} className="hover:bg-[#FBFAFF]">
     <td className="max-w-[360px] border-l-4 border-r border-[#E3E7F0] px-3 py-3" style={{borderLeftColor:statusColor(item.status)}}><button type="button" onClick={()=>setSelected(item)} className="cursor-pointer text-left text-xs font-semibold text-[#4E2CA8] underline decoration-[#C9B8F3] underline-offset-4 hover:text-[#6034B7]">{item.title} ↗</button>{item.description&&<p className="mt-1 flex items-center gap-1 text-[11px] text-[#697386]">{tabler("align-left",13)} Descrição disponível</p>}</td>
     {columns.project&&<td className="w-[95px] border-r border-[#E3E7F0] px-3 py-2 text-center"><span title={item.projectTitle}><TaskAvatar name={item.projectTitle} src={item.projectAvatarUrl} size={26}/></span></td>}
     {columns.owner&&<td className="w-[95px] border-r border-[#E3E7F0] px-3 py-2 text-center">{item.owner?<span title={item.owner}><TaskAvatar name={item.owner} src={item.ownerAvatarUrl} size={26}/></span>:<span title="Não atribuído">{tabler("user",17)}</span>}</td>}
     {columns.status&&<td className="min-w-[125px] border-r border-[#E3E7F0] p-0"><span className="flex min-h-10 items-center px-3 text-xs font-semibold text-white" style={{backgroundColor:statusColor(item.status)}}>{label(item.status)}</span></td>}
     {columns.priority&&<td className="min-w-[115px] border-r border-[#E3E7F0] p-0"><span className="flex min-h-10 items-center gap-2 px-3 text-xs font-semibold text-white" style={{backgroundColor:priorityInfo(item.priority).color}}>{tabler("flag",14)}{priorityInfo(item.priority).name}</span></td>}
     {columns.due&&<td className="min-w-[120px] border-r border-[#E3E7F0] px-3 py-2 text-xs text-[#525B70]"><span className="inline-flex items-center gap-2">{tabler("calendar-week",15)}{relativeDate(item.dueDate)}</span></td>}
    </tr>)}</>)}</tbody>
   </table></div>:
   <div className="mt-4 flex gap-3 overflow-x-auto pb-3" aria-label="Quadro Kanban com cinco situações">{statuses.map(col=><section key={col.id} className="w-[258px] shrink-0 self-start rounded-xl border border-[#E9EDF3] bg-[#F7F8FA] p-2.5"><h3 className="mb-2 flex min-h-8 items-center justify-between gap-2 px-1 text-xs font-semibold text-[#475467]"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{backgroundColor:col.color}}/>{col.name}</span><span>{filtered.filter(x=>(x.status??"planned")===col.id).length}</span></h3><div className="space-y-2">{paged.filter(x=>(x.status??"planned")===col.id).map(item=><article key={item.projectKey+":"+item.id} className="rounded-xl border border-[#E2E6ED] bg-white p-3"><button type="button" onClick={()=>setSelected(item)} className="w-full cursor-pointer text-left text-[13px] font-medium leading-5 text-[#283247] hover:text-[#6034B7]">{item.title}</button>{item.description?.trim()&&<span aria-label="Descrição preenchida" title="Descrição preenchida" className="mt-2 inline-flex text-[#8B95A5]">{tabler("align-left")}</span>}<div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#EFF0F4] pt-2"><span title={item.owner||"Não atribuído"} className="inline-flex h-7 w-7 items-center justify-center">{item.owner?<TaskAvatar name={item.owner} src={item.ownerAvatarUrl} size={25}/>:tabler("user")}</span><span className="inline-flex min-h-7 items-center gap-1 rounded-md border border-[#E8EAF0] px-1.5 text-[11px] text-[#596579]">{tabler("calendar-week",14)}{relativeDate(item.dueDate)}</span><span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium" style={{color:priorityInfo(item.priority).color}}>{tabler("flag",14)}{priorityInfo(item.priority).name}</span></div></article>)}</div></section>)}</div>}
   {filtered.length>pageSize&&<nav aria-label="Paginação das tarefas" className="mt-4 flex justify-end gap-2"><button type="button" disabled={currentPage<=1} onClick={()=>setPage(v=>Math.max(1,v-1))} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Anterior</button><span className="py-2 text-xs">Página {currentPage} de {Math.ceil(filtered.length/pageSize)}</span><button type="button" disabled={currentPage>=Math.ceil(filtered.length/pageSize)} onClick={()=>setPage(v=>v+1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Próxima</button></nav>}
  </section>
  {selected&&<div className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-5"><button type="button" aria-label="Fechar detalhes" className="absolute inset-0 bg-[#090D1C]/60" onClick={()=>setSelected(null)}/><section role="dialog" aria-modal="true" aria-label={"Detalhes da tarefa "+selected.title} className="relative z-10 flex h-[min(94dvh,940px)] w-full max-w-[1150px] flex-col overflow-hidden rounded-2xl border border-[#E3E6ED] bg-white text-[#293144] shadow-2xl"><DialogFocus onClose={()=>setSelected(null)}/><header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E5E9F1] px-5 py-3"><div><p className="text-xs text-[#697386]">Rotevo · Tarefa compartilhada</p><p className="mt-1 text-xs text-[#697386]">{selected.projectTitle}</p></div><button type="button" aria-label="Fechar" onClick={()=>setSelected(null)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#E3E7F0]">{tabler("x",18)}</button></header><div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:overflow-hidden"><div className="min-w-0 space-y-5 p-5 lg:overflow-y-auto"><h2 className="text-xl font-semibold">{selected.title}</h2><div className="grid grid-cols-2 gap-3 border-y border-[#EDF0F5] py-4 text-xs sm:grid-cols-4">{[["Situação",label(selected.status)],["Responsável",selected.owner||"Não atribuído"],["Prioridade",priorityInfo(selected.priority).name],["Prazo",prettyDate(selected.dueDate)]].map(([k,v])=><div key={k}><p className="text-[#697386]">{k}</p><p className="mt-1 font-semibold">{v}</p></div>)}</div><div><h3 className="text-sm font-semibold">Descrição</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#525B70]">{selected.description||"Sem descrição compartilhada."}</p></div>{safeLink(selected.driveUrl)&&<a href={safeLink(selected.driveUrl)!} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#6034B7] underline">Abrir material</a>}</div><aside className="min-w-0 border-t border-[#E3E7F0] bg-[#FBFCFE] p-4 lg:overflow-y-auto lg:border-l lg:border-t-0"><h3 className="border-b border-[#E3E7F0] pb-3 text-sm font-semibold">Conversa sobre a tarefa</h3>{conversationEnabled?<ProjectConversation key={selected.projectKey+":"+selected.id} projectId={selected.projectKey} resourceType="task" resourceId={selected.id}/>:<p className="mt-4 text-xs leading-5 text-[#697386]">O canal de mensagens ainda não foi ativado. A equipe Rotevo poderá disponibilizá-lo após a configuração segura da comunicação.</p>}</aside></div></section></div>}
 </div>;
}
