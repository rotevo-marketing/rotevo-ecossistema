"use client";
import type {ExecutionChecklistItem} from "@/Components/cliente/ProjectTimeline";

type Sharing={clientDescriptionApproved?:boolean;clientSummary?:string;checklist?:ExecutionChecklistItem[]};
/** Explicit controls for the existing operational record; no copying or historic backfill. */
export default function TaskClientSharingFields({value,onChange}:{value:Sharing;onChange:(patch:Sharing)=>void}){
 return <div className="rv-ui3-task-sharing space-y-3">
  <label className="flex items-start gap-2 text-xs font-medium"><input type="checkbox" checked={value.clientDescriptionApproved===true} onChange={e=>onChange({clientDescriptionApproved:e.target.checked})} className="mt-0.5 h-4 w-4 shrink-0 accent-[#6C5CE7]"/>Compartilhar descrição operacional com o cliente</label>
  <p className="text-xs text-[#697386]">Ao ativar, o cliente acompanha o texto atual da descrição. Ao desativar, somente o resumo abaixo é compartilhado.</p>
  <label className="block text-xs font-semibold">Resumo para o cliente<textarea rows={3} maxLength={2000} value={value.clientSummary??""} disabled={value.clientDescriptionApproved===true} onChange={e=>onChange({clientSummary:e.target.value})} className="mt-2 block w-full rounded-lg border p-3 text-sm disabled:opacity-60"/></label>
  {!!value.checklist?.length&&<fieldset className="space-y-2 rounded-lg border border-[#E3E7F0] p-3"><legend className="px-1 text-xs font-semibold">Etapas compartilhadas do checklist</legend><p className="text-xs text-[#697386]">Marque apenas as etapas que o cliente pode ler. Títulos e conclusão acompanham o checklist original; o cliente não pode alterá-los.</p>{value.checklist.map(step=><label key={step.id} className="flex items-start gap-2 text-xs"><input type="checkbox" aria-label={"Compartilhar etapa: "+step.text} checked={step.visibleToClient===true} onChange={e=>onChange({checklist:value.checklist!.map(item=>item.id===step.id?{...item,visibleToClient:e.target.checked}:item)})} className="mt-0.5 h-4 w-4 shrink-0 accent-[#6C5CE7]"/><span className="min-w-0 break-words">{step.text}</span></label>)}</fieldset>}
 </div>;
}
