"use client";
import {useRouter} from "next/navigation";
import AcessoClientePage from "@/app/admin/planejamentos/[clientSlug]/acesso/page";
import DialogFocus from "@/Components/ui/DialogFocus";

/** Configuração de acesso no contexto de Projetos.
 * O componente original mantém a autorização no servidor, sem duplicar credenciais. */
export default function ProjectAccessDrawer(){
 const router=useRouter();
 return <div className="fixed inset-0 z-[170] flex justify-end">
   <button type="button" aria-label="Fechar configuração de acesso" onClick={()=>router.back()} className="absolute inset-0 bg-[#101828]/50"/>
   <aside role="dialog" aria-modal="true" aria-label="Configurar acesso do cliente" className="relative z-10 h-full w-full max-w-[760px] overflow-y-auto bg-white shadow-2xl">
     <DialogFocus onClose={()=>router.back()}/>
     <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#E3E6ED] bg-white px-5 py-3">
       <h2 className="text-base font-semibold text-[#323647]">Configurar acesso</h2>
       <button type="button" onClick={()=>router.back()} className="min-h-9 rounded-lg border border-[#E3E6ED] px-3 text-xs text-[#687487] hover:bg-[#F6F7FB]">Fechar</button>
     </div>
     <div className="rv3-modal-client-access"><AcessoClientePage/></div>
   </aside>
 </div>;
}
