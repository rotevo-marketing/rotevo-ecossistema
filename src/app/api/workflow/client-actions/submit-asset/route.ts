import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {parseClientActionSubmitAsset} from "@/lib/workflow/clientActionsContract";

export const runtime="nodejs";
const response=(status:number,error:string)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
/** Storage paths are immutable, uploaded through client JWT/RLS before this RPC links evidence. */
export async function POST(req:NextRequest){
 if(process.env.ROTEVO_CLIENT_ACTIONS_ENABLED!=="true"||process.env.ROTEVO_PRIVATE_DELIVERIES_ENABLED!=="true")
  return response(503,"Entrega com anexos em homologação.");
 const auth=req.headers.get("authorization");
 const token=auth?.startsWith("Bearer ")?auth.slice(7).trim():"";
 if(!token)return response(401,"Autenticação necessária.");
 let raw:unknown;
 try{raw=await req.json();}catch{return response(400,"Dados inválidos.");}
 const args=parseClientActionSubmitAsset(raw);
 if(!args)return response(400,"Caminho privado ou dados inválidos.");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return response(503,"Serviço indisponível.");
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{Authorization:"Bearer "+token}}});
 const {data,error:authError}=await client.auth.getUser(token);
 if(authError||!data.user)return response(401,"Sessão expirada.");
 if(data.user.app_metadata?.rotevo_password_reset_required===true)return response(403,"Atualize sua senha inicial.");
 if(data.user.id!==args.expectedAuthorUserId)return response(409,"A sessão mudou. Reabra o painel.");
 const {data:submission,error}=await client.rpc("rotevo_client_action_submit_asset",{
  p_assignment_id:args.assignmentId,p_note:args.note,p_request_key:args.requestKey,
  p_private_storage_path:args.privateStoragePath
 });
 if(error){
  if(error.code==="42501")return response(403,"Entrega não autorizada.");
  if(error.code==="40001"||error.code==="23505")return response(409,"A versão ou o arquivo mudou.");
  if(error.code==="22023")return response(400,"Arquivo inválido.");
  return response(503,"Não foi possível associar a entrega.");
 }
 return NextResponse.json({submission},{headers:{"Cache-Control":"no-store"}});
}
