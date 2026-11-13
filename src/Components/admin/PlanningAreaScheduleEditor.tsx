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
 return <section className="rv-ui3-area-schedule mx-auto w-full max-w-none px-5 pt-4 sm:px-8 lg:px-10">
  <div className="bg-white py-3">
   <div className="flex items-center gap-2"><RotevoTablerIcon name="calendar" size={17} stroke={1.55}/><h2 className="text-base font-semibold">Cronograma por área</h2></div>
   <p className="mt-2 text-xs leading-5 text-[#687487]">Configure o prazo previsto e o andamento de cada área do planejamento. O cliente verá as áreas autorizadas e suas datas. Concluir uma área ou informar uma data não publica seus documentos automaticamente.</p>
   <div className="mt-4 border-y border-[#E3E6ED]"><div className="hidden gap-3 bg-[#F8F9FB] px-3 py-2 text-[11px] font-semibold text-[#687487] md:grid md:grid-cols-[minmax(185px,1fr)_160px_185px_100px]"><span>Área estratégica</span><span>Previsão</span><span>Andamento</span><span>Cliente</span></div>{rows.map(row=><div key={row.area} className="grid items-center gap-3 border-t border-[#E3E6ED] bg-white px-3 py-3 first:border-t-0 hover:bg-[#FAFBFE] md:grid-cols-[minmax(185px,1fr)_160px_185px_100px]">
    <div><strong className="text-sm font-medium text-[#323647]">{row.area}</strong></div>
    <label className="text-[11px] font-medium text-[#687487] md:text-[0px]">Previsão<input type="date" value={row.dueDate} onChange={e=>modify(row.area,{dueDate:e.target.value})} disabled={saving} className="mt-1 block w-full rounded-lg border border-[#DDE2ED] bg-white p-2.5 text-sm"/></label>
    <label className="text-[11px] font-medium text-[#687487] md:text-[0px]">Andamento<select value={row.status} onChange={e=>modify(row.area,{status:e.target.value as PlanningAreaDelivery["status"]})} disabled={saving} className="mt-1 block w-full rounded-lg border border-[#DDE2ED] bg-white p-2.5 text-sm">{statuses.map(status=><option key={status.id} value={status.id}>{status.name}</option>)}</select></label>
    <label className="flex items-center gap-2 text-xs font-medium text-[#687487]"><input type="checkbox" checked={row.visibleToClient} onChange={e=>modify(row.area,{visibleToClient:e.target.checked})} disabled={saving}/>Visível</label>
   </div>)}</div>
   {!rows.length&&<p className="mt-4 rounded-lg bg-[#F7F8FB] p-4 text-sm text-[#697386]">Selecione os documentos do planejamento antes de cadastrar previsões por área.</p>}
   <div className="mt-5 flex items-center justify-between gap-3"><p role="status" className="text-sm text-[#697386]">{message}</p><button type="button" disabled={saving||!dirty||!rows.length} onClick={async()=>{setSaving(true);setMessage("");try{const retained=normalizedPlanningAreaSchedule(initial).filter(item=>!available.some(row=>row.area===item.area));const next=[...retained,...rows];await onSave(next);setBaseline(JSON.stringify(rows));setMessage("Previsões por área salvas.");}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível salvar.");}finally{setSaving(false);}}} className="min-h-10 cursor-pointer rounded-lg bg-[#6C5CE7] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#5949D1] disabled:opacity-40">{saving?"Salvando…":"Salvar cronograma por área"}</button></div>
  </div>
 </section>;
}
