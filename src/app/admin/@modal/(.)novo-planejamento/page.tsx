"use client";
import {useRouter} from "next/navigation";
import NovoPlanejamentoPage from "@/app/admin/novo-planejamento/page";
import DialogFocus from "@/Components/ui/DialogFocus";

/** Soft navigations from /admin display the existing authorized form without leaving the list.
 * Direct loads still render the canonical full page, keeping deep links functional. */
export default function NovoPlanejamentoModal(){
 const router=useRouter();
 return <div className="fixed inset-0 z-[170] flex items-center justify-center p-2 sm:p-5">
  <button type="button" aria-label="Fechar cadastro e voltar aos projetos" onClick={()=>router.back()} className="absolute inset-0 bg-[#101828]/50"/>
  <section role="dialog" aria-modal="true" aria-label="Novo planejamento" className="relative z-10 max-h-[96vh] w-full max-w-[820px] overflow-y-auto rounded-xl bg-white shadow-2xl sm:max-h-[92vh]">
   <DialogFocus onClose={()=>router.back()}/>
   <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E3E6ED] bg-white px-5 py-3">
    <h2 className="text-base font-semibold text-[#323647]">Novo planejamento</h2>
    <button type="button" onClick={()=>router.back()} aria-label="Fechar cadastro" className="min-h-9 rounded-lg border border-[#E3E6ED] px-3 text-xs font-medium text-[#687487] hover:bg-[#F6F7FB]">Fechar</button>
   </div>
   <div className="rv3-modal-new-planning"><NovoPlanejamentoPage/></div>
  </section>
 </div>;
}
