"use client";
import {useState} from "react";
import {planningAreas,normalizedPlanningAreaSchedule,type PlanningAreaDelivery} from "@/lib/planning/areaSchedule";
import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";

type Props={initial:PlanningAreaDelivery[];selectedDocumentCodes:string[];onSave:(value:PlanningAreaDelivery[])=>Promise<void>};
const defaults=(selectedDocumentCodes:string[])=>planningAreas.filter(area=>selectedDocumentCodes.some(code=>code.startsWith(area.slice(0,2)+"."))).map(area=>({area,dueDate:"",status:"pending" as const,visibleToClient:true}));
const statuses:{id:PlanningAreaDelivery["status"];name:string}[]=[{id:"pending",name:"Não iniciada"},{id:"in_progress",name:"Em elaboração"},{id:"review",name:"Em revisão"},{id:"completed",name:"Concluída internamente"}];

export default function PlanningAreaScheduleEditor({initial,selectedDocumentCodes,onSave}:Props){
 const available=defaults(selectedDocumentCodes);
 const initialRows=available.map(row=>initial.find(value=>value.area===row.area)??row);
 const incoming=JSON.stringify(initialRows);
 const [rows,setRows]=useState<PlanningAreaDelivery[]>(initialRows);
 const [baseline,setBaseline]=useState(incoming);
 const [seen,setSeen]=useState(incoming);
 const [saving,setSaving]=useState(false),[message,setMessage]=useState("");
 const dirty=JSON.stringify(rows)!==baseline;
 if(seen!==incoming){setSeen(incoming);if(!dirty){setRows(initialRows);setBaseline(incoming);}}
 useUnsavedChanges(dirty);
 const modify=(area:string,patch:Partial<PlanningAreaDelivery>)=>setRows(items=>items.map(item=>item.area===area?{...item,...patch}:item));
 return <section className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8 lg:px-10">
  <div className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
   <div className="flex items-center gap-2"><RotevoTablerIcon name="calendar" size={23}/><h2 className="text-xl font-bold">Liberação das áreas estratégicas</h2></div>
   <p className="mt-2 text-sm leading-6 text-[#525B70]">Configure o prazo previsto e o andamento de cada área do planejamento. O cliente verá as áreas autorizadas e suas datas. Concluir uma área ou informar uma data não publica seus documentos automaticamente.</p>
   <div className="mt-5 space-y-3">{rows.map(row=><div key={row.area} className="grid items-center gap-3 rounded-xl border border-[#E3E7F0] bg-[#FAFBFD] p-4 md:grid-cols-[minmax(185px,1fr)_160px_185px_100px]">
    <div><strong className="text-sm text-[#101828]">{row.area}</strong><p className="mt-1 text-xs text-[#697386]">Publicação individual em Configurar documentos e no editor</p></div>
    <label className="text-xs font-semibold text-[#525B70]">Previsão<input type="date" value={row.dueDate} onChange={e=>modify(row.area,{dueDate:e.target.value})} disabled={saving} className="mt-1 block w-full rounded-lg border border-[#DDE2ED] bg-white p-2.5 text-sm"/></label>
    <label className="text-xs font-semibold text-[#525B70]">Andamento<select value={row.status} onChange={e=>modify(row.area,{status:e.target.value as PlanningAreaDelivery["status"]})} disabled={saving} className="mt-1 block w-full rounded-lg border border-[#DDE2ED] bg-white p-2.5 text-sm">{statuses.map(status=><option key={status.id} value={status.id}>{status.name}</option>)}</select></label>
    <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={row.visibleToClient} onChange={e=>modify(row.area,{visibleToClient:e.target.checked})} disabled={saving}/>Visível</label>
   </div>)}</div>
   {!rows.length&&<p className="mt-4 rounded-lg bg-[#F7F8FB] p-4 text-sm text-[#697386]">Selecione os documentos do planejamento antes de cadastrar previsões por área.</p>}
   <div className="mt-5 flex items-center justify-between gap-3"><p role="status" className="text-sm text-[#697386]">{message}</p><button type="button" disabled={saving||!dirty||!rows.length} onClick={async()=>{setSaving(true);setMessage("");try{const retained=normalizedPlanningAreaSchedule(initial).filter(item=>!available.some(row=>row.area===item.area));const next=[...retained,...rows];await onSave(next);setBaseline(JSON.stringify(rows));setMessage("Previsões por área salvas.");}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível salvar.");}finally{setSaving(false);}}} className="cursor-pointer rounded-xl bg-[#0B142A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{saving?"Salvando…":"Salvar cronograma por área"}</button></div>
  </div>
 </section>;
}
