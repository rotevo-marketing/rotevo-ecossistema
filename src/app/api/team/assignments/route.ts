import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status:number,message:string)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
/** Staged, fail-closed project assignments. Never enable before schema/RLS rollout. */
export async function PATCH(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail(503,"Serviço indisponível.");
 const bearer=req.headers.get("authorization");
 if(!bearer?.startsWith("Bearer ")||!bearer.slice(7).trim())return fail(401,"Sessão ausente.");
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await auth.auth.getUser(bearer.slice(7));
 if(authError||!identity.user)return fail(401,"Sessão inválida.");
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",identity.user.id).maybeSingle();
 if(profileError)return fail(503,"Perfil indisponível.");
 if(profile?.role!=="strategist")return fail(403,"Acesso restrito.");
 const {data:caller,error:callerError}=await admin.from("team_members").select("role,active").eq("user_id",identity.user.id).maybeSingle();
 if(callerError)return fail(503,"Permissões indisponíveis.");
 if(caller?.role!=="admin"||caller.active!==true)return fail(403,"Apenas administradores ativos.");
 if(process.env.ROTEVO_TEAM_ASSIGNMENTS_ENABLED!=="true")return fail(503,"Atribuições aguardam homologação.");
 let body:unknown;
 try{body=await req.json()}catch{return fail(400,"Corpo inválido.");}
 if(!body||typeof body!=="object"||Array.isArray(body))return fail(400,"Corpo inválido.");
 const input=body as Record<string,unknown>;
 if(Object.keys(input).some(key=>!["userId","projectId","assigned"].includes(key)))return fail(400,"Campos não autorizados.");
 const {userId,projectId,assigned}=input;
 if(typeof userId!=="string"||!uuid.test(userId)||typeof projectId!=="string"||!uuid.test(projectId)||typeof assigned!=="boolean")return fail(400,"Parâmetros inválidos.");
 if(userId===identity.user.id)return fail(403,"Atribuições próprias exigem outro administrador.");
 const {data:target,error:targetError}=await admin.from("team_members").select("role,active").eq("user_id",userId).maybeSingle();
 if(targetError)return fail(503,"Colaborador indisponível.");
 if(!target||target.active!==true)return fail(409,"Colaborador inexistente ou inativo.");
 if(target.role==="admin")return fail(403,"Administradores exigem outro fluxo.");
 const {data:project,error:projectError}=await admin.from("planning_projects").select("id").eq("id",projectId).maybeSingle();
 if(projectError)return fail(503,"Projeto indisponível.");
 if(!project)return fail(404,"Projeto não encontrado.");
 if(assigned){
  const {error}=await admin.from("team_project_assignments").upsert({user_id:userId,project_id:projectId},{onConflict:"user_id,project_id"});
  if(error)return fail(503,"Não foi possível atribuir o projeto.");
 }else{
  const {error}=await admin.from("team_project_assignments").delete().eq("user_id",userId).eq("project_id",projectId);
  if(error)return fail(503,"Não foi possível remover a atribuição.");
 }
 return NextResponse.json({ok:true,userId,projectId,assigned},{headers:{"Cache-Control":"no-store"}});
}
