"use client";

import NovoPlanejamentoPage from "@/app/admin/novo-planejamento/page";
import DialogFocus from "@/Components/ui/DialogFocus";

export default function NovoPlanejamentoDialog({onClose}:{onClose:()=>void}){
 return <div className="fixed inset-0 z-[170] flex items-center justify-center p-2 sm:p-5">
  <button type="button" aria-label="Fechar cadastro e voltar à página" onClick={onClose} className="absolute inset-0 bg-[rgba(0,0,0,0.55)]"/>
  <section role="dialog" aria-modal="true" aria-label="Novo planejamento" className="rv-ui3 rv-ui3-planning-modal relative z-10 max-h-[96vh] w-full max-w-[820px] overflow-y-auto rounded-xl bg-white shadow-2xl sm:max-h-[92vh]">
   <DialogFocus onClose={onClose}/>
   <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E3E6ED] bg-white px-5 py-3">
    <h2 className="text-base font-semibold text-[#323647]">Novo planejamento</h2>
    <button type="button" onClick={onClose} aria-label="Fechar cadastro" className="min-h-9 rounded-lg border border-[#E3E6ED] px-3 text-xs font-medium text-[#687487] hover:bg-[#F6F7FB]">Fechar</button>
   </header>
   <div className="rv3-modal-new-planning"><NovoPlanejamentoPage/></div>
  </section>
 </div>;
}
