import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCents,balance,accountBalance,dueDate,campaignInvestments,invoiceStatus} from '../../src/lib/finance/model.ts';
import {makeFinanceDemo,mutateDemo,demoClientView,demoClientA,demoClientB} from '../../src/lib/finance/demo.ts';
test('money is exact in cents and invalid precision is rejected',()=>{
 assert.equal(parseCents('1.234,56'),123456);assert.equal(parseCents('0,29'),29);assert.equal(parseCents('3500.00'),350000);
 for(const v of ['1,999','1e6','Infinity','','1,2,3'])assert.ok(Number.isNaN(parseCents(v)));
});
test('last day of February and leap years',()=>{assert.equal(dueDate('2027-02',31),'2027-02-28');assert.equal(dueDate('2028-02',31),'2028-02-29');});
test('campaign monthly source never adds general spent or treats missing report as zero',()=>{
 const c=campaignInvestments([{id:'p',client_id:'a',title:'P',data:{marketingCampaigns:[{id:'c',title:'C',spent:9000,budget:1000,snapshots:[{month:'2026-10',spent:600}]},{id:'d',title:'D',spent:500}]}}]);
 assert.equal(c[0].spent,600);assert.equal(c[1].spent,null);assert.equal(c.length,2);
 assert.equal(JSON.stringify(c).includes('9000'),false);
});
test('client projection is isolated, read only and excludes internal fields',()=>{
 const s=makeFinanceDemo(),a=demoClientView(s,demoClientA),b=demoClientView(s,demoClientB);
 assert.ok(a.invoices.every(i=>!b.invoices.some(j=>j.id===i.id)));assert.equal(a.invoices.length,1);assert.equal(b.invoices.length,1);
 for(const forbidden of ['accounts','audit','canWrite','actor_id','account_id','counterparty','reference','method','contracts'])assert.equal(JSON.stringify(a).includes('"'+forbidden+'"'),false);
 assert.ok(a.campaigns.every(c=>c.clientId===demoClientA));assert.ok(b.campaigns.every(c=>c.clientId===demoClientB));
});
test('partial payment, duplicate version, overpayment and reversal',()=>{
 let s=makeFinanceDemo();const i=s.invoices.find(i=>i.client_id===demoClientB),account=s.accounts[0].id;
 const opening=accountBalance(s,account);
 s=mutateDemo(s,'invoice.settle',{id:i.id,version:i.version,amount_cents:10000,account_id:account,paid_on:'2026-01-01',method:'Pix'});
 assert.equal(balance(s.invoices.find(x=>x.id===i.id)),470000);assert.equal(accountBalance(s,account),opening+10000);
 assert.throws(()=>mutateDemo(s,'invoice.settle',{id:i.id,version:1,amount_cents:10000,account_id:account,paid_on:'2026-01-01',method:'Pix'}));
 assert.throws(()=>mutateDemo(s,'invoice.settle',{id:i.id,version:2,amount_cents:999999,account_id:account,paid_on:'2026-01-01',method:'Pix'}));
 s=mutateDemo(s,'settlement.reverse',{id:s.settlements[0].id,reason:'Conferência incorreta'});
 assert.equal(balance(s.invoices.find(x=>x.id===i.id)),480000);assert.equal(accountBalance(s,account),opening);
 assert.equal(s.settlements[0].reversed,true);
});
test('recurrence is unique per contract and month; archived conditions preserve invoices',()=>{
 let s=makeFinanceDemo();s=mutateDemo(s,'recurrence.generate',{month:'2027-02'});const count=s.invoices.length;
 s=mutateDemo(s,'recurrence.generate',{month:'2027-02'});assert.equal(s.invoices.length,count);
 const id=s.contracts[0].id;s=mutateDemo(s,'contract.status',{id,version:1,status:'closed'});
 s=mutateDemo(s,'recurrence.generate',{month:'2027-03'});assert.equal(s.invoices.some(i=>i.contract_id===id&&i.competence==='2027-03-01'),false);
 assert.equal(s.invoices.some(i=>i.contract_id===id&&i.competence==='2027-02-01'),true);
});
test('internal transfer preserves consolidated cash',()=>{
 let s=makeFinanceDemo();const total=s.accounts.reduce((sum,a)=>sum+accountBalance(s,a.id),0);
 s=mutateDemo(s,'transfer.create',{from_account_id:s.accounts[0].id,to_account_id:s.accounts[1].id,amount_cents:10000,paid_on:'2026-01-01'});
 assert.equal(s.accounts.reduce((sum,a)=>sum+accountBalance(s,a.id),0),total);
});
test('paid, partial overdue and canceled status remain distinct',()=>{
 const s=makeFinanceDemo(),i=s.invoices[1];assert.equal(invoiceStatus({...i,paid_cents:i.amount_cents},'2027-01-01'),'Paga');
 assert.equal(invoiceStatus({...i,paid_cents:1},'2027-01-01'),'Parcial · atrasada');assert.equal(invoiceStatus({...i,cancelled:true}),'Cancelada');
});
test('monthly expenses need no client, preserve due day and never pay or expose client data',()=>{
 const initial=makeFinanceDemo(),cash=accountBalance(initial,initial.accounts[0].id);
 let s=mutateDemo(initial,'invoice.create',{direction:'out',title:'Assinatura de teste',counterparty:'Fornecedor sintético',category:'Ferramentas',competence:'2028-01',due_date:'2028-01-31',amount_cents:12990,repeat_months:3});
 const invoices=s.invoices.filter(i=>i.title==='Assinatura de teste');
 assert.deepEqual(invoices.map(i=>i.due_date),['2028-01-31','2028-02-29','2028-03-31']);
 assert.deepEqual(invoices.map(i=>i.competence),['2028-01-01','2028-02-01','2028-03-01']);
 assert.ok(invoices.every(i=>i.client_id===null&&i.paid_cents===0&&balance(i)===12990));
 assert.equal(accountBalance(s,s.accounts[0].id),cash);
 assert.equal(JSON.stringify(demoClientView(s,demoClientA)).includes('Assinatura de teste'),false);
 s=mutateDemo(s,'invoice.settle',{id:invoices[0].id,version:1,account_id:s.accounts[0].id,amount_cents:12990,paid_on:'2026-01-01',method:'Cartão'});
 assert.equal(accountBalance(s,s.accounts[0].id),cash-12990);
 assert.equal(s.invoices.find(i=>i.id===invoices[1].id).paid_cents,0);
});
test('invalid repetition counts, dates and repeating revenue are rejected atomically',()=>{
 const s=makeFinanceDemo(),input={direction:'out',title:'Assinatura',counterparty:'Fornecedor',category:'Ferramentas',competence:'2027-01',due_date:'2027-01-31',amount_cents:100};
 for(const count of [0,61,2.5,NaN])assert.throws(()=>mutateDemo(s,'invoice.create',{...input,repeat_months:count}));
 assert.throws(()=>mutateDemo(s,'invoice.create',{...input,due_date:'2027-02-30'}));
 assert.throws(()=>mutateDemo(s,'invoice.create',{...input,direction:'in',client_id:demoClientA,repeat_months:3}));
 assert.equal(s.invoices.length,5);
});
