"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
type Client={id:string;name:string;slug:string;contact_name:string|null;contact_email:string|null;whatsapp:string|null;status:"active"|"paused"|"archived";cover_image_url:string|null;created_at:string};
type Project={id:string;title:string;status:string;clients:{id:string;name:string;slug:string}|{id:string;name:string;slug:string}[]|null};
const empty={name:"",contact_name:"",contact_email:"",whatsapp:""};
const clientOf=(p:Project)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
const slugify=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,65);
export default function ClientsDirectory({projects}:{projects:Project[]}){
 const [clients,setClients]=useState<Client[]>([]),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[success,setSuccess]=useState(""),[query,setQuery]=useState("");
 const [filter,setFilter]=useState("all"),[form,setForm]=useState(false),[saving,setSaving]=useState(false);
 const [fields,setFields]=useState(empty),[selected,setSelected]=useState<string|null>(null);
 async function load(){setLoading(true);const {data,error:e}=await supabase.from("clients").select("id,name,slug,contact_name,contact_email,whatsapp,status,cover_image_url,created_at").order("name");setLoading(false);if(e){setError("Não foi possível carregar os cadastros dos clientes.");return;}setClients((data??[]) as Client[]);}
 useEffect(()=>{void load();},[]);
 const rows=useMemo(()=>clients.filter(c=>(filter==="all"||c.status===filter)&&(c.name+" "+(c.contact_name??"")+" "+(c.contact_email??"")).toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))),[clients,filter,query]);
 const active=clients.filter(c=>c.status==="active").length;
 const linked=(id:string)=>projects.filter(p=>clientOf(p)?.id===id);
 async function create(){
  if(saving)return;
  const name=fields.name.trim();
  if(name.length<3){setError("Informe o nome do cliente com pelo menos 3 caracteres.");return;}
  const slug=slugify(name);
  if(!slug){setError("Informe um nome válido.");return;}
  if(clients.some(c=>c.slug===slug)){setError("Já existe um cliente com esse identificador. Verifique a lista antes de cadastrar.");return;}
  setSaving(true);setError("");setSuccess("");
  const {data,error:e}=await supabase.from("clients").insert({name,slug,contact_name:fields.contact_name.trim()||null,contact_email:fields.contact_email.trim()||null,whatsapp:fields.whatsapp.trim()||null,status:"active"}).select("id,name,slug,contact_name,contact_email,whatsapp,status,cover_image_url,created_at").single();
  setSaving(false);
  if(e){setError(e.code==="23505"?"Já existe um cliente com esse identificador.":"Não foi possível cadastrar o cliente. Verifique suas permissões.");return;}
  setClients(prev=>[...prev,data as Client].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")));
  setForm(false);setFields(empty);setSuccess("Cliente cadastrado. Você poderá vinculá-lo a um projeto na próxima etapa de integração do formulário.");
 }
 const current=clients.find(c=>c.id===selected);
 return <div className="mt-7 space-y-5">
  <div className="grid gap-3 sm:grid-cols-3">
   {[{label:"Clientes cadastrados",value:clients.length},{label:"Ativos",value:active},{label:"Pausados ou arquivados",value:clients.length-active}].map(m=><div key={m.label} className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><p className="text-sm text-[#697386]">{m.label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{loading?"…":m.value}</p></div>)}
  </div>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Cadastro de clientes</h2><p className="mt-2 text-sm text-[#697386]">Um cliente pode ter vários projetos. Contratos e financeiro serão vinculados posteriormente.</p></div>
   <button type="button" onClick={()=>{setForm(x=>!x);setError("");}} className="cursor-pointer rounded-xl bg-[#A7E000] px-4 py-3 text-sm font-semibold text-[#090D1C]">+ Novo cliente</button></div>
   {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {success&&<p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
   {form&&<div className="mt-5 rounded-xl border border-[#DED5F5] bg-[#FCFBFF] p-4"><h3 className="font-semibold">Novo cliente</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{([{key:"name",label:"Nome ou empresa *"},{key:"contact_name",label:"Pessoa de contato"},{key:"contact_email",label:"E-mail de contato"},{key:"whatsapp",label:"WhatsApp"}] as const).map(f=><label key={f.key} className="text-xs font-medium">{f.label}<input value={fields[f.key]} type={f.key==="contact_email"?"email":"text"} onChange={e=>setFields(v=>({...v,[f.key]:e.target.value}))} className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-3 text-sm"/></label>)}</div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setForm(false)} className="cursor-pointer rounded-lg border px-4 py-2 text-sm">Cancelar</button><button type="button" disabled={saving} onClick={()=>void create()} className="cursor-pointer rounded-lg bg-[#0B142A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?"Salvando...":"Cadastrar cliente"}</button></div></div>}
   <div className="mt-5 flex flex-wrap gap-2"><input aria-label="Buscar cliente" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente ou contato" className="min-w-0 flex-1 rounded-xl border border-[#DDE1EA] px-3 py-3 text-sm"/><select aria-label="Filtrar situação" value={filter} onChange={e=>setFilter(e.target.value)} className="cursor-pointer rounded-xl border border-[#DDE1EA] px-3 py-3 text-sm"><option value="all">Todos</option><option value="active">Ativos</option><option value="paused">Pausados</option><option value="archived">Arquivados</option></select></div>
   {loading?<p className="mt-5 text-sm text-[#697386]">Carregando clientes...</p>:rows.length===0?<p className="mt-5 rounded-lg bg-[#F6F7FB] p-4 text-sm text-[#697386]">Nenhum cliente encontrado.</p>:
    <div className="mt-4 divide-y divide-[#E3E7F0]">{rows.map(c=><div key={c.id} className="flex flex-wrap items-center gap-3 py-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEE8FF] font-semibold text-[#6D35F5]">{c.cover_image_url?<img src={c.cover_image_url} alt="" className="h-full w-full object-cover"/>:c.name.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{c.name}</p><p className="mt-1 text-xs text-[#697386]">{linked(c.id).length} projeto(s) · {c.contact_name||"Sem contato cadastrado"}</p></div><span className={`rounded-md px-2.5 py-1 text-xs font-medium ${c.status==="active"?"bg-[#E5F6E9] text-[#166B3F]":c.status==="paused"?"bg-[#FFF1DB] text-[#94610A]":"bg-[#E9ECF2] text-[#5A6272]"}`}>{c.status==="active"?"Ativo":c.status==="paused"?"Pausado":"Arquivado"}</span><button type="button" onClick={()=>setSelected(c.id===selected?null:c.id)} className="cursor-pointer rounded-lg border border-[#E3E7F0] px-3 py-2 text-xs font-semibold">{selected===c.id?"Fechar":"Detalhes"}</button></div>)}</div>}
  </section>
  {current&&<section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">{current.name}</h2><p className="mt-2 text-sm text-[#697386]">{current.contact_name||"Contato não informado"} · {current.contact_email||"E-mail não informado"} · {current.whatsapp||"WhatsApp não informado"}</p><h3 className="mt-6 text-base font-semibold">Projetos vinculados</h3><div className="mt-3 space-y-3">{linked(current.id).length?linked(current.id).map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E3E7F0] p-3"><p className="text-sm font-medium">{p.title}</p><Link href={`/admin/planejamentos/${current.slug}`} className="text-sm font-semibold text-[#6D35F5]">Gerenciar →</Link></div>):<p className="text-sm text-[#697386]">Nenhum projeto vinculado.</p>}</div><p className="mt-5 rounded-xl bg-[#F6F7FB] p-3 text-xs text-[#697386]">Onboarding, contratos, vencimentos, inadimplência e demais indicadores ainda dependem de seus cadastros específicos. Nenhum status financeiro é inferido.</p></section>}
 </div>;
}
