import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {parseClientActionList} from "@/lib/workflow/clientActionsContract";

export const runtime="nodejs";
const reply=(status:number,error:string)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
/** Only the G2-verified team may read pending reviews. Never return client-wide raw data. */
export async function GET(req:NextRequest){
 if(process.env.ROTEVO_CLIENT_ACTIONS_ENABLED!=="true")
  return reply(503,"Revisão de entregas em homologação.");
 const args=parseClientActionList({
  projectId:req.nextUrl.searchParams.get("projectId"),
  expectedAuthorUserId:req.nextUrl.searchParams.get("expectedAuthorUserId")
 });
 if(!args)return reply(400,"Parâmetros inválidos.");
 const authorization=req.headers.get("authorization");
 const token=authorization?.startsWith("Bearer ")?authorization.slice(7).trim():"";
 if(!token)return reply(401,"Autenticação necessária.");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return reply(503,"Serviço indisponível.");
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{Authorization:"Bearer "+token}}});
 const {data:identity,error:authError}=await client.auth.getUser(token);
 if(authError||!identity.user)return reply(401,"Sessão expirada.");
 if(identity.user.app_metadata?.rotevo_password_reset_required===true)return reply(403,"Atualize sua senha inicial.");
 if(identity.user.id!==args.expectedAuthorUserId)return reply(409,"A sessão mudou. Reabra o painel.");
 const {data,error}=await client.rpc("rotevo_client_action_review_queue",{p_project_id:args.projectId});
 if(error){
  if(error.code==="42501")return reply(403,"Acesso à revisão não autorizado.");
  if(error.code==="40001")return reply(409,"O projeto foi alterado. Atualize a página.");
  return reply(503,"Não foi possível consultar a revisão.");
 }
 return NextResponse.json({reviews:data??[]},{headers:{"Cache-Control":"no-store"}});
}
