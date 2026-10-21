"use client";
import {useState} from "react";
import {balance,todayInBrazil,type ClientFinanceState} from "@/lib/finance/model";
import AuthorizedFileLink from "@/Components/operations/AuthorizedFileLink";
import {CampaignList} from "@/Components/finance/FinanceHub";
import {ContentTablerIcon} from "@/Components/ContentTablerIcon";
type Tab="upcoming"|"paid"|"invoices";
type Entry={id:string;title:string;due:string;amount:number;status:"paid"|"planned"|"overdue";paidAt?:string;kind:"monthly"|"oneoff";invoiceId?:string;remaining:number;paid:number};
const money=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
const date=(s:string)=>s.split("-").reverse().join("/");
const colors={paid:"bg-[#E0F5E8] text-[#176F40]",planned:"bg-[#EDF0F5] text-[#586274]",overdue:"bg-[#FBEAEA] text-[#9C4C59]"};
const labels={paid:"Pago",planned:"Previsto",overdue:"Vencido"};
export default function ClientFinanceView({data}:{data:ClientFinanceState}){
 const entries:Entry[]=data.invoices.filter(i=>!i.cancelled).map(i=>({id:i.id,title:i.title,due:i.due_date,amount:i.amount_cents/100,paid:i.paid_cents/100,remaining:balance(i)/100,status:balance(i)===0?"paid":i.due_date<todayInBrazil()?"overdue":"planned",paidAt:data.settlements.filter(s=>s.invoice_id===i.id).sort((a,b)=>b.paid_on.localeCompare(a.paid_on))[0]?.paid_on,kind:i.category==="Mensalidade"?"monthly":"oneoff"}));
 const [month,setMonth]=useState(todayInBrazil().slice(0,7));
 const paidEntries:Entry[]=data.settlements.map(payment=>({...entries.find(i=>i.id===payment.invoice_id)!,id:payment.id,invoiceId:payment.invoice_id,title:data.invoices.find(i=>i.id===payment.invoice_id)?.title??"Pagamento confirmado",amount:payment.amount_cents/100,paidAt:payment.paid_on}));
 const [tab,setTab]=useState<Tab>("upcoming");
 const totalPaid=data.settlements.reduce((n,x)=>n+x.amount_cents/100,0);
 const upcoming=entries.filter(x=>x.status!=="paid").sort((a,b)=>a.due.localeCompare(b.due));
 const next=upcoming[0];
 const totalUpcoming=upcoming.reduce((n,x)=>n+x.remaining,0);
 const tabs:[Tab,string][]=[["upcoming","Próximos pagamentos"],["paid","Pagamentos realizados"],["invoices","Notas fiscais"]];
 return <div className="space-y-5">
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
 {[{label:"Total pago",value:money(totalPaid),note:"Pagamentos confirmados"},{label:"Próximo vencimento",value:next?money(next.remaining):"Sem previsão",note:next?date(next.due):"Nenhum pagamento pendente"},{label:"Total pendente",value:money(totalUpcoming),note:"Saldo dos lançamentos emitidos"}].map(x=><div key={x.label} className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><p className="text-xs text-[#697386]">{x.label}</p><p className="mt-2 text-xl font-bold text-[#090D1C]">{x.value}</p><p className="mt-2 text-xs text-[#697386]">{x.note}</p></div>)}</div>
 <section className="overflow-hidden rounded-2xl border border-[#E3E7F0] bg-white"><div className="flex flex-wrap gap-2 border-b border-[#E3E7F0] p-4" aria-label="Seções financeiras">{tabs.map(([id,label])=><button key={id} type="button" onClick={()=>setTab(id)} aria-pressed={tab===id} className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold ${tab===id?"bg-[#6D35F5] text-white":"bg-[#F6F7FB] text-[#525B70]"}`}>{label}</button>)}</div>
 <div className="min-h-64 space-y-4 p-5 sm:p-7">
 {tab==="upcoming"&&<><h2 className="text-lg font-bold">Próximos pagamentos</h2><p className="text-xs text-[#697386]">Pagamentos conferidos manualmente pela Rotevo. Se você já pagou, aguarde a confirmação da equipe.</p>{upcoming.length===0&&<p className="text-sm text-[#697386]">Nenhum pagamento pendente.</p>}{upcoming.map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E7F0] py-3 last:border-0"><div><p className="text-sm font-semibold">{x.title}</p><p className="mt-1 text-xs text-[#697386]">{x.kind==="monthly"?"Mensalidade":"Parcela avulsa"} · Vencimento {date(x.due)}</p></div><div className="flex items-center gap-3"><strong className="text-sm">{money(x.remaining)}</strong>{data.paymentLinks?.find(l=>l.invoice_id===x.id&&l.payment_url)?.payment_url&&<a href={data.paymentLinks.find(l=>l.invoice_id===x.id)!.payment_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="text-xs font-semibold text-[#6D35F5]">Abrir link de pagamento ↗</a>}<span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[x.status]}`}>{x.paid>0&&x.status!=="paid"?"Parcial · ":""}{labels[x.status]}</span></div></div>)}</>}
 {tab==="paid"&&<><h2 className="text-lg font-bold">Pagamentos realizados</h2>{!paidEntries.length&&<p className="text-sm text-[#697386]">Nenhum pagamento confirmado até o momento.</p>}{paidEntries.map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E7F0] p-4"><div><p className="text-sm font-semibold">{x.title}</p><p className="mt-1 text-xs text-[#697386]">Pago em {date(x.paidAt!)}</p>{(data.documents??[]).filter(d=>d.invoice_id===(x.invoiceId??x.id)&&d.purpose==="receipt").map(d=><AuthorizedFileLink key={d.id} reference={"asset://"+d.id} download>{d.original_name}</AuthorizedFileLink>)}</div><div className="text-right"><p className="text-sm font-semibold">{money(x.amount)}</p><span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${colors.paid}`}>Pago</span></div></div>)}</>}
 {tab==="invoices"&&<><h2 className="text-lg font-bold">Notas fiscais e documentos</h2>{data.documents?.length?data.documents.map(doc=><div key={doc.id} className="flex items-start gap-3 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4"><ContentTablerIcon name="file-text" size={24}/><div><p className="text-sm font-semibold">{doc.purpose==="invoice"?"Nota fiscal":"Comprovante"} · {data.invoices.find(i=>i.id===doc.invoice_id)?.title}</p><AuthorizedFileLink reference={"asset://"+doc.id} download>{doc.original_name}</AuthorizedFileLink></div></div>):<p className="text-sm text-[#697386]">Nenhum documento financeiro foi disponibilizado.</p>}<p className="text-xs text-[#697386]">Nota fiscal e comprovante de pagamento são documentos diferentes.</p></>}
 </div></section>
 <label className="block text-sm font-semibold">Mês do investimento<input type="month" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value)}} className="ml-3 rounded-lg border bg-white p-2"/></label><CampaignList campaigns={data.campaigns} month={month} clientView/>
 <p className="text-xs leading-5 text-[#697386]">Consulta dos registros autorizados. A confirmação de pagamentos é feita manualmente pela Rotevo.</p>
 </div>;
}
