"use client";
import {useEffect,useState} from "react";
import {FinanceWorkspace} from "./FinanceHub";
import {ClientFinancePanel} from "./ClientFinance";
import {demoClientA,demoClientB,demoClientView,makeFinanceDemo,mutateDemo} from "@/lib/finance/demo";
import type {FinanceState} from "@/lib/finance/model";
const storageKey="rotevo-finance-integrated-review-v1";

/** Review the real Finance workspace inside the authenticated admin panel.
 * All review writes stay in this browser; real financial endpoints remain disabled.
 */
export default function EmbeddedFinanceReview(){
 const [state,setState]=useState<FinanceState>(makeFinanceDemo);
 const [view,setView]=useState("admin"),[loaded,setLoaded]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;
  Promise.resolve().then(()=>{
   try{
    const raw=window.localStorage.getItem(storageKey);
    if(raw){
     const data=JSON.parse(raw);
     if(data?.clients?.length===2&&Array.isArray(data.projects)&&Array.isArray(data.accounts)&&Array.isArray(data.contracts)&&Array.isArray(data.invoices)&&Array.isArray(data.settlements)&&Array.isArray(data.transfers)&&Array.isArray(data.audit)&&Array.isArray(data.categories)&&Array.isArray(data.campaigns)&&active)setState({...data,suppliers:data.suppliers??[],subscriptions:data.subscriptions??[]});
    }
   }catch{if(active)setNotice("Não foi possível recuperar a demonstração anterior neste navegador.");}
   if(active)setLoaded(true);
  });
  return()=>{active=false;};
 },[]);
 function persist(next:FinanceState){
  setState(next);
  try{window.localStorage.setItem(storageKey,JSON.stringify(next));}
  catch{setNotice("As alterações desta demonstração serão mantidas somente enquanto a página estiver aberta.");}
 }
 return <section aria-label="Financeiro integrado para revisão" className="mt-6">
  <div className="rounded-xl border border-[#DAE7B9] bg-[#F1F7E5] px-4 py-3 text-xs leading-5 text-[#465A21]"><strong>Prévia financeira · dados demonstrativos.</strong> Os formulários abaixo podem ser testados. As alterações ficam neste navegador e não registram pagamentos reais.</div>
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
   <label className="text-xs font-semibold text-[#697386]">Conferir a visão de
    <select aria-label="Visão do financeiro para revisão" value={view} onChange={e=>setView(e.target.value)} className="ml-2 rounded-xl border border-[#DDE2ED] bg-white px-3 py-2.5 text-sm text-[#090D1C]">
     <option value="admin">Equipe Rotevo</option><option value={demoClientA}>Cliente demonstrativo · Aurora</option><option value={demoClientB}>Cliente demonstrativo · Horizonte</option>
    </select>
   </label>
   <button type="button" onClick={()=>{if(window.confirm("Restaurar somente os dados demonstrativos do Financeiro neste navegador?"))persist(makeFinanceDemo());}} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#6D35F5]">Restaurar demonstração</button>
  </div>
  {notice&&<p role="status" className="mt-3 text-xs text-amber-800">{notice}</p>}
  {!loaded?<p role="status" className="py-8 text-sm text-[#697386]">Preparando o Financeiro…</p>:view==="admin"?<FinanceWorkspace state={state} onCommand={async(action,input)=>persist(mutateDemo(state,action,input))}/>:<div className="mt-6"><ClientFinancePanel key={view} data={demoClientView(state,view)}/></div>}
 </section>;
}
