import {mutateLifecycle} from "./lifecycle.ts";
import {expenseSchedule,defaultCategories,dueDate,emptyFinanceState,todayInBrazil,type FinanceState} from "./model.ts";
const uuid=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
export const demoClientA=uuid(1),demoClientB=uuid(2);
export function makeFinanceDemo():FinanceState {
 const month=todayInBrazil().slice(0,7),date=(day:number)=>dueDate(month,day);
 return {...structuredClone(emptyFinanceState),canWrite:true,
 suppliers:[{id:uuid(81),name:"Plataformas de trabalho · demonstração",document:"",email:"",phone:"",notes:"Fornecedor demonstrativo de ferramentas da Rotevo",active:true,version:1}],
 subscriptions:[{id:uuid(82),supplier_id:uuid(81),title:"Assinaturas de ferramentas",category:"Ferramentas",amount_cents:79000,start_date:month+"-01",end_date:null,due_day:25,status:"active",version:1}],
 clients:[{id:demoClientA,name:"Aurora Studio · demonstração"},{id:demoClientB,name:"Horizonte Clínica · demonstração"}],
 projects:[{id:uuid(11),client_id:demoClientA,title:"Crescimento Aurora"},{id:uuid(12),client_id:demoClientB,title:"Presença Horizonte"}],
 accounts:[{id:uuid(21),name:"Conta principal",opening_cents:1850000,active:true},{id:uuid(22),name:"Reserva",opening_cents:500000,active:true}],
 contracts:[{id:uuid(31),client_id:demoClientA,title:"Gestão de marketing",start_date:month+"-01",end_date:null,monthly_cents:350000,due_day:10,status:"active",project_ids:[uuid(11)],version:1},{id:uuid(32),client_id:demoClientB,title:"Estratégia e conteúdo",start_date:month+"-01",end_date:null,monthly_cents:480000,due_day:20,status:"active",project_ids:[uuid(12)],version:1}],
 invoices:[
 {id:uuid(41),client_id:demoClientA,project_id:null,contract_id:uuid(31),direction:"in",title:"Gestão de marketing",counterparty:"Aurora Studio",category:"Mensalidade",competence:month+"-01",due_date:date(10),amount_cents:350000,paid_cents:350000,cancelled:false,version:2},
 {id:uuid(42),client_id:demoClientB,project_id:uuid(12),contract_id:uuid(32),direction:"in",title:"Estratégia e conteúdo",counterparty:"Horizonte Clínica",category:"Mensalidade",competence:month+"-01",due_date:date(20),amount_cents:480000,paid_cents:0,cancelled:false,version:1},
 {id:uuid(43),client_id:demoClientA,project_id:uuid(11),contract_id:null,direction:"in",title:"Produção de landing page",counterparty:"Aurora Studio",category:"Projeto avulso",competence:month+"-01",due_date:date(5),amount_cents:220000,paid_cents:100000,cancelled:false,version:2},
 {id:uuid(44),supplier_id:uuid(81),subscription_id:uuid(82),client_id:null,project_id:null,contract_id:null,direction:"out",title:"Assinaturas de ferramentas",counterparty:"Plataformas de trabalho",category:"Ferramentas",competence:month+"-01",due_date:date(25),amount_cents:79000,paid_cents:0,cancelled:false,version:1},
 {id:uuid(45),client_id:null,project_id:null,contract_id:null,direction:"out",title:"Produção de conteúdo",counterparty:"Equipe criativa",category:"Equipe",competence:month+"-01",due_date:date(8),amount_cents:280000,paid_cents:280000,cancelled:false,version:2}],
 settlements:[{id:uuid(51),invoice_id:uuid(41),account_id:uuid(21),amount_cents:350000,paid_on:date(3),method:"Pix",reference:"",reversed:false,created_at:month+"-03T12:00:00Z"},{id:uuid(52),invoice_id:uuid(43),account_id:uuid(21),amount_cents:100000,paid_on:date(3),method:"Transferência",reference:"",reversed:false,created_at:month+"-03T12:00:00Z"},{id:uuid(53),invoice_id:uuid(45),account_id:uuid(21),amount_cents:280000,paid_on:date(3),method:"Pix",reference:"",reversed:false,created_at:month+"-03T12:00:00Z"}],
 campaigns:[{projectId:uuid(11),projectTitle:"Crescimento Aurora",clientId:demoClientA,campaignId:uuid(61),title:"Captação de novos contatos",platform:"Meta Ads",month,budget:2000,spent:1470},{projectId:uuid(12),projectTitle:"Presença Horizonte",clientId:demoClientB,campaignId:uuid(62),title:"Busca por atendimento",platform:"Google Ads",month,budget:3000,spent:2280}],
 audit:[{id:1,action:"Mensalidade confirmada manualmente",created_at:month+"-03T12:00:00Z"}],categories:[...defaultCategories]};
}
// Preview adapter: browser-only synthetic state. Never calls Supabase or the financial API.
export function mutateDemo(state:FinanceState,action:string,input:Record<string,unknown>):FinanceState {
 const s=structuredClone({...state,suppliers:state.suppliers??[],subscriptions:state.subscriptions??[]}),id=crypto.randomUUID(),text=(key:string)=>String(input[key]??""),num=(key:string)=>Number(input[key]);
 const positive=(key:string)=>{const n=num(key);if(!Number.isSafeInteger(n)||n<=0||n>1e12)throw Error("Informe um valor válido, maior que zero.");return n;};
 if(!s.canWrite)throw Error("Consulta sem permissão de edição.");
 if(mutateLifecycle(s,action,input)){
  // The lifecycle command has already been applied to this clone.
 }else if(action==="account.create"){
  if(text("name").trim().length<2)throw Error("Informe o nome da conta.");
  s.accounts.push({id,name:text("name"),opening_cents:num("opening_cents"),active:true});
 }else if(action==="contract.create"||action==="contract.update"){
  const projectIds=input.project_ids as string[];
  if(!s.clients.some(c=>c.id===text("client_id"))||projectIds.some(pid=>!s.projects.some(p=>p.id===pid&&p.client_id===text("client_id"))))throw Error("Confira o cliente e os projetos.");
  if(text("end_date")&&text("end_date")<text("start_date"))throw Error("A data final deve ser posterior à inicial.");
  const before=s.contracts.find(c=>c.id===text("id"));
  if(action==="contract.update"&&(!before||before.version!==num("version")||before.status==="closed"||before.client_id!==text("client_id")))throw Error("Atualize o contrato antes de continuar.");
  const edited={id:before?.id??id,client_id:text("client_id"),title:text("title"),start_date:text("start_date"),end_date:text("end_date")||null,monthly_cents:positive("monthly_cents"),due_day:num("due_day"),status:before?.status??"active" as const,project_ids:projectIds,version:(before?.version??0)+1};
  if(before)s.contracts=s.contracts.map(c=>c.id===before.id?edited:c);else s.contracts.push(edited);
 }else if(action==="contract.status"){
  const c=s.contracts.find(c=>c.id===text("id"));if(!c||c.version!==num("version")||c.status==="closed")throw Error("Atualize a consulta.");
  c.status=text("status") as typeof c.status;c.version++;
 }else if(action==="recurrence.generate"){
  for(const c of s.contracts.filter(c=>c.status==="active"&&c.start_date.slice(0,7)<=text("month")&&(!c.end_date||c.end_date.slice(0,7)>=text("month")))){
   if(s.invoices.some(i=>i.contract_id===c.id&&i.competence.slice(0,7)===text("month")))continue;
   s.invoices.push({id:crypto.randomUUID(),client_id:c.client_id,project_id:null,contract_id:c.id,direction:"in",title:c.title,counterparty:s.clients.find(x=>x.id===c.client_id)!.name,category:"Mensalidade",competence:text("month")+"-01",due_date:dueDate(text("month"),c.due_day),amount_cents:c.monthly_cents,paid_cents:0,cancelled:false,version:1});
  }
 }else if(action==="invoice.create"){
  if(text("direction")==="in"&&!s.clients.some(c=>c.id===text("client_id")))throw Error("Selecione um cliente.");
  if(text("project_id")&&!s.projects.some(p=>p.id===text("project_id")&&p.client_id===text("client_id")))throw Error("O projeto não pertence ao cliente.");
  const supplier=s.suppliers.find(x=>x.id===text("supplier_id")&&x.active);
  if(text("supplier_id")&&(!supplier||text("direction")!=="out"))throw Error("Selecione um fornecedor ativo para a despesa.");
  if(text("document_reference").length>180||text("notes").length>1000)throw Error("Confira a referência e as observações.");
  const count=Number(input.repeat_months??1);
  if(!["in","out"].includes(text("direction"))||(count>1&&text("direction")!=="out"))throw Error("Repetição mensal disponível somente para despesas.");
  if(text("title").trim().length<3||!text("counterparty").trim())throw Error("Informe a descrição e o fornecedor ou cliente.");
  const schedule=expenseSchedule(text("competence"),text("due_date"),count),amount=positive("amount_cents");
  for(const dates of schedule)s.invoices.push({supplier_id:supplier?.id??null,document_reference:text("document_reference"),notes:text("notes"),id:crypto.randomUUID(),client_id:text("client_id")||null,project_id:text("project_id")||null,contract_id:null,direction:text("direction") as "in"|"out",title:text("title"),counterparty:supplier?.name??text("counterparty"),category:text("category"),...dates,amount_cents:amount,paid_cents:0,cancelled:false,version:1});
 }else if(action==="invoice.settle"||action==="invoice.cancel"){
  const i=s.invoices.find(i=>i.id===text("id"));if(!i||i.version!==num("version")||i.cancelled)throw Error("Atualize a consulta antes de continuar.");
  if(action==="invoice.cancel"){
   if(i.paid_cents||text("reason").trim().length<5)throw Error("Estorne os pagamentos e informe o motivo antes de cancelar.");
   i.cancelled=true;
  }else{
   const amount=positive("amount_cents");
   if(amount>i.amount_cents-i.paid_cents)throw Error("O valor supera o saldo em aberto.");
   if(text("paid_on")>todayInBrazil())throw Error("O pagamento não pode ter data futura.");
   if(!s.accounts.some(a=>a.id===text("account_id")&&a.active))throw Error("Selecione a conta financeira.");
   s.settlements.unshift({id,invoice_id:i.id,account_id:text("account_id"),amount_cents:amount,paid_on:text("paid_on"),method:text("method"),reference:text("reference"),reversed:false,created_at:new Date().toISOString()});i.paid_cents+=amount;
  }i.version++;
 }else if(action==="settlement.reverse"){
  const x=s.settlements.find(x=>x.id===text("id"));if(!x||x.reversed||text("reason").trim().length<5)throw Error("Informe o motivo do estorno.");
  x.reversed=true;const i=s.invoices.find(i=>i.id===x.invoice_id)!;i.paid_cents-=x.amount_cents;i.version++;
 }else if(action==="transfer.create"){
  if(!s.accounts.some(a=>a.id===text("from_account_id")&&a.active)||!s.accounts.some(a=>a.id===text("to_account_id")&&a.active))throw Error("Escolha contas ativas.");
  if(text("from_account_id")===text("to_account_id"))throw Error("Escolha contas diferentes.");
  if(text("paid_on")>todayInBrazil())throw Error("A transferência não pode ter data futura.");
  s.transfers.push({id,from_account_id:text("from_account_id"),to_account_id:text("to_account_id"),amount_cents:positive("amount_cents"),paid_on:text("paid_on")});
 }else if(action==="settings.save"){
  s.categories=input.categories as string[];if(!s.categories.includes("Mensalidade"))throw Error("Mantenha a categoria Mensalidade.");
 }else throw Error("Operação indisponível.");
 s.audit.unshift({id:(s.audit[0]?.id??0)+1,action,created_at:new Date().toISOString()});return s;
}
export function demoClientView(state:FinanceState,clientId:string) {
 const invoices=state.invoices.filter(i=>i.client_id===clientId&&i.direction==="in"&&i.category==="Mensalidade");
 return {invoices:invoices.map(i=>({id:i.id,title:i.title,competence:i.competence,due_date:i.due_date,amount_cents:i.amount_cents,paid_cents:i.paid_cents,cancelled:i.cancelled})),
 settlements:state.settlements.filter(s=>!s.reversed&&invoices.some(i=>i.id===s.invoice_id)).map(s=>({id:s.id,invoice_id:s.invoice_id,amount_cents:s.amount_cents,paid_on:s.paid_on})),
 campaigns:state.campaigns.filter(c=>c.clientId===clientId)};
}
