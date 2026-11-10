import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {canAccessConversation,parseMessageBody,parseResource,requiredModule} from "@/lib/collaboration/guards";
import {workspaceForClient} from "@/lib/operations/model";

export const runtime="nodejs";
const fail=(status:number)=>NextResponse.json({error:"Conversa indisponível ou acesso não autorizado."},{status,headers:{"Cache-Control":"no-store"}});
const safe=(payload:unknown,status=200)=>NextResponse.json(payload,{status,headers:{"Cache-Control":"no-store"}});
type Params={projectId:string;resourceId:string;resourceType:"task"|"content"};
type Message={id:string;project_id:string;resource_type:string;resource_id:string;author_user_id:string;author_role:string;body:string;created_at:string};

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
 return {admin,userId:identity.user.id,role:profile.role as string};
}

export async function GET(req:NextRequest){
 const params=parseResource({projectId:req.nextUrl.searchParams.get("projectId"),resourceId:req.nextUrl.searchParams.get("resourceId"),resourceType:req.nextUrl.searchParams.get("resourceType")});
 if(!params)return fail(400);
 const session=await authorize(req,params,false);
 if("status" in session)return fail(session.status);
 const before=req.nextUrl.searchParams.get("before");
 if(before&&(!Number.isFinite(Date.parse(before))||before.length>50))return fail(400);
 let query=session.admin.from("rotevo_collaboration_messages")
  .select("id,project_id,resource_type,resource_id,author_user_id,author_role,body,created_at")
  .eq("project_id",params.projectId).eq("resource_type",params.resourceType).eq("resource_id",params.resourceId)
  .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(50);
 if(before)query=query.lt("created_at",before);
 const {data,error}=await query;
 if(error)return fail(503);
 const messages=((data??[]) as Message[]).reverse();
 return safe({messages});
}
export async function POST(req:NextRequest){
 let raw:unknown;try{raw=await req.json();}catch{return fail(400);}
 const params=parseResource(raw);
 if(!params||!raw||typeof raw!=="object"||Array.isArray(raw))return fail(400);
 const body=parseMessageBody((raw as Record<string,unknown>).body);
 if(body===null)return fail(400);
 const session=await authorize(req,params,true);
 if("status" in session)return fail(session.status);
 const {data,error}=await session.admin.from("rotevo_collaboration_messages").insert({
  project_id:params.projectId,resource_type:params.resourceType,resource_id:params.resourceId,
  author_user_id:session.userId,author_role:session.role,body
 }).select("id,project_id,resource_type,resource_id,author_user_id,author_role,body,created_at").single();
 if(error)return fail(503);
 return safe({message:data},201);
}
