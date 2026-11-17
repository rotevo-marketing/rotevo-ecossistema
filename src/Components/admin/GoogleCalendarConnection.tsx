"use client";
import {useEffect,useRef,useState} from "react";
import {request} from "@/lib/operations/api";

type Connection={connected:boolean;account?:string;expired?:boolean;selectedCalendarId?:string|null;calendars?:{id:string;title:string;primary:boolean;meet:boolean}[]};
const endpoint="/api/admin/google-calendar";
export default function GoogleCalendarConnection(){
 const [connection,setConnection]=useState<Connection|null>(null);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState("");
 const initial=useRef<Promise<Connection>|null>(null);
 useEffect(()=>{
  const current=new URL(window.location.href);
  const status=current.searchParams.get("googleCalendar");
  if(status){
   current.searchParams.delete("googleCalendar");
   window.history.replaceState(window.history.state,"",current);
   if(status==="error")setError("Não foi possível autorizar o Google Calendar. Inicie uma nova conexão.");
  }
  initial.current??=status==="returned"?request<Connection>(endpoint,"POST",{action:"finish"}):request<Connection>(endpoint);
  let active=true;
  void initial.current.then(result=>{if(active)setConnection(result);})
   .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:"Falha na conexão.");})
   .finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;};
 },[]);
 async function change(action:"start"|"select"|"disconnect",id?:string){
  if(busy)return;
  setBusy(true);setError("");
  try{
   if(action==="start"){
    const result=await request<{url:string}>(endpoint,"POST",{action});
    window.location.assign(result.url);
   }else if(action==="disconnect"){
    setConnection(await request<Connection>(endpoint,"DELETE"));
   }else{
    const result=await request<{selectedCalendarId:string}>(endpoint,"POST",{action,id});
    setConnection(prev=>prev?{...prev,selectedCalendarId:result.selectedCalendarId}:prev);
   }
  }catch(cause){setError(cause instanceof Error?cause.message:"Falha na conexão.");}
  finally{setBusy(false);}
 }
 return <section aria-label="Google Calendar" className="my-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
  <div><h3 className="font-semibold">Google Calendar</h3>
   <p className="mt-1 text-xs">{connection?.expired?"Autorização expirada":connection?.connected?connection.account:"Conta não conectada"}</p>
  </div>
  <div className="flex flex-wrap items-center gap-2">
   {connection?.connected&&!connection.expired&&<label className="text-xs">Calendário de destino
    <select className="ml-2 max-w-[220px] rounded-md border p-2" disabled={busy} value={connection.selectedCalendarId??""} onChange={e=>void change("select",e.target.value)}>
     <option value="" disabled>Selecione um calendário</option>
     {connection.calendars?.map(calendar=><option key={calendar.id} value={calendar.id}>{calendar.title}</option>)}
    </select>
   </label>}
   {(!connection?.connected||connection.expired)&&<button type="button" disabled={busy} className="rounded-lg border px-3 py-2" onClick={()=>void change("start")}>{connection?.expired?"Reconectar conta":"Conectar conta"}</button>}
   {connection?.connected&&<button type="button" disabled={busy} className="rounded-lg border px-3 py-2" onClick={()=>{if(window.confirm("Desconectar esta conta do Google Calendar?"))void change("disconnect");}}>Desconectar conta</button>}
  </div>
  {error&&<p role="alert" className="w-full text-xs text-[#B43D4C]">{error}</p>}
 </section>;
}
