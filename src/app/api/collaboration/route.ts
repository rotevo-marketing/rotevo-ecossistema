import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status:number)=>NextResponse.json({error:status===503?"Comentários indisponíveis. Nenhuma mensagem foi enviada.":"Acesso negado ou solicitação inválida."},{status,headers:{"Cache-Control":"no-store"}});
type Req={projectId:string;itemType:"task"|"content";itemId:string;contentVersion?:string;kind?:"comment"|"task_approved"|"task_changes_requested";body?:string};
async function authorized(req:NextRequest,b:Req){
 if(!uuid.test(b.projectId)||!["task","content"].includes(b.itemType)||typeof b.itemId!=="string"||b.itemId.length<1||b.itemId.length>100||typeof b.contentVersion!=="undefined"&&(typeof b.contentVersion!=="string"||b.contentVersion.length>30))return {error:400 as const};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return {error:503 as const};
 const header=req.headers.get("authorization");
 if(!header?.startsWith("Bearer ")||!header.slice(7).trim())return {error:401 as const};
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await auth.auth.getUser(header.slice(7));
 if(authError||!identity.user)return {error:401 as const};
 if(identity.user.app_metadata?.rotevo_password_reset_required===true)return {error:403 as const};
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles").select("role,client_id").eq("id",identity.user.id).maybeSingle();
 if(profileError)return {error:503 as const};
 if(!profile||!["client","strategist"].includes(profile.role))return {error:403 as const};
 const {data:project,error:projectError}=await admin.from("planning_projects").select("client_id,data").eq("id",b.projectId).maybeSingle();
 if(projectError)return {error:503 as const};
 if(!project)return {error:404 as const};
 const data=project.data&&typeof project.data==="object"&&!Array.isArray(project.data)?project.data as Record<string,unknown>:{};
 const field=b.itemType==="task"?"executionTimeline":"editorialCalendar";
 const records=Array.isArray(data[field])?data[field] as Record<string,unknown>[]:[];
 const item=records.find(x=>x&&typeof x==="object"&&x.id===b.itemId);
 if(!item||item.archivedAt||item.deletedAt)return {error:404 as const};
 const version=b.itemType==="content"?typeof item.version==="string"?item.version:"":"";
 if(b.itemType==="content"&&b.contentVersion!==version)return {error:409 as const};
 if(profile.role==="client"){
  if(profile.client_id!==project.client_id||item.visibleToClient!==true)return {error:403 as const};
  const module=b.itemType==="task"?"execution":"content";
  if(Array.isArray(data.portalModules)&&!data.portalModules.includes(module))return {error:403 as const};
  const {data:workspace,error:workspaceError}=await admin.from("client_workspaces").select("data").eq("client_id",profile.client_id).maybeSingle();
  if(workspaceError)return {error:503 as const};
  const modules=workspace?.data&&typeof workspace.data==="object"?(workspace.data as Record<string,unknown>).modules:null;
  if(Array.isArray(modules)&&!modules.includes(module))return {error:403 as const};
 }else if(process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED==="true"){
  const {data:member,error:memberError}=await admin.from("team_members").select("role,active").eq("user_id",identity.user.id).maybeSingle();
  if(memberError)return {error:503 as const};
  if(!member||!member.active)return {error:403 as const};
  if(member.role!=="admin"){
   const permission=b.itemType==="task"?"tasks.read":"editorial.read";
   const [assignment,allowed]=await Promise.all([admin.from("team_project_assignments").select("project_id").eq("user_id",identity.user.id).eq("project_id",b.projectId).maybeSingle(),admin.from("team_member_permissions").select("permission").eq("user_id",identity.user.id).eq("permission",permission).maybeSingle()]);
   if(assignment.error||allowed.error)return {error:503 as const};
   if(!assignment.data||!allowed.data)return {error:403 as const};
  }
 }
 return {admin,userId:identity.user.id,role:profile.role as "client"|"strategist",version};
}
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams;
 const b={projectId:p.get("projectId")??"",itemType:p.get("itemType")??"",itemId:p.get("itemId")??"",contentVersion:p.get("contentVersion")??""} as Req;
 if(!["task","content"].includes(b.itemType))return fail(400);
 const v=await authorized(req,b);if("error" in v)return fail(v.error??503);
 const {data,error}=await v.admin.from("project_collaboration_messages").select("id,author_id,author_kind,message_type,body,created_at").eq("project_id",b.projectId).eq("item_type",b.itemType).eq("item_id",b.itemId).order("created_at",{ascending:true}).limit(100);
 if(error)return fail(503);
 return NextResponse.json({messages:data??[],currentUserId:v.userId},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
 let b:Req;
 try{b=await req.json() as Req;}catch{return fail(400);}
 if(!b||typeof b!=="object"||!["task","content"].includes(b.itemType))return fail(400);
 if(typeof b.body!=="string"||b.body.trim().length<1||b.body.trim().length>2000)return fail(400);
 const kind=b.kind??"comment";
 if(!["comment","task_approved","task_changes_requested"].includes(kind))return fail(400);
 const v=await authorized(req,b);if("error" in v)return fail(v.error??503);
 if(kind!=="comment"&&(v.role!=="client"||b.itemType!=="task"||(kind==="task_changes_requested"&&b.body.trim().length<3)))return fail(403);
 const after=new Date(Date.now()-60000).toISOString();
 const {count,error:rateError}=await v.admin.from("project_collaboration_messages").select("id",{count:"exact",head:true}).eq("author_id",v.userId).gte("created_at",after);
 if(rateError)return fail(503);
 if((count??0)>=15)return fail(429);
 const {data,error}=await v.admin.from("project_collaboration_messages").insert({project_id:b.projectId,item_type:b.itemType,item_id:b.itemId,content_version:v.version,message_type:kind,body:b.body.trim(),author_id:v.userId,author_kind:v.role}).select("id,author_id,author_kind,message_type,body,created_at").single();
 if(error||!data)return fail(503);
 return NextResponse.json({message:data},{status:201,headers:{"Cache-Control":"no-store"}});
}
