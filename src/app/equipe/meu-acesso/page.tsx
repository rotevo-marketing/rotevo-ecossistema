"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";
import {RotevoLogo} from "@/Components/RotevoLogo";
import DialogFocus from "@/Components/ui/DialogFocus";
import ProjectConversation from "@/Components/shared/ProjectConversation";
import {request} from "@/lib/operations/api";
type ConversationItem={id:string;title:string;type:"task"|"content"};
type ConversationItems={items:ConversationItem[];canWrite:boolean};
type Summary={displayName:string;role:string;permissions:string[];assignedProjectCount:number;projects:{id:string;title:string}[]};
export default function RestrictedTeamHome(){
 const router=useRouter();
 const [leaving,setLeaving]=useState(false);
 const [discussion,setDiscussion]=useState<{projectId:string;projectTitle:string;items:ConversationItem[];canWrite:boolean}|null>(null);
 const [selectedItem,setSelectedItem]=useState<ConversationItem|null>(null);
 const [discussionPending,setDiscussionPending]=useState(false);
 const [discussionError,setDiscussionError]=useState("");
 async function openDiscussion(project:{id:string;title:string}){
  if(discussionPending)return;
  setDiscussionPending(true);setDiscussionError("");setSelectedItem(null);
  try{
   const result=await request<ConversationItems>("/api/team/my-access?"+new URLSearchParams({conversationProject:project.id}));
   setDiscussion({projectId:project.id,projectTitle:project.title,...result});
  }catch{setDiscussionError("Não foi possível consultar as conversas desse projeto.");}
  finally{setDiscussionPending(false);}
 }
 function closeDiscussion(){setDiscussion(null);setSelectedItem(null);}
 const [data,setData]=useState<Summary|null>(null),[state,setState]=useState("Verificando acesso...");
 useEffect(()=>{let live=true;(async()=>{
  try{
   const {data:session,error}=await supabase.auth.getSession();
   if(error||!session.session)throw new Error("Faça login para continuar.");
   const response=await fetch("/api/team/my-access",{headers:{Authorization:`Bearer ${session.session.access_token}`},cache:"no-store"});
   if(!response.ok)throw new Error(response.status===403?"Seu acesso ainda não foi liberado pelo administrador.":"Não foi possível verificar o acesso.");
   const result=await response.json() as Summary;
   if(live){setData(result);setState("");}
  }catch(e){if(live)setState(e instanceof Error?e.message:"Acesso indisponível.");}
 })();return()=>{live=false};},[]);
 async function logout(){setLeaving(true);const {error}=await supabase.auth.signOut();if(error){setState("Não foi possível sair. Tente novamente.");setLeaving(false);return;}router.replace("/estrategista/login");}
 return <main className="mx-auto max-w-3xl px-6 py-12"><header className="mb-8 flex items-center justify-between gap-4"><RotevoLogo/><button type="button" disabled={leaving} onClick={()=>void logout()} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{leaving?"Saindo...":"Sair"}</button></header><h1 className="text-2xl font-semibold">Área da equipe ROTEVO</h1>
 {state?<p role="status" className="mt-5 text-sm">{state}</p>:data&&<section className="mt-6 rounded-xl border p-5">
  <h2 className="text-lg font-medium">Olá, {data.displayName}</h2>
  <p className="mt-2 text-sm">Projetos atribuídos: {data.assignedProjectCount}</p>
  <p className="mt-2 text-sm">Acesso: {data.permissions.includes("projects.read")?"Consultar nomes dos projetos atribuídos":"Nenhuma permissão de consulta concedida"}</p>
  {data.permissions.includes("finance.read")&&<Link href="/equipe/financeiro" className="mt-5 inline-block rounded-lg bg-[#6D35F5] px-4 py-2.5 text-sm font-semibold text-white">Acessar Financeiro</Link>}
  <h3 className="mt-5 font-semibold">Nomes dos projetos liberados</h3>
  {data.projects.length?<ul className="mt-2 list-disc pl-5 text-sm">{data.projects.map(project=><li key={project.id}>{project.title}{process.env.NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED==="true"&&<button type="button" disabled={discussionPending} onClick={()=>void openDiscussion(project)} className="ml-2 min-h-9 rounded-lg px-2 text-[#5123C5] underline">Conversas de {project.title}</button>}</li>)}</ul>:<p className="mt-2 text-sm">Nenhum projeto com permissão de leitura.</p>}
  <p className="mt-4 text-sm text-gray-600">O acesso aos documentos e às operações exige autorização adicional e não está disponível nesta área.</p>
 </section>}
 {discussionError&&<p role="alert" className="mt-4 text-sm text-red-700">{discussionError}</p>}
 {discussion&&<div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#090D1C]/55 p-3">
  <section role="dialog" aria-modal="true" aria-label={selectedItem?"Detalhes: "+selectedItem.title:"Conversas do projeto"} className="max-h-[94dvh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-xl">
   <DialogFocus onClose={closeDiscussion}/>
   <header className="mb-4 flex items-center justify-between gap-3 border-b border-[#E3E7F0] pb-3"><h2 className="text-sm font-semibold">{discussion.projectTitle}</h2><button type="button" onClick={closeDiscussion} className="min-h-9 rounded-lg border px-3">Fechar</button></header>
   {selectedItem?<><button type="button" onClick={()=>setSelectedItem(null)} className="min-h-9 text-sm font-medium text-[#5123C5]">Voltar aos itens</button><h3 className="mb-3 text-lg font-semibold">{selectedItem.title}</h3><ProjectConversation key={selectedItem.type+":"+selectedItem.id} projectId={discussion.projectId} resourceType={selectedItem.type} resourceId={selectedItem.id} readOnly={!discussion.canWrite}/></>:discussion.items.length?<ul className="divide-y divide-[#E3E7F0]">{discussion.items.map(entry=><li key={entry.type+":"+entry.id}><button type="button" onClick={()=>setSelectedItem(entry)} className="min-h-10 w-full py-2 text-left text-sm text-[#5123C5]">{entry.type==="task"?"Tarefa":"Conteúdo"}: {entry.title}</button></li>)}</ul>:<p className="text-sm">Nenhuma tarefa ou conteúdo compartilhado.</p>}
  </section>
 </div>}
 <Link href="/estrategista/login" className="mt-6 inline-block text-sm font-medium text-[#6D35F5] underline">Voltar ao login</Link></main>;
}
