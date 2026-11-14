import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {parseClientActionSubmit} from "@/lib/workflow/clientActionsContract";
export const runtime="nodejs";
const reply=(status:number,error:string)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
/** Fail closed until signed-off RPC, identity, revocation and client E2E tests. */
export async function POST(req:NextRequest){
 if(process.env.ROTEVO_CLIENT_ACTIONS_ENABLED!=="true")return reply(503,"Entregas de clientes em homologação.");
 const authorization=req.headers.get("authorization");
 const token=authorization?.startsWith("Bearer ")?authorization.slice(7).trim():"";
 if(!token)return reply(401,"Autenticação necessária.");
 let raw:unknown;try{raw=await req.json();}catch{return reply(400,"Dados inválidos.");}
 const args=parseClientActionSubmit(raw);
 if(!args)return reply(400,"Dados inválidos.");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return reply(503,"Serviço indisponível.");
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+token}}});
 const {data:identity,error:authError}=await client.auth.getUser(token);
 if(authError||!identity.user)return reply(401,"Sessão expirada.");
 if(identity.user.app_metadata?.rotevo_password_reset_required===true)return reply(403,"Atualize sua senha inicial.");
 if(identity.user.id!==args.expectedAuthorUserId)return reply(409,"A sessão mudou. Reabra o painel.");
 const {data,error}=await client.rpc("rotevo_client_action_submit",{
  p_assignment_id:args.assignmentId,p_note:args.note,p_request_key:args.requestKey,p_drive_url:args.driveUrl
 });
 if(error){
  if(error.code==="42501")return reply(403,"Entrega não autorizada.");
  if(error.code==="40001"||error.code==="23505")return reply(409,"A entrega mudou. Atualize a página.");
  if(error.code==="22023")return reply(400,"Dados da entrega inválidos.");
  return reply(503,"Não foi possível registrar a entrega.");
 }
 return NextResponse.json({submission:data},{headers:{"Cache-Control":"no-store"}});
}
