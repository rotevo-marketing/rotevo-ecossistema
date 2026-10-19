import test from 'node:test';
import assert from 'node:assert/strict';
import {makeFinanceDemo,mutateDemo,demoClientView,demoClientA} from '../../src/lib/finance/demo.ts';
import {cashForecast,dueWindow} from '../../src/lib/finance/lifecycle.ts';
import {accountBalance} from '../../src/lib/finance/model.ts';
const createSupplier=s=>mutateDemo(s,'supplier.save',{name:'Fornecedor teste',document:'',email:'teste@example.com',phone:'',notes:'PRIVATE_NOTE'});
const createSubscription=s=>mutateDemo(s,'subscription.save',{supplier_id:s.suppliers.at(-1).id,title:'Assinatura teste',category:'Ferramentas',amount_cents:10000,start_date:'2027-01-01',end_date:'2027-06-30',due_day:31});
test('subscription generation is unique; repricing preserves issued invoices and supplier balances',()=>{
 let s=createSubscription(createSupplier(makeFinanceDemo())),sub=s.subscriptions.at(-1);
 s=mutateDemo(s,'subscription.generate',{month:'2027-02'});s=mutateDemo(s,'subscription.generate',{month:'2027-02'});
 assert.equal(s.invoices.filter(x=>x.subscription_id===sub.id).length,1);
 const original=s.invoices.find(x=>x.subscription_id===sub.id);assert.equal(original.due_date,'2027-02-28');
 s=mutateDemo(s,'subscription.save',{...sub,amount_cents:12000});s=mutateDemo(s,'subscription.generate',{month:'2027-03'});
 assert.equal(s.invoices.find(x=>x.id===original.id).amount_cents,10000);
 assert.equal(s.invoices.find(x=>x.subscription_id===sub.id&&x.competence==='2027-03-01').amount_cents,12000);
 assert.equal(s.invoices.find(x=>x.subscription_id===sub.id&&x.competence==='2027-03-01').due_date,'2027-03-31');
 assert.equal(JSON.stringify(demoClientView(s,demoClientA)).includes('PRIVATE_NOTE'),false);
});
test('pause, archive, reactivate and close preserve history and obey supplier/vigency rules',()=>{
 let s=createSubscription(createSupplier(makeFinanceDemo())),sub=s.subscriptions.at(-1),supplier=s.suppliers.at(-1);
 assert.throws(()=>mutateDemo(s,'supplier.status',{id:supplier.id,version:1,active:false}));
 s=mutateDemo(s,'subscription.status',{id:sub.id,version:1,status:'paused'});
 s=mutateDemo(s,'subscription.generate',{month:'2027-03'});assert.equal(s.invoices.some(x=>x.subscription_id===sub.id),false);
 s=mutateDemo(s,'supplier.status',{id:supplier.id,version:1,active:false});
 assert.throws(()=>mutateDemo(s,'subscription.status',{id:sub.id,version:2,status:'active'}));
 s=mutateDemo(s,'supplier.status',{id:supplier.id,version:2,active:true});
 s=mutateDemo(s,'subscription.status',{id:sub.id,version:2,status:'active'});
 s=mutateDemo(s,'subscription.generate',{month:'2027-07'});assert.equal(s.invoices.some(x=>x.subscription_id===sub.id),false);
 s=mutateDemo(s,'subscription.generate',{month:'2027-06'});const count=s.invoices.length;
 s=mutateDemo(s,'subscription.status',{id:sub.id,version:3,status:'closed'});
 assert.throws(()=>mutateDemo(s,'subscription.status',{id:sub.id,version:4,status:'active'}));assert.equal(s.invoices.length,count);
});
test('invoice correction is versioned, preserves ownership and rejects paid or canceled entries',()=>{
 let s=makeFinanceDemo(),i=s.invoices[1],changes={id:i.id,version:1,title:'Revisada',counterparty:i.counterparty,category:i.category,amount_cents:510000,due_date:'2027-02-28',document_reference:'FAT-02',notes:'PRIVATE'};
 s=mutateDemo(s,'invoice.update',changes);let edited=s.invoices[1];assert.equal(edited.client_id,i.client_id);assert.equal(edited.amount_cents,510000);assert.equal(edited.version,2);
 assert.throws(()=>mutateDemo(s,'invoice.update',changes));
 s=mutateDemo(s,'invoice.settle',{id:i.id,version:2,amount_cents:100,paid_on:'2026-01-01',method:'Pix',account_id:s.accounts[0].id});
 assert.throws(()=>mutateDemo(s,'invoice.update',{...changes,version:3}));
 assert.equal(JSON.stringify(demoClientView(s,i.client_id)).includes('FAT-02'),false);
});
test('archived accounts retain cash but reject new payments and transfers',()=>{
 let s=makeFinanceDemo(),account=s.accounts[0],opening=accountBalance(s,account.id);
 s=mutateDemo(s,'account.update',{id:account.id,name:'Conta arquivada',active:false});assert.equal(accountBalance(s,account.id),opening);
 assert.throws(()=>mutateDemo(s,'invoice.settle',{id:s.invoices[1].id,version:1,amount_cents:100,account_id:account.id,paid_on:'2026-01-01',method:'Pix'}));
 assert.throws(()=>mutateDemo(s,'transfer.create',{from_account_id:account.id,to_account_id:s.accounts[1].id,amount_cents:100,paid_on:'2026-01-01'}));
});
test('due filters cross competences and projection excludes paid, canceled and overdue',()=>{
 const base=makeFinanceDemo().invoices[1],today='2027-02-15';
 assert.equal(dueWindow({...base,due_date:'2027-01-31'},'overdue',today),true);
 assert.equal(dueWindow({...base,due_date:'2027-02-16'},'7',today),true);
 assert.equal(dueWindow({...base,due_date:'2027-02-16',paid_cents:base.amount_cents},'7',today),false);
 const s=makeFinanceDemo();s.invoices=[{...base,direction:'in',due_date:'2027-02-16',amount_cents:10000,paid_cents:0},{...base,id:'out',direction:'out',due_date:'2027-03-01',amount_cents:3000,paid_cents:0},{...base,id:'old',due_date:'2027-01-01',amount_cents:500,paid_cents:0}];
 const f=cashForecast(s,20000,today);assert.equal(f.pastIn,500);assert.equal(f.rows[0].closing,30000);assert.equal(f.rows[1].closing,27000);
});
test('read-only finance permission rejects every lifecycle mutation',()=>{
 const s={...makeFinanceDemo(),canWrite:false};for(const action of ['supplier.save','supplier.status','subscription.save','subscription.status','subscription.generate','invoice.update','account.update'])assert.throws(()=>mutateDemo(s,action,{}));
});
