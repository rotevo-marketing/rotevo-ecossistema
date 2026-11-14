import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321','UI fixtures are restricted to the local stack');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),file='.vercel/overview-ui-session.json';
if(['empty','forbidden'].includes(process.argv[2])){
 const fixture=JSON.parse(fs.readFileSync(file,'utf8'));
 const response=process.argv[2]==='empty'?await db.from('planning_projects').update({data:{executionTimeline:[],operationalAgenda:[],editorialCalendar:[]}}).in('id',fixture.projectIds):await db.from('team_members').update({active:false}).eq('user_id',fixture.userId);
 assert.ifError(response.error);console.log('Synthetic local state prepared: '+process.argv[2]);
}else if(process.argv[2]==='cleanup'){
 const fixture=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const table of ['planning_projects','clients','team_members','profiles']){
  const ids=table==='planning_projects'?fixture.projectIds:table==='clients'?[fixture.clientId]:[fixture.userId];
  const column=table==='team_members'?'user_id':'id';const {error}=await db.from(table).delete().in(column,ids);assert.ifError(error);
 }
 const {error}=await db.auth.admin.deleteUser(fixture.userId);assert.ifError(error);fs.unlinkSync(file);console.log('Local overview UI fixtures removed.');
}else{
 assert.equal(fs.existsSync(file),false,'Clean up an existing fixture before creating another');
 const prefix='overview-local-'+randomUUID().slice(0,8),email=prefix+'@rotevo.invalid',password='Synthetic-'+randomUUID()+'!';
 const {data:u,error:ue}=await db.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(ue);const userId=u.user.id;
 const fixture={userId,email,password,clientId:null,projectIds:[]};fs.writeFileSync(file,JSON.stringify(fixture));
 const {error:pe}=await db.from('profiles').insert({id:userId,role:'strategist',full_name:'Homologação local',email});assert.ifError(pe);
 const {error:te}=await db.from('team_members').insert({user_id:userId,display_name:'Homologação local',role:'admin',active:true});assert.ifError(te);
 const {data:c,error:ce}=await db.from('clients').insert({name:'Cliente sintético · revisão local',slug:prefix}).select('id').single();assert.ifError(ce);fixture.clientId=c.id;fs.writeFileSync(file,JSON.stringify(fixture));
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const shift=n=>{const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);};
 const task=(id,title,extra={})=>({id,title,status:'planned',priority:'normal',...extra});
 const {data:p,error:pre}=await db.from('planning_projects').insert({client_id:c.id,title:'Operação de homologação · dados sintéticos',slug:prefix,status:'in_progress',data:{
  executionTimeline:[task('blocked','Entrega com bloqueio e atraso',{status:'blocked',dueDate:shift(-2),ownerUserId:userId,owner:'Homologação local',dependencies:['base']}),task('base','Preparar informações do projeto',{dueDate:today,ownerUserId:userId,owner:'Homologação local'}),task('next','Revisar proposta de conteúdo',{dueDate:shift(2),ownerUserId:userId,owner:'Homologação local'}),task('namesake','Atribuição somente por nome',{dueDate:shift(1),owner:'Homologação local'}),task('done','Entrega já concluída',{dueDate:shift(-5),status:'completed'})],
  operationalAgenda:[{id:'meeting-a',title:'Reunião de acompanhamento',kind:'meeting',date:shift(1),time:'14:00',status:'planned',relatedTaskId:'base',owner:'Homologação local'},{id:'meeting-b',title:'Validação da proposta',kind:'checkpoint',date:shift(3),time:'10:00',status:'planned'},{id:'meeting-c',title:'Compromisso cancelado',kind:'meeting',date:shift(1),status:'cancelled'}],
  editorialCalendar:[{id:'content-a',title:'Material aguardando aprovação',channel:'Instagram',format:'Imagem',publishDate:shift(2),status:'awaiting_client',visibleToClient:true,version:'v1'}],
  ecosystem2027:{version:1,selectedDocumentCodes:['01.02'],documents:{'01.02':{content:'Documento sintético para revisão',updatedAt:new Date().toISOString(),reviewStatus:'review'}}}
 }}).select('id').single();assert.ifError(pre);fixture.projectIds.push(p.id);fs.writeFileSync(file,JSON.stringify(fixture));console.log('Local overview UI fixture created; credentials kept in ignored local file.');
}
