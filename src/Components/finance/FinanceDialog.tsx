"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {balance,brl,expenseSchedule,parseCents,todayInBrazil,type FinanceState,type FinanceInvoice} from "@/lib/finance/model";
export type FinanceForm={kind:"invoice"|"contract"|"settle"|"cancel"|"reverse"|"account"|"transfer"|"contractStatus";id?:string;direction?:"in"|"out";status?:string};
const fieldClass="mt-1.5 w-full rounded-xl border border-[#DDE2ED] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6D35F5] focus:ring-2 focus:ring-[#6D35F5]/15";
function Field({label,name,type="text",value,required=true,min,max,step}:{label:string;name:string;type?:string;value?:string|number;required?:boolean;min?:string|number;max?:string|number;step?:string}){
 return <label className="block text-xs font-semibold text-[#525B70]">{label}<input className={fieldClass} name={name} type={type} defaultValue={value} required={required} min={min} max={max} step={step} maxLength={180}/></label>;
}
export default function FinanceDialog({form,state,onClose,onSubmit}:{form:FinanceForm;state:FinanceState;onClose:()=>void;onSubmit:(action:string,input:Record<string,unknown>,requestId:string)=>Promise<void>}){
 const ref=useRef<HTMLDialogElement>(null),[pending,setPending]=useState(false),[error,setError]=useState("");
 const [requestId]=useState(()=>crypto.randomUUID());
 const invoice=state.invoices.find(i=>i.id===form.id);
 const contract=form.kind==="contract"?state.contracts.find(c=>c.id===form.id):undefined;
 const [clientId,setClientId]=useState(contract?.client_id??invoice?.client_id??"");
 const [projectExpense,setProjectExpense]=useState(false),[repeatExpense,setRepeatExpense]=useState(false);
 const [supplierId,setSupplierId]=useState("");
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 const select=(label:string,name:string,options:{id:string;name:string}[],required=true)=><label className="block text-xs font-semibold text-[#525B70]">{label}<select name={name} required={required} className={fieldClass}><option value="">Selecione</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>;
 const clientField=<label className="block text-xs font-semibold text-[#525B70]">Cliente<select name="client_id" value={clientId} onChange={e=>setClientId(e.target.value)} required={form.kind==="contract"||form.direction==="in"} className={fieldClass}><option value="">{form.direction==="out"?"Despesa interna da Rotevo":"Selecione o cliente"}</option>{state.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>;
 const money=(label="Valor (R$)",value?:number)=><Field label={label} name="amount" value={value===undefined?undefined:(value/100).toFixed(2).replace(".",",")}/>;
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(pending)return;setError("");
  const f=new FormData(e.currentTarget),get=(k:string)=>String(f.get(k)??"");
  let action="",input:Record<string,unknown>={};
  const cents=()=>{const n=parseCents(get("amount"));if(!Number.isSafeInteger(n)||n<=0)throw Error("Informe um valor válido, maior que zero, com até duas casas decimais.");return n;};
  try{
   if(form.kind==="invoice"){
    const count=repeatExpense?Number(get("repeat_months")):1;
    expenseSchedule(get("competence"),get("due_date"),count);
    action="invoice.create";input={direction:form.direction,client_id:get("client_id"),project_id:get("project_id"),title:get("title"),counterparty:form.direction==="in"?state.clients.find(c=>c.id===get("client_id"))?.name:(state.suppliers.find(x=>x.id===supplierId)?.name??get("counterparty")),supplier_id:supplierId,document_reference:get("document_reference"),notes:get("notes"),category:get("category"),competence:get("competence"),due_date:get("due_date"),amount_cents:cents(),repeat_months:count};
   }else if(form.kind==="contract"){
    action=contract?"contract.update":"contract.create";input={...(contract?{id:contract.id,version:contract.version}:{}),title:get("title"),client_id:get("client_id"),start_date:get("start_date"),end_date:get("end_date"),monthly_cents:cents(),due_day:Number(get("due_day")),project_ids:f.getAll("project_ids").map(String)};
   }else if(form.kind==="settle"){
    action="invoice.settle";input={id:invoice!.id,version:invoice!.version,account_id:get("account_id"),amount_cents:cents(),paid_on:get("paid_on"),method:get("method"),reference:get("reference")};
   }else if(form.kind==="cancel"){
    action="invoice.cancel";input={id:invoice!.id,version:invoice!.version,reason:get("reason")};
   }else if(form.kind==="reverse"){
    action="settlement.reverse";input={id:form.id,reason:get("reason")};
   }else if(form.kind==="account"){
    const opening=parseCents(get("amount"));if(!Number.isSafeInteger(opening))throw Error("Informe um saldo inicial válido.");
    action="account.create";input={name:get("name"),opening_cents:opening};
   }else if(form.kind==="transfer"){
    action="transfer.create";input={from_account_id:get("from_account_id"),to_account_id:get("to_account_id"),amount_cents:cents(),paid_on:get("paid_on")};
   }else{
    const c=state.contracts.find(c=>c.id===form.id)!;action="contract.status";input={id:c.id,version:c.version,status:form.status};
   }
   setPending(true);await onSubmit(action,input,requestId);onClose();
  }catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível salvar.");}finally{setPending(false);}
 }
 const titles={invoice:form.direction==="out"?"Nova despesa":"Nova receita",contract:contract?"Editar contrato recorrente":"Novo contrato recorrente",settle:invoice?.direction==="out"?"Confirmar pagamento":"Confirmar recebimento",cancel:invoice?.direction==="out"?"Cancelar despesa":"Cancelar cobrança",reverse:"Estornar confirmação",account:"Nova conta financeira",transfer:"Transferência entre contas",contractStatus:"Alterar situação do contrato"};
 return <dialog ref={ref} onCancel={e=>{if(pending)e.preventDefault();else onClose();}} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-[#090D1C] shadow-2xl backdrop:bg-[#0B142A]/55"><form onSubmit={submit}>
  <header className="flex items-center justify-between border-b border-[#E3E7F0] px-6 py-5"><h2 className="font-sans text-lg font-bold">{titles[form.kind]}</h2><button type="button" aria-label="Fechar formulário" disabled={pending} onClick={onClose} className="rounded-lg px-3 py-1 text-2xl text-[#697386] hover:bg-[#F6F7FB]">×</button></header>
  <div className="space-y-4 p-6">
   {form.kind==="invoice"&&<>
    <p className="text-sm leading-6 text-[#697386]">{form.direction==="out"?"Cadastre faturas, assinaturas e outros compromissos da Rotevo. O lançamento fica a pagar até você confirmar o pagamento.":"Cadastre um valor que a Rotevo tem a receber de um cliente."}</p>
    {form.direction==="in"&&clientField}
    <Field label={form.direction==="out"?"Descrição da despesa":"Descrição da receita"} name="title"/>
    {form.direction==="out"&&<><label className="block text-xs font-semibold text-[#525B70]">Fornecedor cadastrado (opcional)<select className={fieldClass} value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Informar favorecido manualmente</option>{state.suppliers.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>{!supplierId&&<Field label="Fornecedor / favorecido" name="counterparty"/>}</>}
    <div className="grid gap-4 sm:grid-cols-2">{money(repeatExpense?(form.direction==="in"?"Valor de cada parcela (R$)":"Valor de cada mês (R$)"):"Valor (R$)")}{select("Categoria","category",state.categories.filter(c=>form.direction!=="out"||c!=="Mensalidade").map(c=>({id:c,name:c})))}<Field label="Competência" name="competence" type="month" value={todayInBrazil().slice(0,7)}/><Field label={repeatExpense?"Primeiro vencimento":"Vencimento"} name="due_date" type="date" value={todayInBrazil()}/></div>
    <div className="space-y-3 rounded-xl bg-[#F6F7FB] p-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={repeatExpense} onChange={e=>setRepeatExpense(e.target.checked)}/>{form.direction==="in"?"Parcelar recebimento mensalmente":"Repetir mensalmente"}</label>{repeatExpense&&<><Field label={form.direction==="in"?"Quantidade de parcelas":"Quantidade de meses (incluindo o primeiro)"} name="repeat_months" type="number" min={2} max={60} value={form.direction==="in"?2:12}/><p className="text-xs leading-5 text-[#697386]">{form.direction==="in"?"Informe o valor de cada parcela. Serão emitidos lançamentos mensais separados, todos em aberto, com a numeração das parcelas. Nenhum pagamento é confirmado automaticamente.":"Cria uma despesa em aberto por mês, com o mesmo valor e dia de vencimento, ajustado ao último dia nos meses mais curtos. Você confirma cada pagamento separadamente. Não há renovação automática após este período."}</p></>}</div>
    {form.direction==="out"&&<label className="flex items-center gap-2 text-sm text-[#525B70]"><input type="checkbox" checked={projectExpense} onChange={e=>{setProjectExpense(e.target.checked);setClientId("");}}/> Vincular a um projeto de cliente (opcional)</label>}
    {(form.direction==="in"||projectExpense)&&<>{form.direction==="out"&&clientField}{select(form.direction==="out"?"Projeto":"Projeto (opcional)","project_id",state.projects.filter(p=>p.client_id===clientId).map(p=>({id:p.id,name:p.title})),form.direction==="out")}</>}
    <Field label="Referência / número da fatura (opcional)" name="document_reference" required={false}/>
    <label className="block text-xs font-semibold text-[#525B70]">Observações internas (opcional)<textarea name="notes" rows={3} maxLength={1000} className={fieldClass}/></label>
   </>}
   {form.kind==="contract"&&<>{contract?<><input type="hidden" name="client_id" value={contract.client_id}/><p className="text-sm font-semibold">{state.clients.find(c=>c.id===contract.client_id)?.name}</p></>:clientField}<Field label="Nome do contrato" name="title" value={contract?.title}/><div className="grid gap-4 sm:grid-cols-2"><Field label="Início da vigência" name="start_date" type="date" value={contract?.start_date??todayInBrazil()}/><Field label="Fim da vigência (opcional)" name="end_date" type="date" required={false} value={contract?.end_date??""}/>{money("Mensalidade (R$)",contract?.monthly_cents)}<Field label="Dia de vencimento" name="due_day" type="number" min={1} max={31} value={contract?.due_day??10}/></div><fieldset><legend className="mb-2 text-xs font-semibold text-[#525B70]">Projetos atendidos (opcional)</legend>{state.projects.filter(p=>p.client_id===clientId).map(p=><label key={p.id} className="flex items-center gap-2 py-1.5 text-sm"><input type="checkbox" name="project_ids" value={p.id} defaultChecked={contract?.project_ids.includes(p.id)}/>{p.title}</label>)}{!clientId&&<p className="text-xs text-[#697386]">Selecione o cliente para escolher os projetos.</p>}</fieldset><p className="rounded-xl bg-[#F6F7FB] p-3 text-xs leading-5 text-[#697386]">As mensalidades serão emitidas pela equipe na aba Recorrência. Alterações valem para novas emissões e não modificam cobranças anteriores. Criar um contrato não confirma pagamento.</p></>}
   {form.kind==="settle"&&<><div className="rounded-xl bg-[#F6F7FB] p-4"><p className="font-semibold">{invoice?.title}</p><p className="mt-1 text-sm text-[#697386]">Saldo em aberto: {brl(balance(invoice as FinanceInvoice))}</p></div>{money("Valor confirmado (R$)",balance(invoice as FinanceInvoice))}<div className="grid gap-4 sm:grid-cols-2"><Field label="Data efetiva do pagamento" name="paid_on" type="date" value={todayInBrazil()} max={todayInBrazil()}/>{select("Conta financeira","account_id",state.accounts.filter(a=>a.active))}{select("Forma de pagamento","method",["Pix","Transferência","Boleto","Cartão","Dinheiro","Outro"].map(n=>({id:n,name:n})))}<Field label="Referência (opcional)" name="reference" required={false}/></div><p className="text-xs leading-5 text-[#697386]">Confirme somente após conferir o pagamento. Esta ação movimenta o caixa e atualiza o histórico.</p></>}
   {(form.kind==="cancel"||form.kind==="reverse")&&<><p className="text-sm leading-6 text-[#525B70]">{form.kind==="reverse"?"O pagamento original será preservado no histórico e deixará de compor o saldo. A cobrança voltará a apresentar o valor em aberto.":"A cobrança será preservada como cancelada e deixará de compor os valores a receber ou pagar."}</p><label className="block text-xs font-semibold text-[#525B70]">Motivo<textarea className={fieldClass} name="reason" required minLength={5} maxLength={500} rows={3}/></label></>}
   {form.kind==="account"&&<><Field label="Nome da conta" name="name"/>{money("Saldo inicial (R$)",0)}<p className="text-xs text-[#697386]">Informe o saldo de abertura antes dos pagamentos que serão registrados aqui.</p></>}
   {form.kind==="transfer"&&<><div className="grid gap-4 sm:grid-cols-2">{select("Conta de origem","from_account_id",state.accounts.filter(a=>a.active))}{select("Conta de destino","to_account_id",state.accounts.filter(a=>a.active))}{money()}<Field label="Data da transferência" name="paid_on" type="date" value={todayInBrazil()} max={todayInBrazil()}/></div><p className="text-xs text-[#697386]">Transferências alteram os saldos das contas, sem gerar receita ou despesa.</p></>}
   {form.kind==="contractStatus"&&<p className="text-sm leading-6">{form.status==="closed"?"Encerrar interrompe novas emissões e preserva as cobranças anteriores. O encerramento é definitivo.":form.status==="paused"?"Pausar interrompe a emissão de novas mensalidades. As cobranças anteriores permanecem válidas.":"Reativar permite emitir novas competências dentro da vigência do contrato."}</p>}
   {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </div><footer className="flex justify-end gap-3 border-t border-[#E3E7F0] px-6 py-4"><button type="button" disabled={pending} onClick={onClose} className="rounded-xl border border-[#DDE2ED] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Voltar</button><button disabled={pending} className="rounded-xl bg-[#6D35F5] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending?"Registrando…":form.kind==="settle"?"Confirmar manualmente":"Confirmar"}</button></footer>
 </form></dialog>;
}
