import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status:number,message:string)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
/** Administrative member activation/deactivation. Staged until explicit security approval. */
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
 if(process.env.ROTEVO_TEAM_MEMBER_STATUS_ENABLED!=="true")return fail(503,"Administração de membros aguarda homologação.");
 let body:unknown;
 try{body=await req.json()}catch{return fail(400,"Corpo inválido.");}
 if(!body||typeof body!=="object"||Array.isArray(body))return fail(400,"Corpo inválido.");
 const input=body as Record<string,unknown>;
 if(Object.keys(input).some(key=>!["userId","active"].includes(key)))return fail(400,"Campos não autorizados.");
 const {userId,active}=input;
 if(typeof userId!=="string"||!uuid.test(userId)||typeof active!=="boolean")return fail(400,"Parâmetros inválidos.");
 if(userId===identity.user.id)return fail(403,"Não é permitido alterar a própria situação.");
 const {data:target,error:targetError}=await admin.from("team_members").select("role,active").eq("user_id",userId).maybeSingle();
 if(targetError)return fail(503,"Colaborador indisponível.");
 if(!target)return fail(404,"Colaborador não encontrado.");
 if(target.role==="admin")return fail(403,"Administradores exigem fluxo separado.");
 const {data:updated,error:updateError}=await admin.from("team_members")
  .update({active}).eq("user_id",userId).eq("active",target.active).neq("role","admin").select("user_id,active").maybeSingle();
 if(updateError)return fail(503,"Não foi possível atualizar o membro.");
 if(!updated)return fail(409,"Colaborador alterado por outra sessão. Recarregue os dados.");
 return NextResponse.json({ok:true,userId,active:updated.active},{headers:{"Cache-Control":"no-store"}});
}
