import {balance,dueDate,shiftFinanceMonth,todayInBrazil,type FinanceState} from "./model.ts";

export function validFinanceDate(value:string){
 if(!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value))return false;
 const day=Number(value.slice(8));return day>0&&dueDate(value.slice(0,7),day)===value;
}
/** Mutates only a cloned review state; returns false for commands handled by the base adapter. */
export function mutateLifecycle(s:FinanceState,action:string,input:Record<string,unknown>):boolean {
 const text=(key:string)=>String(input[key]??"").trim(),num=(key:string)=>Number(input[key]);
 const version=(row:{version:number}|undefined)=>{if(!row||row.version!==num("version"))throw Error("Este registro mudou. Atualize antes de continuar.");};
 const positive=(key:string)=>{const n=num(key);if(!Number.isSafeInteger(n)||n<=0||n>1e12)throw Error("Informe um valor positivo válido.");return n;};
 if(action==="supplier.save"){
  const before=s.suppliers.find(x=>x.id===text("id"));if(text("id"))version(before);
  if(text("name").length<2||text("name").length>180||text("notes").length>1000||text("document").length>30||text("phone").length>40||text("email").length>180)throw Error("Confira os dados do fornecedor.");
  if(text("email")&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text("email")))throw Error("Informe um e-mail válido.");
  const row={id:before?.id??crypto.randomUUID(),name:text("name"),document:text("document"),email:text("email"),phone:text("phone"),notes:text("notes"),active:before?.active??true,version:(before?.version??0)+1};
  if(before)s.suppliers=s.suppliers.map(x=>x.id===row.id?row:x);else s.suppliers.push(row);
 }else if(action==="supplier.status"){
  const row=s.suppliers.find(x=>x.id===text("id"));version(row);if(typeof input.active!=="boolean")throw Error("Situação inválida.");
  if(!input.active&&s.subscriptions.some(x=>x.supplier_id===row!.id&&x.status==="active"))throw Error("Pause ou encerre as assinaturas ativas antes de arquivar o fornecedor.");
  row!.active=input.active;row!.version++;
 }else if(action==="subscription.save"){
  const before=s.subscriptions.find(x=>x.id===text("id"));if(text("id")){version(before);if(before!.status==="closed")throw Error("Assinatura encerrada não pode ser editada.");}
  if(!s.suppliers.some(x=>x.id===text("supplier_id")&&x.active))throw Error("Selecione um fornecedor ativo.");
  if(before&&before.supplier_id!==text("supplier_id"))throw Error("O fornecedor de uma assinatura existente não pode mudar.");
  if(text("title").length<3||text("title").length>180||!s.categories.includes(text("category"))||text("category")==="Mensalidade")throw Error("Confira descrição e categoria da assinatura.");
  if(!validFinanceDate(text("start_date"))||(text("end_date")&&(!validFinanceDate(text("end_date"))||text("end_date")<text("start_date"))))throw Error("Confira a vigência.");
  if(!Number.isInteger(num("due_day"))||num("due_day")<1||num("due_day")>31)throw Error("Informe um dia entre 1 e 31.");
  const row={id:before?.id??crypto.randomUUID(),supplier_id:text("supplier_id"),title:text("title"),category:text("category"),amount_cents:positive("amount_cents"),start_date:text("start_date"),end_date:text("end_date")||null,due_day:num("due_day"),status:before?.status??"active" as const,version:(before?.version??0)+1};
  if(before)s.subscriptions=s.subscriptions.map(x=>x.id===row.id?row:x);else s.subscriptions.push(row);
 }else if(action==="subscription.status"){
  const row=s.subscriptions.find(x=>x.id===text("id"));version(row);
  if(row!.status==="closed"||!["active","paused","closed"].includes(text("status")))throw Error("Situação inválida ou assinatura já encerrada.");
  if(text("status")==="active"&&!s.suppliers.some(x=>x.id===row!.supplier_id&&x.active))throw Error("Reative o fornecedor antes de retomar a assinatura.");
  row!.status=text("status") as "active"|"paused"|"closed";row!.version++;
 }else if(action==="subscription.generate"){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(text("month")))throw Error("Informe uma competência válida.");
  for(const row of s.subscriptions.filter(x=>x.status==="active"&&x.start_date.slice(0,7)<=text("month")&&(!x.end_date||x.end_date.slice(0,7)>=text("month")))){
   const supplier=s.suppliers.find(x=>x.id===row.supplier_id&&x.active);
   if(!supplier||s.invoices.some(x=>x.subscription_id===row.id&&x.competence.slice(0,7)===text("month")))continue;
   s.invoices.push({id:crypto.randomUUID(),client_id:null,project_id:null,contract_id:null,direction:"out",title:row.title,counterparty:supplier.name,category:row.category,competence:text("month")+"-01",due_date:dueDate(text("month"),row.due_day),amount_cents:row.amount_cents,cancelled:false,paid_cents:0,version:1,supplier_id:supplier.id,subscription_id:row.id,notes:"",document_reference:""});
  }
 }else if(action==="invoice.update"){
  const row=s.invoices.find(x=>x.id===text("id"));version(row);
  if(row!.cancelled||row!.paid_cents>0)throw Error("Somente lançamentos em aberto, sem pagamentos, podem ser editados. Estorne o pagamento antes de corrigir.");
  if(text("title").length<3||text("title").length>180||!text("counterparty")||text("counterparty").length>180||!s.categories.includes(text("category"))||text("notes").length>1000||text("document_reference").length>180||!validFinanceDate(text("due_date")))throw Error("Confira os dados do lançamento.");
  Object.assign(row!,{title:text("title"),counterparty:text("counterparty"),category:text("category"),due_date:text("due_date"),amount_cents:positive("amount_cents"),notes:text("notes"),document_reference:text("document_reference"),version:row!.version+1});
 }else if(action==="account.update"){
  const row=s.accounts.find(x=>x.id===text("id"));if(!row||text("name").length<2||text("name").length>100||typeof input.active!=="boolean")throw Error("Confira os dados da conta.");
  row.name=text("name");row.active=input.active;
 }else return false;
 return true;
}

export function dueWindow(invoice:{due_date:string;cancelled:boolean;amount_cents:number;paid_cents:number},window:string,today=todayInBrazil()){
 if(window==="all")return true;
 if(invoice.cancelled||invoice.amount_cents-invoice.paid_cents<=0)return false;
 const days=Math.round((Date.parse(invoice.due_date+"T12:00:00Z")-Date.parse(today+"T12:00:00Z"))/86400000);
 return window==="overdue"?days<0:window==="today"?days===0:days>=0&&days<=Number(window);
}
export function cashForecast(state:FinanceState,opening:number,today=todayInBrazil()){
 let running=opening;
 const overdue=state.invoices.filter(x=>!x.cancelled&&balance(x)>0&&x.due_date<today);
 const pastIn=overdue.filter(x=>x.direction==="in").reduce((n,x)=>n+balance(x),0),pastOut=overdue.filter(x=>x.direction==="out").reduce((n,x)=>n+balance(x),0);
 const rows=Array.from({length:6},(_,index)=>{
  const month=shiftFinanceMonth(today.slice(0,7),index),invoices=state.invoices.filter(x=>!x.cancelled&&balance(x)>0&&x.due_date>=today&&x.due_date.slice(0,7)===month);
  const incoming=invoices.filter(x=>x.direction==="in").reduce((n,x)=>n+balance(x),0),outgoing=invoices.filter(x=>x.direction==="out").reduce((n,x)=>n+balance(x),0);
  running+=incoming-outgoing;return {month,incoming,outgoing,closing:running};
 });
 return {pastIn,pastOut,rows};
}
