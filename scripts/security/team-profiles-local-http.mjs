import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
if(process.env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:54321'||process.env.ROTEVO_LOCAL_API_TESTS!=='YES_LOCAL_ONLY'||process.env.ROTEVO_LOCAL_APP_URL!=='http://127.0.0.1:3000/')throw Error('Exact local-only test targets required');
const opts={auth:{persistSession:false,autoRefreshToken:false}},db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,opts),users=[],assets=[],tag=randomUUID(),password='Synthetic-'+randomUUID()+'!';let checks=0;
const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
async function call(path,jwt,body,method=body===undefined?'GET':'PATCH'){const r=await fetch(process.env.ROTEVO_LOCAL_APP_URL.slice(0,-1)+path,{method,headers:{...(jwt?{Authorization:'Bearer '+jwt}:{}),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000)});return {status:r.status,data:await r.json()};}
async function login(email){const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,opts),r=await client.auth.signInWithPassword({email,password});assert.ifError(r.error);return {db:client,jwt:r.data.session.access_token};}
async function seed(label,role,memberRole){const email='team-photo-'+tag+'-'+label+'@rotevo.invalid';const u=await db.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(u.error);users.push(u.data.user.id);assert.ifError((await db.from('profiles').insert({id:u.data.user.id,email,role,full_name:'Synthetic '+label})).error);if(memberRole)assert.ifError((await db.from('team_members').insert({user_id:u.data.user.id,display_name:'Synthetic '+label,role:memberRole,active:true})).error);return {id:u.data.user.id,email,...await login(email)};}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5ioAAAAASUVORK5CYII=','base64');
async function photo(jwt){const f=new FormData();f.set('purpose','avatar');f.set('file',new Blob([png],{type:'image/png'}),'synthetic-photo.png');const r=await call('/api/assets',jwt,f,'POST');check(r.status,201,'private image upload');assets.push(r.data.id);return 'asset://'+r.data.id;}
async function directory(jwt){const r=await call('/api/team/directory',jwt);check(r.status,200,'administrator directory');return r.data.members;}
async function registered(email){const r=await db.from('profiles').select('id').eq('email',email).maybeSingle();assert.ifError(r.error);if(r.data&&!users.includes(r.data.id))users.push(r.data.id);return r.data?.id;}
try{
 const admin=await seed('admin','strategist','admin'),staff=await seed('staff','staff','producer'),customer=await seed('customer','client');
 check((await call('/api/team/members/profile',null,{})).status,401,'anonymous cannot edit');
 const edit={userId:staff.id,displayName:'Edited staff',avatarRef:'',expectedUpdatedAt:null};
 check((await call('/api/team/members/profile',staff.jwt,edit)).status,403,'staff cannot administer profiles');check((await call('/api/team/members/profile',customer.jwt,edit)).status,403,'customer cannot administer profiles');
 check((await call('/api/team/members/profile',admin.jwt,{...edit,userId:customer.id})).status,404,'cannot edit non-team identity');
 const ownPhoto=await photo(admin.jwt);const own={userId:admin.id,displayName:'Administrator edited in team',avatarRef:ownPhoto,expectedUpdatedAt:null};
 check((await call('/api/team/members/profile',admin.jwt,own)).status,200,'admin edits own profile in team');
 let ownProfile=(await call('/api/account/profile',admin.jwt)).data.profile;check(ownProfile.displayName,own.displayName,'own menu uses canonical team name');check(ownProfile.avatarRef,ownPhoto,'own menu photo synchronized');
 check((await call('/api/team/members/profile',admin.jwt,own)).status,409,'stale initial write refused');
 const staffPhoto=await photo(admin.jwt);const request={...edit,avatarRef:staffPhoto};check((await call('/api/team/members/profile',admin.jwt,request)).status,200,'admin assigns staff photo');
 let members=await directory(admin.jwt),m=members.find(m=>m.user_id===staff.id);check(m.display_name,edit.displayName,'directory uses edited name');check(m.avatar_ref,staffPhoto,'directory uses canonical photo');check(typeof m.avatar_url,'string','directory photo signed');
 const image=await fetch(m.avatar_url);check(image.status,200,'signed directory image downloads');check(Buffer.from(await image.arrayBuffer()).equals(png),true,'photo bytes retained');
 let p=(await call('/api/account/profile',staff.jwt)).data.profile;check(p.avatarRef,staffPhoto,'staff sees admin-assigned photo');
 check((await call('/api/assets/resolve',staff.jwt,{ids:[staffPhoto.slice(8)]},'POST')).status,200,'staff can read assigned photo without ownership change');check((await call('/api/assets/resolve',customer.jwt,{ids:[staffPhoto.slice(8)]},'POST')).status,403,'other identity cannot resolve photo');
 check((await call('/api/account/profile',staff.jwt,{displayName:'Self edited staff',avatarRef:staffPhoto,expectedUpdatedAt:p.updatedAt})).status,200,'self edit preserves administrator assigned photo');
 check((await directory(admin.jwt)).find(m=>m.user_id===staff.id).display_name,'Self edited staff','self edit updates team listing');
 check((await call('/api/team/members/profile',admin.jwt,{...request,expectedUpdatedAt:p.updatedAt})).status,409,'concurrent stale admin edit refused');
 p=(await call('/api/account/profile',staff.jwt)).data.profile;
 check((await call('/api/team/members/profile',admin.jwt,{...request,expectedUpdatedAt:p.updatedAt,role:'admin'})).status,400,'role overposting refused');check((await call('/api/team/members/profile',admin.jwt,{...request,expectedUpdatedAt:p.updatedAt,email:'other@rotevo.invalid'})).status,400,'email overposting refused');
 const otherPhoto=await photo(customer.jwt);check((await call('/api/team/members/profile',admin.jwt,{...request,avatarRef:otherPhoto,expectedUpdatedAt:p.updatedAt})).status,403,'cannot adopt unrelated customer photo');
 check((await call('/api/team/members/profile',admin.jwt,{...request,avatarRef:'https://example.invalid/photo.png',expectedUpdatedAt:p.updatedAt})).status,400,'remote photo injection refused');
 check((await call('/api/team/members/profile',admin.jwt,{...request,avatarRef:'',expectedUpdatedAt:p.updatedAt})).status,200,'admin removes staff photo');
 check((await call('/api/account/profile',staff.jwt)).data.profile.avatarRef,'','removed photo reflected in profile');check((await directory(admin.jwt)).find(m=>m.user_id===staff.id).avatar_url,null,'removed photo reflected in team');
 check((await staff.db.from('user_preferences').select('*')).error!==null,true,'raw preferences remain private');
 for(const withPhoto of [true,false]){
  const email='team-photo-'+tag+'-invite-'+withPhoto+'@rotevo.invalid',data={email,displayName:'New colleague '+withPhoto,role:'producer',temporaryPassword:password,...(withPhoto?{avatarRef:ownPhoto}:{})};
  const invited=await call('/api/team/invite',admin.jwt,data,'POST');const id=await registered(email);check(invited.status,201,'invite '+(withPhoto?'with photo':'without photo'));assert.ok(id);
  const state=await db.from('team_members').select('active,role').eq('user_id',id).single();check(state.data,{active:false,role:'producer'},'profile does not grant access');
  const pref=await db.from('user_preferences').select('display_name,avatar_asset_id').eq('user_id',id).single();check(pref.data,{display_name:data.displayName,avatar_asset_id:withPhoto?ownPhoto.slice(8):null},'invitation persisted canonical preferences');
  check((await call('/api/team/invite',admin.jwt,data,'POST')).status,409,'duplicate email refused');
  assert.ifError((await db.auth.admin.updateUserById(id,{app_metadata:{rotevo_password_reset_required:false}})).error);assert.ifError((await db.from('team_members').update({active:true}).eq('user_id',id)).error);
  const user=await login(email);check((await call('/api/account/profile',user.jwt)).data.profile.avatarRef,withPhoto?ownPhoto:'','new colleague reads canonical photo');
  if(withPhoto)check((await call('/api/assets/resolve',user.jwt,{ids:[ownPhoto.slice(8)]},'POST')).status,200,'new colleague can resolve photo assigned at registration');
 }
 const badEmail='team-photo-'+tag+'-bad@rotevo.invalid';check((await call('/api/team/invite',admin.jwt,{email:badEmail,displayName:'Forbidden photo',role:'producer',temporaryPassword:password,avatarRef:otherPhoto},'POST')).status,403,'invite rejects photo from unrelated user');check(await registered(badEmail),undefined,'invalid photo creates no identity');
 console.log('PASS: '+checks+' local team profile, invitation, photo, concurrency and authorization checks');
}finally{
 if(assets.length){const rows=await db.from('project_assets').select('storage_path').in('id',assets);assert.ifError(rows.error);if(rows.data.length)assert.ifError((await db.storage.from('rotevo-private').remove(rows.data.map(r=>r.storage_path))).error);assert.ifError((await db.from('project_assets').delete().in('id',assets)).error);}
 for(const id of users)assert.ifError((await db.auth.admin.deleteUser(id)).error);
 console.log('Only this run synthetic users, preferences and photos removed');
}
