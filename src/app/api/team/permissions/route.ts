import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const allowed=new Set(["projects.read","projects.write","tasks.read","tasks.write","editorial.read","editorial.write","meetings.read","finance.read","finance.write"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status:number,message:string)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
/** Staged administrative permission mutations; disabled unless explicitly activated after RLS review. */
export async function PATCH(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail(503,"Serviço não configurado.");
 const bearer=req.headers.get("authorization");
 if(!bearer?.startsWith("Bearer ")||!bearer.slice(7).trim())return fail(401,"Sessão ausente.");
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await auth.auth.getUser(bearer.slice(7));
 if(identityError||!identity.user)return fail(401,"Sessão inválida.");
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",identity.user.id).maybeSingle();
 if(profileError)return fail(503,"Perfil indisponível.");
 if(profile?.role!=="strategist")return fail(403,"Acesso restrito.");
 const {data:caller,error:callerError}=await admin.from("team_members").select("role,active").eq("user_id",identity.user.id).maybeSingle();
 if(callerError)return fail(503,"Permissões indisponíveis.");
 if(caller?.role!=="admin"||caller.active!==true)return fail(403,"Apenas administradores ativos.");
 // Neither an authenticated account nor a deployed API may enable writes by itself.
 if(process.env.ROTEVO_TEAM_PERMISSIONS_ENABLED!=="true")return fail(503,"Alterações de permissões aguardam homologação.");
 let body:unknown;
 try{body=await req.json()}catch{return fail(400,"Corpo inválido.");}
 if(!body||typeof body!=="object"||Array.isArray(body))return fail(400,"Corpo inválido.");
 const input=body as Record<string,unknown>;
 if(Object.keys(input).some(key=>!["userId","permission","enabled"].includes(key)))return fail(400,"Campos não autorizados.");
 const {userId,permission,enabled}=input;
 if(typeof userId!=="string"||!uuid.test(userId)||typeof permission!=="string"||!allowed.has(permission)||typeof enabled!=="boolean")return fail(400,"Parâmetros inválidos.");
 if(userId===identity.user.id)return fail(403,"Não é permitido alterar as próprias permissões.");
 const {data:target,error:targetError}=await admin.from("team_members").select("role,active").eq("user_id",userId).maybeSingle();
 if(targetError)return fail(503,"Destinatário indisponível.");
 if(!target||target.active!==true)return fail(409,"Colaborador não encontrado ou inativo.");
 if(target.role==="admin")return fail(403,"Permissões de administradores exigem fluxo separado.");
 if(enabled){
  const {error}=await admin.from("team_member_permissions").upsert({user_id:userId,permission},{onConflict:"user_id,permission"});
  if(error)return fail(503,"Não foi possível conceder a permissão.");
 }else{
  const {error}=await admin.from("team_member_permissions").delete().eq("user_id",userId).eq("permission",permission);
  if(error)return fail(503,"Não foi possível revogar a permissão.");
 }
 return NextResponse.json({ok:true,userId,permission,enabled},{headers:{"Cache-Control":"no-store"}});
}
