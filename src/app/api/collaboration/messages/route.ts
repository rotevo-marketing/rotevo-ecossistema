import {NextRequest,NextResponse} from "next/server";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import {canAccessConversation,parseMessageBody,parseResource,requiredModule,sharedContentVersion} from "@/lib/collaboration/guards";
import {workspaceForClient} from "@/lib/operations/model";

export const runtime="nodejs";
const fail=(status:number)=>NextResponse.json({error:status===429?"Limite de mensagens atingido. Tente novamente em um minuto.":"Conversa indisponível ou acesso não autorizado."},{status,headers:{"Cache-Control":"no-store"}});
const safe=(payload:unknown,status=200)=>NextResponse.json(payload,{status,headers:{"Cache-Control":"no-store"}});
type Params={projectId:string;resourceId:string;resourceType:"task"|"content"};
type Message={id:string;project_id:string;resource_type:string;resource_id:string;content_version:string|null;author_role:string;author_user_id:string;body:string;created_at:string};
type VisibleMessage=Omit<Message,"author_user_id">&{author_name:string;author_avatar_url:string|null};
const PAGE_SIZE=30;
function decodeCursor(raw:string|null):{created_at:string;id:string}|null|false{
 if(raw===null)return null;
 if(raw.length<4||raw.length>400||!/^[A-Za-z0-9_-]+$/.test(raw))return false;
 try{
  const value=JSON.parse(Buffer.from(raw,"base64url").toString("utf8")) as unknown;
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  if(typeof row.created_at!=="string"||row.created_at.length>45||
     !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(row.created_at)||
     !Number.isFinite(Date.parse(row.created_at))||
     typeof row.id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id))return false;
  return {created_at:row.created_at,id:row.id};
 }catch{return false;}
}
function encodeCursor(row:Message):string{
 return Buffer.from(JSON.stringify({created_at:row.created_at,id:row.id})).toString("base64url");
}


async function authorize(req:NextRequest,params:Params,write:boolean){
 // Explicitly disabled until the isolated database proposal has been reviewed, tested and applied.
 if(process.env.ROTEVO_COLLABORATION_ENABLED!=="true")return {status:503 as const};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return {status:503 as const};
 const header=req.headers.get("authorization");
 if(!header?.startsWith("Bearer ")||!header.slice(7).trim())return {status:401 as const};
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await auth.auth.getUser(header.slice(7));
 if(authError||!identity.user)return {status:401 as const};
 if(identity.user.app_metadata?.rotevo_password_reset_required===true)return {status:403 as const};
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles").select("role,client_id").eq("id",identity.user.id).maybeSingle();
 if(profileError)return {status:503 as const};
 if(!profile||!["client","strategist","staff"].includes(profile.role))return {status:403 as const};
 const {data:project,error:projectError}=await admin.from("planning_projects").select("id,client_id,data").eq("id",params.projectId).maybeSingle();
 if(projectError)return {status:503 as const};
 if(!project)return {status:404 as const};
 let modules:string[]=[];
 let teamActive: boolean|undefined,assigned:boolean|undefined,permissions:string[]|undefined;
 if(profile.role==="client"){
  // Missing or invalid workspace must not fall back to all modules.
  const {data:workspace,error:workspaceError}=await admin.from("client_workspaces").select("data").eq("client_id",project.client_id).maybeSingle();
  if(workspaceError)return {status:503 as const};
  modules=workspaceForClient(workspace?.data).modules;
  if(!modules.includes(requiredModule(params.resourceType)))return {status:403 as const};
 }
 if(profile.role==="staff"||(profile.role==="strategist"&&process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED==="true")){
  const {data:member,error:memberError}=await admin.from("team_members").select("role,active").eq("user_id",identity.user.id).maybeSingle();
  if(memberError)return {status:503 as const};
  teamActive=member?.active===true;
  if(!teamActive)return {status:403 as const};
  if(member?.role!=="admin"||profile.role==="staff"){
   const [assignmentResult,permissionResult]=await Promise.all([
    admin.from("team_project_assignments").select("project_id").eq("user_id",identity.user.id).eq("project_id",params.projectId).maybeSingle(),
    admin.from("team_member_permissions").select("permission").eq("user_id",identity.user.id)
   ]);
   if(assignmentResult.error||permissionResult.error)return {status:503 as const};
   assigned=!!assignmentResult.data;
   permissions=(permissionResult.data??[]).map(row=>row.permission as string);
   if(!assigned||!permissions.includes(write?"projects.write":"projects.read"))return {status:403 as const};
  }else{
   assigned=true;
   permissions=["projects.read","projects.write"];
  }
 }
 if(!canAccessConversation({role:profile.role,userClientId:profile.client_id,projectClientId:project.client_id,workspaceModules:modules,projectData:project.data,resourceType:params.resourceType,resourceId:params.resourceId,teamActive,assigned,permissions}))
  return {status:403 as const};
 return {admin,userId:identity.user.id,role:profile.role as string,projectClientId:project.client_id as string,contentVersion:params.resourceType==="content"?sharedContentVersion(project.data,params.resourceId):null};
}


// Resolve identities only after item authorization. Never return email or author_user_id.
async function presentMessages(admin:SupabaseClient,rows:Message[],projectClientId:string):Promise<VisibleMessage[]>{
 if(!rows.length)return [];
 const ids=[...new Set(rows.map(row=>row.author_user_id))];
 const [prefs,profiles]=await Promise.all([
  admin.from("user_preferences").select("user_id,display_name,avatar_asset_id").in("user_id",ids),
  admin.from("profiles").select("id,full_name,email,client_id").in("id",ids)
 ]);
 if(prefs.error||profiles.error)throw Error("conversation_author_lookup_failed");
 const profileById=new Map((profiles.data??[]).map(row=>[row.id,row]));
 const users=new Map((prefs.data??[]).map(row=>[row.user_id,row]));
 const needsClientCover=rows.some(row=>row.author_role==="client"&&!users.get(row.author_user_id)?.avatar_asset_id);
 const hasClientAuthor=rows.some(row=>row.author_role==="client");
 const cover=hasClientAuthor?await admin.from("clients").select("name,contact_name,contact_email,cover_image_url").eq("id",projectClientId).maybeSingle():null;
 if(cover?.error)throw Error("conversation_client_avatar_lookup_failed");
 const coverRef=cover?.data?.cover_image_url;
 const coverAsset=typeof coverRef==="string"&&coverRef.startsWith("asset://")?coverRef.slice(8):"";
 const assetIds=[...new Set([...ids.map(id=>users.get(id)?.avatar_asset_id).filter((id):id is string=>typeof id==="string"),...(coverAsset?[coverAsset]:[])])];
 const signed=new Map<string,string>();
 if(assetIds.length){
  const assets=await admin.from("project_assets").select("id,storage_path").eq("purpose","avatar").in("id",assetIds);
  if(assets.error)throw Error("conversation_avatar_lookup_failed");
  const paths=(assets.data??[]).map(row=>row.storage_path as string);
  if(paths.length){
   const urls=await admin.storage.from("rotevo-private").createSignedUrls(paths,3600);
   if(urls.error||urls.data?.some(item=>item.error))throw Error("conversation_avatar_signing_failed");
   const byPath=new Map((urls.data??[]).map(item=>[item.path,item.signedUrl]));
   for(const asset of assets.data??[]){const url=byPath.get(asset.storage_path);if(url)signed.set(asset.id,url);}
  }
 }
 const coverUrl=coverAsset?signed.get(coverAsset)??null:typeof coverRef==="string"&&coverRef.startsWith("https://")?coverRef:null;
 return rows.map(({author_user_id,...message})=>{
  const person=users.get(author_user_id);
  const profile=profileById.get(author_user_id);
  const preferredName=String(person?.display_name??"").trim();
  const profileName=String(profile?.full_name??"").trim();
  const companyName=String(cover?.data?.name??"").trim();
  const contactName=String(cover?.data?.contact_name??"").trim();
  const contactEmail=String(cover?.data?.contact_email??"").trim().toLowerCase();
  const accountEmail=String(profile?.email??"").trim().toLowerCase();
  const verifiedContact=message.author_role==="client"&&profile?.client_id===projectClientId&&!!contactName&&!!contactEmail&&accountEmail===contactEmail;
  const isCompany=(name:string)=>!!name&&!!companyName&&name.toLocaleLowerCase("pt-BR")===companyName.toLocaleLowerCase("pt-BR");
  const name=verifiedContact&&(!preferredName||isCompany(preferredName))&&(!profileName||isCompany(profileName))
    ?contactName:(preferredName&&!isCompany(preferredName)?preferredName:profileName||preferredName);
  const fallback=message.author_role==="client"?"Cliente":"Equipe Rotevo";
  const asset=person?.avatar_asset_id as string|null|undefined;
  return {...message,author_name:name||fallback,author_avatar_url:(asset?signed.get(asset):undefined)??(message.author_role==="client"?coverUrl:null)??null};
 });
}

export async function GET(req:NextRequest){
 const params=parseResource({projectId:req.nextUrl.searchParams.get("projectId"),resourceId:req.nextUrl.searchParams.get("resourceId"),resourceType:req.nextUrl.searchParams.get("resourceType")});
 if(!params)return fail(400);
 const session=await authorize(req,params,false);
 if("status" in session && typeof session.status==="number")return fail(session.status);
 const cursor=decodeCursor(req.nextUrl.searchParams.get("cursor"));
 if(cursor===false)return fail(400);
 let query=session.admin.from("rotevo_collaboration_messages")
  .select("id,project_id,resource_type,resource_id,content_version,author_role,author_user_id,body,created_at")
  .eq("project_id",params.projectId).eq("resource_type",params.resourceType).eq("resource_id",params.resourceId)
  .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(PAGE_SIZE+1);
 if(cursor)query=query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
 const {data,error}=await query;
 if(error)return fail(503);
 const rows=(data??[]) as Message[];
 const hasMore=rows.length>PAGE_SIZE;
 const slice=rows.slice(0,PAGE_SIZE);
 const nextCursor=hasMore&&slice.length?encodeCursor(slice[slice.length-1]):null;
 try{const messages=await presentMessages(session.admin,slice.reverse(),session.projectClientId);return safe({messages,nextCursor});}catch{return fail(503);}
}
export async function POST(req:NextRequest){
 let raw:unknown;try{raw=await req.json();}catch{return fail(400);}
 const params=parseResource(raw);
 if(!params||!raw||typeof raw!=="object"||Array.isArray(raw))return fail(400);
 const body=parseMessageBody((raw as Record<string,unknown>).body);
 if(body===null)return fail(400);
 const session=await authorize(req,params,true);
 if("status" in session && typeof session.status==="number")return fail(session.status);
 const expectedAuthor=(raw as Record<string,unknown>).expectedAuthorUserId;
 if(expectedAuthor!==undefined&&(typeof expectedAuthor!=="string"||expectedAuthor!==session.userId))return fail(409);
 const {data,error}=await session.admin.from("rotevo_collaboration_messages").insert({
  project_id:params.projectId,resource_type:params.resourceType,resource_id:params.resourceId,
  author_user_id:session.userId,author_role:session.role,content_version:session.contentVersion,body
 }).select("id,project_id,resource_type,resource_id,content_version,author_role,body,created_at").single();
 if(error){
  if(error.code==="P0001"&&error.message==="rotevo_collaboration_rate_limited")return fail(429);
  return fail(503);
 }
 return safe({message:data},201);
}
