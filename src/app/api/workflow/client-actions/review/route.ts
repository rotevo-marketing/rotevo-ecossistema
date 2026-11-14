import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {parseClientActionReview} from "@/lib/workflow/clientActionsContract";

export const runtime="nodejs";
const reply=(status:number,error:string)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
/**
 * Team-only review. Disabled until RPC/tenant/G2 are E2E accepted.
 * Review changes assignment state, NEVER editorial publication or approval.
 */
export async function POST(req:NextRequest){
 if(process.env.ROTEVO_CLIENT_ACTIONS_ENABLED!=="true")
  return reply(503,"Validação de entregas em homologação.");
 const authorization=req.headers.get("authorization");
 const token=authorization?.startsWith("Bearer ")?authorization.slice(7).trim():"";
 if(!token)return reply(401,"Autenticação necessária.");
 let raw:unknown;
 try{raw=await req.json();}catch{return reply(400,"Dados inválidos.");}
 const args=parseClientActionReview(raw);
 if(!args)return reply(400,"Dados inválidos.");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return reply(503,"Serviço indisponível.");
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{Authorization:"Bearer "+token}}});
 const {data:identity,error:authError}=await client.auth.getUser(token);
 if(authError||!identity.user)return reply(401,"Sessão expirada.");
 if(identity.user.app_metadata?.rotevo_password_reset_required===true)
  return reply(403,"Atualize sua senha inicial.");
 if(identity.user.id!==args.expectedAuthorUserId)return reply(409,"A sessão mudou. Reabra o painel.");
 const {data,error}=await client.rpc("rotevo_client_action_review",{
  p_assignment_id:args.assignmentId,p_submission_id:args.submissionId,
  p_decision:args.decision,p_feedback:args.feedback
 });
 if(error){
  if(error.code==="42501")return reply(403,"Revisão não autorizada.");
  if(error.code==="40001"||error.code==="23505")
   return reply(409,"A entrega ou a versão mudou. Atualize a página.");
  if(error.code==="22023")return reply(400,"Dados da revisão inválidos.");
  return reply(503,"Não foi possível validar a entrega.");
 }
 return NextResponse.json({review:data},{headers:{"Cache-Control":"no-store"}});
}
