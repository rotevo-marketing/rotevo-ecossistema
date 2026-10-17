"use client";
import {useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";

export type CampaignStatus="draft"|"active"|"paused"|"finished";
export type CampaignPlatform="Google Ads"|"Meta Ads"|"Outro";
export type CampaignSnapshot={id:string;month:string;spent:number|null;impressions:number|null;clicks:number|null;results:number|null;leads:number|null;appointments:number|null;sales:number|null;revenue:number|null;notes:string;updatedAt:string};
export type CampaignRecord={
 id:string;title:string;platform:CampaignPlatform;objective:string;status:CampaignStatus;
 startDate:string;endDate:string;budget:number|null;spent:number|null;results:number|null;
 resultLabel:string;dashboardUrl:string;notes:string;updatedAt?:string;snapshots?:CampaignSnapshot[];
};
export type CampaignProject={id:string;title:string;updated_at:string;data:Record<string,unknown>|null;clients:{name:string}|{name:string}[]|null};
const client=(p:CampaignProject)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
const statuses:Record<CampaignStatus,string>={draft:"Planejada",active:"Ativa",paused:"Pausada",finished:"Finalizada"};
const blank:CampaignRecord={id:"",title:"",platform:"Google Ads",objective:"",status:"draft",startDate:"",endDate:"",budget:null,spent:null,results:null,resultLabel:"Leads",dashboardUrl:"",notes:""};
const money=(value:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value);
const validDate=(v:string)=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v+"T12:00:00").toISOString().slice(0,10)===v);
const numberOrNull=(v:string)=>v.trim()===""?null:Number(v.replace(",","."));
const https=(v:string)=>{if(!v)return true;try{return new URL(v).protocol==="https:";}catch{return false;}};
export default function CampaignsHub({projects,onChanged}:{projects:CampaignProject[];onChanged:(id:string,data:CampaignProject["data"],updatedAt:string)=>void}){
 const [projectFilter,setProjectFilter]=useState("");
 const [snapshotCampaign,setSnapshotCampaign]=useState<{projectId:string;campaignId:string}|null>(null);
 const [snapshotDraft,setSnapshotDraft]=useState<CampaignSnapshot>({id:"",month:"",spent:null,impressions:null,clicks:null,results:null,leads:null,appointments:null,sales:null,revenue:null,notes:"",updatedAt:""});
 const [snapshotSaving,setSnapshotSaving]=useState(false);
 const [platformFilter,setPlatformFilter]=useState("all");
 const [statusFilter,setStatusFilter]=useState("all");
 const [monthFilter,setMonthFilter]=useState(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");});
 const [search,setSearch]=useState("");
 const [editing,setEditing]=useState<CampaignRecord|null>(null);
 const [editProjectId,setEditProjectId]=useState("");
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const rows=useMemo(()=>projects.flatMap(project=>{
  const source=project.data?.marketingCampaigns;
  const list=Array.isArray(source)?source as CampaignRecord[]:[];
  return list.filter(item=>item&&typeof item.id==="string"&&typeof item.title==="string").map(item=>({item,project}));
 }),[projects]);
 const selectedProjectId=projectFilter||projects[0]?.id||"";
 const scoped=rows.filter(({project})=>project.id===selectedProjectId);
 const dataFor=(item:CampaignRecord)=>{const reports=Array.isArray(item.snapshots)?item.snapshots:[];return reports.find(x=>x.month===monthFilter)??null;};
 const monthRows=scoped.filter(({item})=>(!item.startDate||item.startDate<=monthFilter+"-31")&&(!item.endDate||item.endDate>=monthFilter+"-01"));
 const reported=monthRows.filter(x=>dataFor(x.item)!==null);
 const total=(field:"spent"|"impressions"|"clicks"|"results"|"leads"|"appointments"|"sales"|"revenue")=>{const values=reported.map(x=>dataFor(x.item)?.[field]).filter((n):n is number=>typeof n==="number"&&Number.isFinite(n));return values.length?values.reduce((a,b)=>a+b,0):null;};
 const totals={spent:total("spent"),impressions:total("impressions"),clicks:total("clicks"),leads:total("leads"),appointments:total("appointments"),sales:total("sales"),revenue:total("revenue")};
 const monthlyBudget=monthRows.reduce((sum,x)=>sum+(typeof x.item.budget==="number"?x.item.budget:0),0);
 const hasBudget=monthRows.some(x=>typeof x.item.budget==="number");
 const cpc=totals.spent!==null&&totals.clicks!==null&&totals.clicks>0?totals.spent/totals.clicks:null;
 const ctr=totals.clicks!==null&&totals.impressions!==null&&totals.impressions>0?100*totals.clicks/totals.impressions:null;
 const cpl=totals.spent!==null&&totals.leads!==null&&totals.leads>0?totals.spent/totals.leads:null;
 const roas=totals.revenue!==null&&totals.spent!==null&&totals.spent>0?totals.revenue/totals.spent:null;
 const filtered=rows.filter(({item,project})=>
  project.id===selectedProjectId&&
  (platformFilter==="all"||item.platform===platformFilter)&&
  (statusFilter==="all"||item.status===statusFilter)&&
  (!monthFilter||(!item.startDate&&!item.endDate)||((!item.startDate||item.startDate<=monthFilter+"-31")&&(!item.endDate||item.endDate>=monthFilter+"-01")))&&
  (project.title+" "+(client(project)?.name??"")+" "+item.title+" "+item.objective).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))
 );
 
 const openNew=()=>{setEditing({...blank});setEditProjectId(selectedProjectId);setError("");setNotice("");};
 const openEdit=(id:string,item:CampaignRecord)=>{setEditing({...item});setEditProjectId(id);setError("");setNotice("");};
 const close=()=>{if(!saving){setEditing(null);setError("");}};
 async function save(){
  if(!editing||saving)return;
  const project=projects.find(p=>p.id===editProjectId);
  if(!project){setError("Selecione um projeto para registrar a campanha.");return;}
  if(editing.title.trim().length<3||editing.title.trim().length>140){setError("O nome da campanha deve ter entre 3 e 140 caracteres.");return;}
  if(editing.objective.length>220||editing.notes.length>1200||editing.resultLabel.length>60){setError("Reduza o texto do objetivo, indicador ou observações.");return;}
  if(!validDate(editing.startDate)||!validDate(editing.endDate)||editing.startDate&&editing.endDate&&editing.endDate<editing.startDate){setError("Confira as datas da campanha.");return;}
  if(!https(editing.dashboardUrl)){setError("Use um link HTTPS para o painel externo.");return;}
  if([editing.budget,editing.spent,editing.results].some(v=>v!==null&&(!Number.isFinite(v)||v<0||v>1e12))||(editing.results!==null&&!Number.isInteger(editing.results))){setError("Investimentos e resultados devem ser valores válidos e não negativos.");return;}
  const current=Array.isArray(project.data?.marketingCampaigns)?project.data.marketingCampaigns as CampaignRecord[]:[];
  const cleaned={...editing,id:editing.id||crypto.randomUUID(),title:editing.title.trim(),objective:editing.objective.trim(),resultLabel:editing.resultLabel.trim()||"Resultados",dashboardUrl:editing.dashboardUrl.trim(),notes:editing.notes.trim(),updatedAt:new Date().toISOString()};
  const next=editing.id?current.map(v=>v.id===editing.id?cleaned:v):[...current,cleaned];
  setSaving(true);setError("");setNotice("");
  try{
   const {data:session,error:sessionError}=await supabase.auth.getSession();
   if(sessionError||!session.session?.access_token){setError("Sessão expirada. Entre novamente.");return;}
   const response=await fetch("/api/admin/project/update",{method:"PATCH",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.session.access_token},body:JSON.stringify({projectId:project.id,expectedUpdatedAt:project.updated_at,data:{...(project.data??{}),marketingCampaigns:next}})});
   if(response.status===409){setError("O projeto foi atualizado em outra sessão. Recarregue a página antes de salvar.");return;}
   if(!response.ok){setError("Não foi possível salvar a campanha. Confira as permissões.");return;}
   const result=await response.json();
   if(!result?.project||typeof result.project.updated_at!=="string"){setError("Não foi possível confirmar o salvamento.");return;}
   onChanged(project.id,result.project.data as Record<string,unknown>,result.project.updated_at);
   setEditing(null);setNotice("Campanha salva no projeto.");
  }catch{setError("Falha de conexão. Tente novamente.");}
  finally{setSaving(false);}
 }
 return <div className="mt-7 space-y-5">
  <section aria-label="Indicadores do projeto" className="rounded-2xl border border-[#E3E7F0] bg-white p-5">
   <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-base font-semibold text-[#090D1C]">Desempenho por projeto</h2><p className="mt-1 text-xs text-[#697386]">Indicadores consolidados apenas dos registros de {monthFilter?monthFilter.split("-").reverse().join("/"):"mês selecionado"} no projeto escolhido. Valores ausentes não são tratados como zero.</p></div><span className="rounded-lg bg-[#F0EBFF] px-3 py-1.5 text-xs font-semibold text-[#6034B7]">{reported.length} de {monthRows.length} campanhas com dados do mês</span></div>
   <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[
     {name:"Campanhas ativas",value:String(scoped.filter(x=>x.item.status==="active").length)},
     {name:"Orçamento cadastrado",value:hasBudget?money(monthlyBudget):"—"},
     {name:"Investimento no mês",value:totals.spent===null?"—":money(totals.spent)},
     {name:"Leads",value:totals.leads===null?"—":totals.leads.toLocaleString("pt-BR")},
     {name:"Custo por lead (CPL)",value:cpl===null?"—":money(cpl)},
     {name:"Agendamentos",value:totals.appointments===null?"—":totals.appointments.toLocaleString("pt-BR")},
     {name:"Vendas",value:totals.sales===null?"—":totals.sales.toLocaleString("pt-BR")},
     {name:"ROAS",value:roas===null?"—":roas.toLocaleString("pt-BR",{maximumFractionDigits:2})+"×"}
    ].map(card=><div key={card.name} className="rounded-xl border border-[#E3E7F0] bg-[#FAFBFD] p-4"><p className="text-xs text-[#697386]">{card.name}</p><p className="mt-2 text-2xl font-bold text-[#090D1C]">{card.value}</p></div>)}
   </div>
   <details className="mt-4 rounded-lg border border-[#E3E7F0] p-3"><summary className="cursor-pointer text-xs font-semibold text-[#6034B7]">Mais métricas de mídia</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
    {name:"Impressões",value:totals.impressions===null?"—":totals.impressions.toLocaleString("pt-BR")},
    {name:"Cliques",value:totals.clicks===null?"—":totals.clicks.toLocaleString("pt-BR")},
    {name:"CTR",value:ctr===null?"—":ctr.toLocaleString("pt-BR",{maximumFractionDigits:2})+"%"},
    {name:"CPC",value:cpc===null?"—":money(cpc)},
    {name:"Receita atribuída",value:totals.revenue===null?"—":money(totals.revenue)}
   ].map(card=><div key={card.name} className="rounded-lg bg-[#F6F7FB] p-3"><p className="text-xs text-[#697386]">{card.name}</p><strong className="mt-1 block text-sm text-[#090D1C]">{card.value}</strong></div>)}</div></details>
   <p className="mt-3 text-xs text-[#697386]">Orçamento cadastrado representa o orçamento total informado por campanha, não o gasto no mês. Alcance único não é somado entre campanhas. Resultados de tipos distintos também não são somados.</p>
  </section>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#090D1C]">Acompanhamento de campanhas</h2><p className="mt-1 text-xs text-[#697386]">Dados informados manualmente. A ROTEVO não altera anúncios nas plataformas externas.</p></div><button type="button" disabled={projects.length===0} onClick={openNew} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#ADE60A] px-4 py-2.5 text-sm font-semibold text-[#090D1C] disabled:cursor-not-allowed disabled:opacity-40"><RotevoTablerIcon name="square-rounded-plus" size={18}/> Nova campanha</button></div>
   <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <label className="text-xs font-semibold text-[#525B70]">Projeto<select aria-label="Filtrar projeto de campanhas" value={selectedProjectId} onChange={e=>setProjectFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-2 py-2.5 text-sm">{projects.map(p=><option key={p.id} value={p.id}>{client(p)?.name??"Cliente"} · {p.title}</option>)}</select></label>
    <label className="text-xs font-semibold text-[#525B70]">Plataforma<select aria-label="Filtrar plataforma" value={platformFilter} onChange={e=>setPlatformFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-2 py-2.5 text-sm"><option value="all">Todas as plataformas</option><option>Google Ads</option><option>Meta Ads</option><option>Outro</option></select></label>
    <label className="text-xs font-semibold text-[#525B70]">Situação<select aria-label="Filtrar situação" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-2 py-2.5 text-sm"><option value="all">Todas as situações</option>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label className="text-xs font-semibold text-[#525B70]">Mês no período da campanha<input type="month" aria-label="Filtrar campanhas por mês ativo" value={monthFilter} onChange={e=>setMonthFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-2 py-2.5 text-sm"/></label>
    <label className="text-xs font-semibold text-[#525B70]">Buscar<input type="search" aria-label="Buscar campanhas" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Campanha ou cliente" className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-2 py-2.5 text-sm"/></label>
   </div>
   <p className="mt-3 text-xs text-[#697386]">{filtered.length} campanha(s) no projeto e filtros selecionados. Os valores de desempenho são registrados por mês, sem duplicar históricos.</p>
   {filtered.length===0?<div className="mt-4 rounded-xl border border-dashed border-[#E3E7F0] p-6 text-center"><p className="text-sm font-semibold">Nenhuma campanha encontrada</p><p className="mt-2 text-xs text-[#697386]">{projects.length===0?"Cadastre um projeto antes de incluir campanhas.":"Cadastre sua primeira campanha ou ajuste os filtros."}</p></div>:
   <div className="mt-4 overflow-x-auto rounded-lg border border-[#E3E7F0]"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-[#F6F7FB] text-[#525B70]"><tr>{["Campanha / Projeto","Plataforma","Situação","Investimento informado","Resultados","Ação"].map(h=><th key={h} scope="col" className="border-b border-[#E3E7F0] px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#E3E7F0]">{filtered.map(({item,project})=><tr key={project.id+":"+item.id} className="hover:bg-[#F8F7FC]"><td className="px-3 py-3"><p className="font-semibold text-[#090D1C]">{item.title}</p><p className="mt-1 text-[#697386]">{client(project)?.name??"Cliente"} · {project.title}</p></td><td className="px-3 py-3">{item.platform}</td><td className="px-3 py-3"><span className={item.status==="active"?"rounded-lg bg-[#E0F5E8] px-2 py-1 text-[#176F40]":item.status==="paused"?"rounded-lg bg-[#FFF1D4] px-2 py-1 text-[#875400]":"rounded-lg bg-[#EEE8FF] px-2 py-1 text-[#6034B7]"}>{statuses[item.status]??item.status}</span></td><td className="px-3 py-3">{item.spent===null?"Não informado":money(item.spent)}</td><td className="px-3 py-3">{item.results===null?"—":item.results+" "+(item.resultLabel||"resultados")}{item.results!==null&&item.results>0&&item.spent!==null&&<span className="mt-1 block text-[#697386]">{money(item.spent/item.results)} por resultado</span>}</td><td className="px-3 py-3"><button type="button" onClick={()=>openEdit(project.id,item)} className="cursor-pointer rounded-lg border border-[#D9C9FA] bg-white px-3 py-2 font-semibold text-[#6034B7]">Gerenciar</button></td></tr>)}</tbody></table></div>}
  </section>
  {editing&&<div className="fixed inset-0 z-[120] flex justify-end"><button type="button" aria-label="Fechar cadastro de campanha" onClick={close} className="absolute inset-0 bg-[#090D1C]/55"/><aside role="dialog" aria-modal="true" aria-label={editing.id?"Editar campanha":"Nova campanha"} className="relative z-10 h-full w-full max-w-[650px] overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
   <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-[#090D1C]">{editing.id?"Gerenciar campanha":"Nova campanha"}</h2><button type="button" disabled={saving} onClick={close} aria-label="Fechar" className="cursor-pointer rounded-lg border border-[#E3E7F0] p-2"><RotevoTablerIcon name="x" size={19}/></button></div>
   <p className="mt-2 text-xs text-[#697386]">Acompanhamento manual por projeto. A configuração real do anúncio continua na plataforma de mídia.</p>
   {error&&<p role="alert" className="mt-4 rounded-lg bg-[#FFF0F1] p-3 text-sm text-[#A3223D]">{error}</p>}
   <div className="mt-5 grid gap-4 sm:grid-cols-2">
    <label className="text-xs font-semibold sm:col-span-2">Projeto<select disabled={!!editing.id} value={editProjectId} onChange={e=>setEditProjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="">Selecione um projeto</option>{projects.map(p=><option key={p.id} value={p.id}>{client(p)?.name??"Cliente"} · {p.title}</option>)}</select></label>
    <label className="text-xs font-semibold sm:col-span-2">Campanha *<input value={editing.title} maxLength={140} onChange={e=>setEditing({...editing,title:e.target.value})} placeholder="Nome usado no gerenciador de anúncios" className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"/></label>
    <label className="text-xs font-semibold">Plataforma<select value={editing.platform} onChange={e=>setEditing({...editing,platform:e.target.value as CampaignPlatform})} className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"><option>Google Ads</option><option>Meta Ads</option><option>Outro</option></select></label>
    <label className="text-xs font-semibold">Situação<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as CampaignStatus})} className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm">{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label className="text-xs font-semibold sm:col-span-2">Objetivo<input value={editing.objective} maxLength={220} onChange={e=>setEditing({...editing,objective:e.target.value})} placeholder="Ex.: captação de leads" className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"/></label>
    <label className="text-xs font-semibold">Início<input type="date" value={editing.startDate} onChange={e=>setEditing({...editing,startDate:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"/></label>
    <label className="text-xs font-semibold">Fim<input type="date" value={editing.endDate} onChange={e=>setEditing({...editing,endDate:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"/></label>
    <label className="text-xs font-semibold">Orçamento planejado (R$)<input type="number" min={0} step="0.01" value={editing.budget??""} onChange={e=>setEditing({...editing,budget:numberOrNull(e.target.value)})} className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"/></label>
    <label className="text-xs font-semibold">Investimento realizado (R$)<input type="number" min={0} step="0.01" value={editing.spent??""} onChange={e=>setEditing({...editing,spent:numberOrNull(e.target.value)})} className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"/></label>
    <label className="text-xs font-semibold">Resultados obtidos<input type="number" min={0} step={1} value={editing.results??""} onChange={e=>setEditing({...editing,results:numberOrNull(e.target.value)})} className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"/></label>
    <label className="text-xs font-semibold">Tipo de resultado<input maxLength={60} value={editing.resultLabel} onChange={e=>setEditing({...editing,resultLabel:e.target.value})} placeholder="Leads, mensagens, vendas..." className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"/></label>
    <label className="text-xs font-semibold sm:col-span-2">Link externo da campanha (HTTPS)<input type="url" value={editing.dashboardUrl} onChange={e=>setEditing({...editing,dashboardUrl:e.target.value})} placeholder="https://ads.google.com/..." className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"/></label>
    {https(editing.dashboardUrl)&&editing.dashboardUrl&&<a href={editing.dashboardUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#6034B7] sm:col-span-2">Abrir painel externo ↗</a>}
    <label className="text-xs font-semibold sm:col-span-2">Observações<textarea rows={3} value={editing.notes} maxLength={1200} onChange={e=>setEditing({...editing,notes:e.target.value})} placeholder="Acompanhamento e próximos ajustes" className="mt-1 w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm"/></label>
   </div>
   <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={saving} onClick={close} className="cursor-pointer rounded-lg border border-[#E3E7F0] px-4 py-2.5 text-sm">Cancelar</button><button type="button" disabled={saving} onClick={()=>void save()} className="cursor-pointer rounded-lg bg-[#ADE60A] px-4 py-2.5 text-sm font-semibold text-[#090D1C] disabled:opacity-50">{saving?"Salvando...":"Salvar campanha"}</button></div>
  </aside></div>}
  {notice&&<p role="status" className="text-xs text-[#21683F]">{notice}</p>}
 </div>;
}
