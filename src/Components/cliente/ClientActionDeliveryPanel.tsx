"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {request} from "@/lib/operations/api";

type Project={id:string;title:string};
type Action={id:string;projectId:string;projectTitle:string;resourceType:"content"|"task";resourceId:string;resourceVersion:string|null;actionType:string;instructions:string;dueDate:string|null;status:string};
type Retry={path:string;key:string;note:string};
const types:Record<string,string>={"application/pdf":"pdf","image/jpeg":"jpg","image/png":"png","image/webp":"webp","video/mp4":"mp4","video/quicktime":"mov"};
const editable=(s:string)=>["pending","in_progress","correction_requested"].includes(s);
export default function ClientActionDeliveryPanel({projects}:{projects:Project[]}){
 const [items,setItems]=useState<Action[]>([]),[notes,setNotes]=useState<Record<string,string>>({});
 const [files,setFiles]=useState<Record<string,File|undefined>>({});
 const [retries,setRetries]=useState<Record<string,Retry>>({});
 const [busy,setBusy]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [revision,setRevision]=useState(0);
 const ids=projects.map(p=>p.id).sort().join("|");
 useEffect(()=>{
  let active=true;let userId="";
  setItems([]);setLoading(true);setError("");
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(!session?.user||(userId&&session.user.id!==userId)){
    active=false;setItems([]);setNotes({});setFiles({});setRetries({});setBusy("");setError("");
   }
  });
  void (async()=>{
   try{
    const {data,error:authError}=await supabase.auth.getUser();
    if(authError||!data.user)throw Error("Sessão expirada.");userId=data.user.id;
    const results=await Promise.allSettled(projects.map(async project=>{
     const q=new URLSearchParams({projectId:project.id,expectedAuthorUserId:userId});
     const r=await request<{assignments:Omit<Action,"projectTitle">[]}>("/api/workflow/client-actions?"+q);
     return (r.assignments??[]).map(a=>({...a,projectTitle:project.title}));
    }));
    if(!active)return;
    const good=results.filter((r):r is PromiseFulfilledResult<Action[]>=>r.status==="fulfilled");
    setItems(good.flatMap(r=>r.value));
    if(good.length!==results.length)setError("Alguns projetos não puderam ser consultados.");
   }catch(e){if(active)setError(e instanceof Error?e.message:"Falha ao consultar entregas.");}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;subscription.unsubscribe();};
 // Membership key, not props identity, controls refresh.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ids,revision]);
 async function submit(item:Action){
  if(busy||!editable(item.status))return;
  const note=(notes[item.id]??"").trim(),file=files[item.id];
  if(note.length<3){setError("Descreva a entrega com pelo menos três caracteres.");return;}
  if(file&&process.env.NEXT_PUBLIC_ROTEVO_PRIVATE_DELIVERIES_ENABLED!=="true"){setError("Anexos não habilitados.");return;}
  if(file&&(!types[file.type]||file.size<1||file.size>25*1024*1024)){setError("Use PDF, imagem ou vídeo de até 25 MB.");return;}
  setBusy(item.id);setError("");
  try{
   const {data,error:authError}=await supabase.auth.getUser();
   if(authError||!data.user)throw Error("Sessão expirada.");
   const userId=data.user.id;
   let retry=retries[item.id];
   if(file){
    if(retry&&retry.note!==note)throw Error("Conclua a tentativa anterior antes de alterar a descrição.");
    if(!retry){
     const path=item.id+"/"+userId+"/"+crypto.randomUUID()+"."+types[file.type];
     const {error:uploadError}=await supabase.storage.from("rotevo-client-deliveries").upload(path,file,{upsert:false,contentType:file.type,cacheControl:"60"});
     if(uploadError)throw Error("O upload privado não pôde ser concluído.");
     retry={path,key:"client-submit:"+crypto.randomUUID(),note};setRetries(v=>({...v,[item.id]:retry!}));
    }
   }
   const identity=await supabase.auth.getUser();
   if(identity.error||identity.data.user?.id!==userId)throw Error("A sessão mudou.");
   const path=file?"/api/workflow/client-actions/submit-asset":"/api/workflow/client-actions/submit";
   const args={assignmentId:item.id,note,requestKey:retry?.key??"client-submit:"+crypto.randomUUID(),expectedAuthorUserId:userId};
   const result=await request<{submission:{id:string}}>(path,"POST",file?{...args,privateStoragePath:retry!.path}:args);
   if(!result.submission?.id)throw Error("Envio não confirmado.");
   setItems(v=>v.map(x=>x.id===item.id?{...x,status:"submitted"}:x));setNotes(v=>({...v,[item.id]:""}));setFiles(v=>({...v,[item.id]:undefined}));
   setRetries(v=>{const next={...v};delete next[item.id];return next;});setRevision(v=>v+1);
  }catch(e){setError(e instanceof Error?e.message:"Falha no envio.");}
  finally{setBusy("");}
 }
 return <section data-ui3-client-actions aria-label="Minhas entregas atribuídas" className="rounded-xl border border-[#E3E6ED] bg-white p-4">
  <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Minhas entregas</h3><span className="text-xs text-[#697386]">{loading?"…":items.length}</span></div>
  <p className="mt-1 text-xs text-[#697386]">Somente atividades atribuídas à sua conta.</p>
  {error&&<p role="alert" className="mt-2 text-xs text-[#A83E3E]">{error}</p>}
  {loading?<p role="status" className="mt-3 text-xs">Consultando entregas…</p>:items.length===0?<p className="mt-3 text-xs text-[#697386]">Nenhuma entrega atribuída.</p>
  :<ul className="mt-3 divide-y">{items.slice(0,20).map(item=><li key={item.id} className="space-y-2 py-3">
   <div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-semibold">{item.projectTitle} · {item.actionType}</p><span className="text-xs text-[#697386]">{item.status}</span></div>
   <p className="text-xs text-[#525B70]">{item.instructions}</p>
   {editable(item.status)&&<>
    <label className="block text-xs">Descrição da entrega<textarea maxLength={4000} rows={2} value={notes[item.id]??""} onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))} className="mt-1 w-full rounded-lg border p-2 text-xs"/></label>
    {process.env.NEXT_PUBLIC_ROTEVO_PRIVATE_DELIVERIES_ENABLED==="true"&&<label className="block text-xs">Anexo opcional (25 MB)<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov" disabled={!!busy} onChange={e=>setFiles(v=>({...v,[item.id]:e.target.files?.[0]}))} className="mt-1 block w-full text-xs"/></label>}
    <button type="button" disabled={!!busy} onClick={()=>void submit(item)} className="rounded-lg bg-[#6C5CE7] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy===item.id?"Enviando…":"Enviar para validação"}</button>
   </>}
  </li>)}</ul>}
 </section>;
}
