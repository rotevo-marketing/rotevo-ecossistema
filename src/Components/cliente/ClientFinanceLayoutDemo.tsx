"use client";
import {useState} from "react";
import {ContentTablerIcon} from "@/Components/ContentTablerIcon";
type Tab="upcoming"|"paid"|"invoices";
type Entry={id:string;title:string;due:string;amount:number;status:"paid"|"planned"|"overdue";paidAt?:string;kind:"monthly"|"oneoff"};
const entries:Entry[]=[
{id:"a",title:"Consultoria: outubro",due:"2026-10-05",amount:600,status:"paid",paidAt:"2026-10-05",kind:"monthly"},
{id:"b",title:"Consultoria: novembro",due:"2026-11-05",amount:600,status:"planned",kind:"monthly"},
{id:"c",title:"Consultoria: dezembro",due:"2026-12-05",amount:600,status:"planned",kind:"monthly"},
{id:"d",title:"Consultoria: janeiro",due:"2027-01-05",amount:600,status:"planned",kind:"monthly"},
{id:"e",title:"Planejamento: parcela final (exemplo)",due:"2026-10-10",amount:1000,status:"overdue",kind:"oneoff"}
];
const money=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
const date=(s:string)=>s.split("-").reverse().join("/");
const colors={paid:"bg-[#E0F5E8] text-[#176F40]",planned:"bg-[#EDF0F5] text-[#586274]",overdue:"bg-[#FBEAEA] text-[#9C4C59]"};
const labels={paid:"Pago",planned:"Previsto",overdue:"Vencido"};
export default function ClientFinanceLayoutDemo(){
 const [tab,setTab]=useState<Tab>("upcoming");
 const totalPaid=entries.filter(x=>x.status==="paid").reduce((n,x)=>n+x.amount,0);
 const upcoming=entries.filter(x=>x.status!=="paid").sort((a,b)=>a.due.localeCompare(b.due));
 const next=upcoming[0];
 const totalUpcoming=upcoming.reduce((n,x)=>n+x.amount,0);
 const tabs:[Tab,string][]=[["upcoming","Próximos pagamentos"],["paid","Pagamentos realizados"],["invoices","Notas fiscais"]];
 return <div className="space-y-5">
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
 {[{label:"Total pago",value:money(totalPaid),note:"Pagamentos confirmados"},{label:"Próximo vencimento",value:next?money(next.amount):"Sem previsão",note:next?date(next.due):"Nenhum pagamento pendente"},{label:"Total pendente",value:money(totalUpcoming),note:"Parcelas demonstrativas até jan/2027"}].map(x=><div key={x.label} className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><p className="text-xs text-[#697386]">{x.label}</p><p className="mt-2 text-xl font-bold text-[#090D1C]">{x.value}</p><p className="mt-2 text-xs text-[#697386]">{x.note}</p></div>)}</div>
 <section className="overflow-hidden rounded-2xl border border-[#E3E7F0] bg-white"><div className="flex flex-wrap gap-2 border-b border-[#E3E7F0] p-4" aria-label="Seções financeiras">{tabs.map(([id,label])=><button key={id} type="button" onClick={()=>setTab(id)} aria-pressed={tab===id} className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold ${tab===id?"bg-[#6D35F5] text-white":"bg-[#F6F7FB] text-[#525B70]"}`}>{label}</button>)}</div>
 <div className="min-h-64 space-y-4 p-5 sm:p-7">
 {tab==="upcoming"&&<><h2 className="text-lg font-bold">Próximos pagamentos</h2><p className="text-xs text-[#697386]">Inclui vencimentos previstos e pendências demonstrativas. Valores reais serão vinculados futuramente.</p>{upcoming.map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E7F0] py-3 last:border-0"><div><p className="text-sm font-semibold">{x.title}</p><p className="mt-1 text-xs text-[#697386]">{x.kind==="monthly"?"Mensalidade":"Parcela avulsa"} · Vencimento {date(x.due)}</p></div><div className="flex items-center gap-3"><strong className="text-sm">{money(x.amount)}</strong><span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[x.status]}`}>{labels[x.status]}</span></div></div>)}</>}
 {tab==="paid"&&<><h2 className="text-lg font-bold">Pagamentos realizados</h2>{entries.filter(x=>x.status==="paid").map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E7F0] p-4"><div><p className="text-sm font-semibold">{x.title}</p><p className="mt-1 text-xs text-[#697386]">Pago em {date(x.paidAt!)}</p><p className="mt-1 text-xs text-[#697386]">Comprovante ainda não vinculado</p></div><div className="text-right"><p className="text-sm font-semibold">{money(x.amount)}</p><span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${colors.paid}`}>Pago</span></div></div>)}</>}
 {tab==="invoices"&&<><h2 className="text-lg font-bold">Notas fiscais e documentos</h2><div className="flex items-start gap-3 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4"><ContentTablerIcon name="file-text" size={24}/><div><p className="text-sm font-semibold">NFS-e — consultoria de outubro</p><p className="mt-1 text-xs text-[#697386]">Exemplo demonstrativo · PDF e número fiscal ainda não cadastrados</p><p className="mt-2 text-xs text-[#697386]">Download disponível somente quando houver arquivo real e autorizado.</p></div></div><p className="text-xs text-[#697386]">Nota fiscal e comprovante de pagamento são documentos diferentes.</p></>}
 </div></section>
 <p className="text-xs leading-5 text-[#697386]">Prévia visual com dados fictícios. Nenhum pagamento foi realizado, nenhuma nota fiscal foi emitida e nenhum registro real foi modificado.</p>
 </div>;
}