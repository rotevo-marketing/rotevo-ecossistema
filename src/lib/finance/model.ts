export type FinanceClient = {id:string;name:string};
export type FinanceSupplier={id:string;name:string;document:string;email:string;phone:string;notes:string;active:boolean;version:number};
export type FinanceSubscription={id:string;supplier_id:string;title:string;category:string;amount_cents:number;start_date:string;end_date:string|null;due_day:number;status:"active"|"paused"|"closed";version:number};
export type FinanceProject = {id:string;client_id:string;title:string};
export type FinanceAccount = {id:string;name:string;opening_cents:number;active:boolean};
export type FinanceContract = {id:string;client_id:string;title:string;start_date:string;end_date:string|null;monthly_cents:number;due_day:number;status:"draft"|"active"|"paused"|"closed";project_ids:string[];version:number};
export type FinanceInvoice = {id:string;client_id:string|null;project_id:string|null;contract_id:string|null;direction:"in"|"out";title:string;counterparty:string;category:string;competence:string;due_date:string;amount_cents:number;cancelled:boolean;paid_cents:number;version:number;supplier_id?:string|null;subscription_id?:string|null;document_reference?:string;notes?:string};
export type FinanceSettlement = {id:string;invoice_id:string;account_id:string;amount_cents:number;paid_on:string;method:string;reference:string;reversed:boolean;created_at:string};
export type FinanceTransfer = {id:string;from_account_id:string;to_account_id:string;amount_cents:number;paid_on:string};
export type FinanceAudit = {id:number;action:string;created_at:string};
export type CampaignInvestment = {projectId:string;projectTitle:string;clientId:string;campaignId:string;title:string;platform:string;month:string;budget:number|null;spent:number|null};
export type FinanceState = {suppliers:FinanceSupplier[];subscriptions:FinanceSubscription[];clients:FinanceClient[];projects:FinanceProject[];accounts:FinanceAccount[];contracts:FinanceContract[];invoices:FinanceInvoice[];settlements:FinanceSettlement[];transfers:FinanceTransfer[];audit:FinanceAudit[];categories:string[];campaigns:CampaignInvestment[];canWrite:boolean};
export type InvoiceSummary=Pick<FinanceInvoice,"id"|"title"|"competence"|"due_date"|"amount_cents"|"paid_cents"|"cancelled">;
export type ClientFinanceState={invoices:InvoiceSummary[];settlements:Pick<FinanceSettlement,"id"|"invoice_id"|"amount_cents"|"paid_on">[];campaigns:CampaignInvestment[]};
export const defaultCategories=["Mensalidade","Projeto avulso","Equipe","Ferramentas","Assinaturas","Serviços","Estrutura","Mídia","Impostos","Outros"];
export const emptyFinanceState:FinanceState={suppliers:[],subscriptions:[],clients:[],projects:[],accounts:[],contracts:[],invoices:[],settlements:[],transfers:[],audit:[],categories:defaultCategories,campaigns:[],canWrite:false};
export const brl=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export const todayInBrazil=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export const displayDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)?date.split("-").reverse().join("/"):date;
export function parseCents(value:string):number {
 const v=value.trim().replace(/\s|R\$/g,"");
 const normalized=v.includes(",")?v.replace(/\./g,"").replace(",","."):v;
 if(!/^\d+(\.\d{1,2})?$/.test(normalized))return NaN;
 const [whole,fraction=""]=normalized.split(".");
 const cents=Number(whole)*100+Number(fraction.padEnd(2,"0"));
 return Number.isSafeInteger(cents)&&cents<=1e12?cents:NaN;
}
export const balance=(invoice:InvoiceSummary)=>invoice.cancelled?0:invoice.amount_cents-invoice.paid_cents;
export function invoiceStatus(invoice:InvoiceSummary,today=todayInBrazil()) {
 if(invoice.cancelled)return "Cancelada";
 if(balance(invoice)===0)return "Paga";
 if(invoice.due_date<today)return invoice.paid_cents>0?"Parcial · atrasada":"Atrasada";
 return invoice.paid_cents>0?"Parcialmente paga":"Pendente";
}
export function accountBalance(state:FinanceState,id:string,through="9999-12-31") {
 const opening=state.accounts.find(a=>a.id===id)?.opening_cents??0;
 const invoices=new Map(state.invoices.map(i=>[i.id,i]));
 return opening+state.settlements.filter(s=>s.account_id===id&&!s.reversed&&s.paid_on<=through).reduce((sum,s)=>sum+(invoices.get(s.invoice_id)?.direction==="in"?1:-1)*s.amount_cents,0)
  +state.transfers.filter(t=>t.paid_on<=through).reduce((sum,t)=>sum+(t.to_account_id===id?t.amount_cents:0)-(t.from_account_id===id?t.amount_cents:0),0);
}
export function campaignInvestments(projects:{id:string;client_id:string;title:string;data:unknown}[]):CampaignInvestment[] {
 return projects.flatMap(p=>{
  const root=p.data&&typeof p.data==="object"?p.data as Record<string,unknown>:{};
  const list=Array.isArray(root.marketingCampaigns)?root.marketingCampaigns:[];
  return list.flatMap(c=>{
   if(!c||typeof c!=="object")return [];
   const x=c as Record<string,unknown>;
   if(typeof x.id!=="string"||typeof x.title!=="string")return [];
   const numeric=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;
   const reports=Array.isArray(x.snapshots)?x.snapshots:[];
   const base={projectId:p.id,projectTitle:p.title,clientId:p.client_id,campaignId:x.id,title:x.title,platform:typeof x.platform==="string"?x.platform:"Outro",budget:numeric(x.budget)};
   return reports.length?reports.flatMap(r=>r&&typeof r==="object"&&typeof r.month==="string"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)?[{...base,month:r.month,spent:numeric(r.spent)}]:[]):[{...base,month:"",spent:null}];
  });
 });
}
export function dueDate(month:string,day:number) {
 const [year,m]=month.split("-").map(Number);
 const last=new Date(Date.UTC(year,m,0)).getUTCDate();
 return `${month}-${String(Math.min(day,last)).padStart(2,"0")}`;
}
/** Shift from the original month/day so February never changes the following due day. */
export function shiftFinanceMonth(value:string,offset:number) {
 const [year,month]=value.split("-").map(Number);
 const date=new Date(Date.UTC(year,month-1+offset,1));
 return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`;
}
export function expenseSchedule(competence:string,firstDue:string,count:number) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)||!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(firstDue)||!Number.isInteger(count)||count<1||count>60)throw Error("Confira as datas e a quantidade de meses (1 a 60).");
 const day=Number(firstDue.slice(8));
 if(day<1||dueDate(firstDue.slice(0,7),day)!==firstDue)throw Error("Informe um vencimento válido.");
 return Array.from({length:count},(_,offset)=>({competence:shiftFinanceMonth(competence,offset)+"-01",due_date:dueDate(shiftFinanceMonth(firstDue.slice(0,7),offset),day)}));
}
