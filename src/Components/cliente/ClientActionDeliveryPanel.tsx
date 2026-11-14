"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {request} from "@/lib/operations/api";
import {validGoogleDriveUrl} from "@/lib/workflow/clientActionsContract";

type Project={id:string;title:string};
type Action={id:string;projectId:string;projectTitle:string;resourceType:"content"|"task";resourceId:string;resourceVersion:string|null;actionType:string;instructions:string;dueDate:string|null;status:string};
type Draft={url:string;note:string;requestKey:string};
const editable=(status:string)=>["pending","in_progress","correction_requested"].includes(status);

/** Never accepts a binary file. Client uploads directly to Google Drive and pastes a URL. */
export default function ClientActionDeliveryPanel({projects}:{projects:Project[]}){
 const [items,setItems]=useState<Action[]>([]);
 const [urls,setUrls]=useState<Record<string,string>>({});
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [drafts,setDrafts]=useState<Record<string,Draft>>({});
 const [busy,setBusy]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [revision,setRevision]=useState(0);
 const ids=projects.map(p=>p.id).sort().join("|");
 useEffect(()=>{
  let active=true;let userId="";
  setItems([]);setLoading(true);setError("");
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   // INITIAL_SESSION may temporarily be null during hydration. Do not permanently
   // disable the query before getUser() resolves; only actual sign-out/account switch invalidates it.
   if(event==="SIGNED_OUT"||(userId&&session?.user&&session.user.id!==userId)){
    active=false;setItems([]);setUrls({});setNotes({});setDrafts({});setBusy("");setError("Sessão alterada.");setLoading(false);
   }
  });
  void (async()=>{
   try{
    const {data,error:authError}=await supabase.auth.getUser();
    if(authError||!data.user)throw Error("Sessão expirada.");userId=data.user.id;
    const results=await Promise.allSettled(projects.map(async p=>{
     const query=new URLSearchParams({projectId:p.id,expectedAuthorUserId:userId});
     const r=await request<{assignments:Omit<Action,"projectTitle">[]}>("/api/workflow/client-actions?"+query);
     return (r.assignments??[]).map(a=>({...a,projectTitle:p.title}));
    }));
    if(!active)return;
    const valid=results.filter((r):r is PromiseFulfilledResult<Action[]>=>r.status==="fulfilled");
    setItems(valid.flatMap(r=>r.value));
    if(valid.length!==results.length)setError("Alguns projetos não puderam ser consultados.");
   }catch(e){if(active)setError(e instanceof Error?e.message:"Não foi possível consultar suas entregas.");}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;subscription.unsubscribe();};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ids,revision]);
 async function submit(item:Action){
  if(busy||!editable(item.status))return;
  const url=(urls[item.id]??"").trim(),note=(notes[item.id]??"").trim();
  if(!validGoogleDriveUrl(url)){setError("Cole um link válido do Google Drive.");return;}
  setBusy(item.id);setError("");
  const draft=drafts[item.id];
  if(draft&&(draft.url!==url||draft.note!==note)){
   setBusy("");setError("A tentativa anterior está pendente. Mantenha o link e a observação até confirmar o envio.");return;
  }
  const current=draft??{url,note,requestKey:"client-drive:"+crypto.randomUUID()};
  if(!draft)setDrafts(v=>({...v,[item.id]:current}));
  try{
   const {data,error:authError}=await supabase.auth.getUser();
   if(authError||!data.user)throw Error("Sessão expirada.");
   const userId=data.user.id;
   const result=await request<{submission:{id:string}}>(
    "/api/workflow/client-actions/submit","POST",{
     assignmentId:item.id,driveUrl:current.url,note:current.note,
     requestKey:current.requestKey,expectedAuthorUserId:userId
    });
   const identity=await supabase.auth.getUser();
   if(identity.error||identity.data.user?.id!==userId)throw Error("A sessão mudou.");
   if(!result.submission?.id)throw Error("A entrega não foi confirmada.");
   setItems(v=>v.map(x=>x.id===item.id?{...x,status:"submitted"}:x));
   setUrls(v=>({...v,[item.id]:""}));setNotes(v=>({...v,[item.id]:""}));
   setDrafts(v=>{const next={...v};delete next[item.id];return next;});
   setRevision(v=>v+1);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível registrar o link da entrega.");}
  finally{setBusy("");}
 }
 return <section data-ui3-client-actions aria-label="Minhas entregas atribuídas" className="rounded-xl border border-[#E3E6ED] bg-white p-4">
  <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Atribuídas a mim</h3><span className="text-xs text-[#697386]">{loading?"…":items.length}</span></div>
  <p className="mt-1 text-xs text-[#697386]">Grave ou prepare o material no Google Drive e cole o link aqui. A Rotevo não armazena arquivos.</p>
  {error&&<p role="alert" className="mt-2 text-xs text-[#A83E3E]">{error}</p>}
  {loading?<p role="status" className="mt-3 text-xs">Consultando entregas…</p>
  :items.length===0?<p className="mt-3 text-xs text-[#697386]">Nenhuma entrega atribuída.</p>
  :<ul className="mt-3 divide-y">{items.slice(0,20).map(item=><li key={item.id} className="space-y-2 py-3">
    <div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-semibold">{item.projectTitle} · {item.actionType}</p><span className="text-xs text-[#697386]">{item.status}</span></div>
    <p className="text-xs text-[#525B70]">{item.instructions}</p>
    {editable(item.status)&&<>
     <label className="block text-xs font-medium">Link do arquivo no Google Drive
      <input type="url" required maxLength={2048} value={urls[item.id]??""}
       onChange={e=>setUrls(v=>({...v,[item.id]:e.target.value}))}
       placeholder="https://drive.google.com/file/d/..."
       className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-2 text-xs"/></label>
     <p className="text-[11px] text-[#697386]">Confira se a equipe da Rotevo tem permissão para visualizar o material no Drive.</p>
     <label className="block text-xs font-medium">Observação (opcional)
      <textarea maxLength={4000} rows={2} value={notes[item.id]??""}
       onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))}
       className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-2 text-xs"/></label>
     <button type="button" disabled={!!busy} onClick={()=>void submit(item)}
      className="rounded-lg bg-[#6C5CE7] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
      {busy===item.id?"Enviando…":"Enviar link para validação"}</button>
    </>}
   </li>)}</ul>}
 </section>;
}
