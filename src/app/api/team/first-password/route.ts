import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const fail=(status:number,message:string)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
/** First-login password replacement. Never accepts an arbitrary target user ID. */
export async function POST(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail(503,"Serviço indisponível.");
 const token=req.headers.get("authorization");
 if(!token?.startsWith("Bearer ")||!token.slice(7).trim())return fail(401,"Sessão ausente.");
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await auth.auth.getUser(token.slice(7));
 if(authError||!identity.user)return fail(401,"Sessão inválida.");
 if(identity.user.app_metadata?.rotevo_password_reset_required!==true)return fail(403,"Troca inicial não necessária.");
 let body:unknown;
 try{body=await req.json()}catch{return fail(400,"Dados inválidos.");}
 if(!body||typeof body!=="object"||Array.isArray(body))return fail(400,"Dados inválidos.");
 const obj=body as Record<string,unknown>;
 if(Object.keys(obj).some(k=>k!=="newPassword")||typeof obj.newPassword!=="string"||
 obj.newPassword.length<12||obj.newPassword.length>128)return fail(400,"A nova senha deve ter de 12 a 128 caracteres.");
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:member,error:memberError}=await admin.from("team_members").select("user_id").eq("user_id",identity.user.id).maybeSingle();
 if(memberError)return fail(503,"Equipe indisponível.");
 if(!member)return fail(403,"Cadastro de equipe não encontrado.");
 const {error:updateError}=await admin.auth.admin.updateUserById(identity.user.id,{
  password:obj.newPassword,app_metadata:{...identity.user.app_metadata,rotevo_password_reset_required:false}
 });
 if(updateError)return fail(503,"Não foi possível alterar a senha.");
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
