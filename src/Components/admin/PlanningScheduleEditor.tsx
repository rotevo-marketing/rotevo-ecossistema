"use client";
import {useState} from "react";
import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import {validPlanningStages,type PlanningStage} from "@/lib/planning/stages";
export type {PlanningStage} from "@/lib/planning/stages";
export const defaultPlanningStages=[{id:"diagnosis",title:"Investigação e Diagnóstico"},{id:"analysis",title:"Análises Estratégicas"},{id:"strategy",title:"Construção da Estratégia"},{id:"consolidation",title:"Consolidação do Planejamento"},{id:"delivery",title:"Apresentação e Entrega"}] as const;
export function safePlanningStages(value:unknown):PlanningStage[]{
 if(!Array.isArray(value))return [];
 const rows:PlanningStage[]=[];
 for(const row of value){if(validPlanningStages([row])&&!rows.some(r=>r.id===row.id))rows.push(row as PlanningStage);if(rows.length===15)break;}
 return rows;
}
export default function PlanningScheduleEditor({initial,onSave}:{initial:PlanningStage[];onSave:(stages:PlanningStage[])=>Promise<void>}){
 const [rows,setRows]=useState<PlanningStage[]>(initial.length?initial:defaultPlanningStages.map(s=>({...s,dueDate:"",status:"pending" as const,visibleToClient:true})));
 const initialRows=initial.length?initial:defaultPlanningStages.map(s=>({...s,dueDate:"",status:"pending" as const,visibleToClient:true}));
 const incoming=JSON.stringify(initialRows);
 const [baseline,setBaseline]=useState(incoming);
 const [seen,setSeen]=useState(incoming);
 const dirty=JSON.stringify(rows)!==baseline;
 if(seen!==incoming){setSeen(incoming);if(!dirty){setRows(initialRows);setBaseline(incoming);}}
 useUnsavedChanges(dirty);
 const [saving,setSaving]=useState(false),[message,setMessage]=useState("");
 const modify=(i:number,patch:Partial<PlanningStage>)=>setRows(p=>p.map((s,j)=>j===i?{...s,...patch}:s));
 return <section className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:px-10"><div className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7"><h2 className="text-xl font-bold">Cronograma de entrega do planejamento</h2><p className="mt-2 text-sm text-[#525B70]">Informe previsões e situações para o cliente acompanhar a elaboração da estratégia. Datas não publicam documentos automaticamente.</p><div className="mt-5 space-y-3">{rows.map((s,i)=><div className="grid items-center gap-3 rounded-xl border border-[#E3E7F0] p-4 md:grid-cols-[minmax(180px,1fr)_170px_160px_100px]" key={s.id}><strong className="text-sm">{s.title}</strong><label className="text-xs text-[#525B70]">Previsão<input type="date" aria-label={"Previsão de "+s.title} disabled={saving} value={s.dueDate} onChange={e=>modify(i,{dueDate:e.target.value})} className="mt-1 w-full rounded-lg border border-[#DDE2ED] p-2 text-sm"/></label><label className="text-xs text-[#525B70]">Situação<select aria-label={"Situação de "+s.title} disabled={saving} value={s.status} onChange={e=>modify(i,{status:e.target.value as PlanningStage["status"]})} className="mt-1 w-full rounded-lg border border-[#DDE2ED] p-2 text-sm"><option value="pending">Não iniciada</option><option value="in_progress">Em andamento</option><option value="completed">Concluída</option></select></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" aria-label={"Exibir etapa "+s.title} disabled={saving} checked={s.visibleToClient} onChange={e=>modify(i,{visibleToClient:e.target.checked})}/>Visível</label></div>)}</div><div className="mt-5 flex items-center justify-between gap-4"><p role="status" className="text-sm text-[#525B70]">{message}</p><button type="button" disabled={saving} onClick={async()=>{setSaving(true);setMessage("");try{if(!validPlanningStages(rows))throw new Error("Confira as datas e etapas antes de salvar.");await onSave(rows);setBaseline(JSON.stringify(rows));setMessage("Cronograma salvo.");}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível salvar.");}finally{setSaving(false)}}} className="cursor-pointer rounded-xl bg-[#0B142A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?"Salvando...":"Salvar cronograma"}</button></div></div></section>;
}
