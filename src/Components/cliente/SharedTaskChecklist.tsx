import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import type {ExecutionItem} from "./ProjectTimeline";
/** Receives only the server projection. The portal owns no checkbox or update callback. */
export default function SharedTaskChecklist({task}:{task:ExecutionItem}){
 const steps=task.checklist??[],completed=steps.filter(step=>step.done).length;
 const progress=task.progress??{completed,total:steps.length};
 return <section aria-label="Checklist da tarefa" className="rv-ui3-shared-checklist border-t border-[#E8EBF1] pt-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Checklist</h3><span className="text-xs text-[#697386]" role="status">{progress.completed}/{progress.total} etapas concluídas no total</span></div>
  {progress.total>0&&<progress aria-label="Progresso total do checklist" value={progress.completed} max={progress.total} className="mt-3 block h-2 w-full overflow-hidden rounded-full accent-[#6C5CE7]"/>}
  {steps.length?<><p className="mt-3 text-xs text-[#697386]">{completed}/{steps.length} etapas compartilhadas concluídas</p><ul className="mt-2 space-y-1">{steps.map(step=><li key={step.id} data-checklist-done={step.done} className="rv-ui3-shared-step flex items-start gap-2 rounded-lg p-2 text-sm"><span aria-hidden="true" className="mt-0.5 shrink-0">{step.done?<RotevoTablerIcon name="check" size={17}/>:<span className="block h-4 w-4 rounded-full border border-current"/>}</span><span className="min-w-0 flex-1 break-words"><span className={step.done?"line-through":""}>{step.text}</span><span className="mt-0.5 block text-[11px] no-underline">{step.done?"Concluída":"Pendente"}</span></span></li>)}</ul></>:<p className="mt-3 text-xs text-[#697386]">{progress.total?"Os detalhes das etapas ainda não foram compartilhados.":"Nenhuma etapa compartilhada."}</p>}
 </section>;
}
