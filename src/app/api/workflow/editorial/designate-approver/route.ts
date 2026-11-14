import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const reply=(status:number,error:string)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
/** G2 admin designation is authoritative only after its SQL proposal is homologated. */
export async function POST(req:NextRequest){
 if(process.env.ROTEVO_DESIGNATED_APPROVAL_ENABLED!=="true")
  return reply(503,"Designação de aprovadores em homologação.");
 const authorization=req.headers.get("authorization");
 const token=authorization?.startsWith("Bearer ")?authorization.slice(7).trim():"";
 if(!token)return reply(401,"Autenticação necessária.");
 let raw:unknown;try{raw=await req.json();}catch{return reply(400,"Dados inválidos.");}
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return reply(400,"Dados inválidos.");
 const data=raw as Record<string,unknown>;
 if(Object.keys(data).some(k=>!["projectId","phase","approverUserId","reason","expectedAuthorUserId"].includes(k)))
  return reply(400,"Dados inválidos.");
 if(typeof data.projectId!=="string"||!uuid.test(data.projectId)
 ||typeof data.approverUserId!=="string"||!uuid.test(data.approverUserId)
 ||typeof data.expectedAuthorUserId!=="string"||!uuid.test(data.expectedAuthorUserId)
 ||(data.phase!=="idea"&&data.phase!=="final")
 ||typeof data.reason!=="string"||data.reason.trim().length<3||data.reason.length>500)
  return reply(400,"Dados inválidos.");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return reply(503,"Serviço indisponível.");
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{Authorization:"Bearer "+token}}});
 const {data:identity,error:authError}=await db.auth.getUser(token);
 if(authError||!identity.user)return reply(401,"Sessão expirada.");
 if(identity.user.app_metadata?.rotevo_password_reset_required===true)return reply(403,"Atualize sua senha inicial.");
 if(identity.user.id!==data.expectedAuthorUserId)return reply(409,"A sessão mudou. Reabra o painel.");
 const {data:designation,error}=await db.rpc("rotevo_editorial_designate_approver",{
  p_project_id:data.projectId,p_phase:data.phase,p_approver_user_id:data.approverUserId,
  p_reason:data.reason.trim()
 });
 if(error){
  if(error.code==="42501")return reply(403,"Não autorizado a designar este aprovador.");
  if(error.code==="22023")return reply(400,"Dados inválidos.");
  if(error.code==="40001"||error.code==="23505")return reply(409,"A designação foi alterada.");
  return reply(503,"Não foi possível designar o aprovador.");
 }
 return NextResponse.json({designation},{headers:{"Cache-Control":"no-store"}});
}
