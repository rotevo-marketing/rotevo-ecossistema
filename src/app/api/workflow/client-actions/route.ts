import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {parseClientActionCreate,parseClientActionList} from "@/lib/workflow/clientActionsContract";

export const runtime="nodejs";
const reply=(status:number,error:string)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
function bearer(req:NextRequest):string|null{
 const auth=req.headers.get("authorization");
 return auth?.startsWith("Bearer ")&&auth.slice(7).trim()?auth.slice(7).trim():null;
}
/** Server and SQL gates MUST both be active. No service role keys here. */
async function authorized(req:NextRequest,expectedUserId:string){
 const token=bearer(req);
 if(!token)return {error:reply(401,"Autenticação necessária.")} as const;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return {error:reply(503,"Serviço indisponível.")} as const;
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+token}}});
 const {data,error}=await client.auth.getUser(token);
 if(error||!data.user)return {error:reply(401,"Sessão expirada.")} as const;
 if(data.user.app_metadata?.rotevo_password_reset_required===true)return {error:reply(403,"Atualize sua senha inicial.")} as const;
 if(data.user.id!==expectedUserId)return {error:reply(409,"A sessão mudou. Reabra o painel.")} as const;
 return {client} as const;
}
function rpcError(code?:string){
 if(code==="42501")return reply(403,"Acesso não autorizado.");
 if(code==="40001"||code==="23505")return reply(409,"O recurso foi alterado. Atualize a página.");
 if(code==="22023"||code==="23514")return reply(400,"Dados da atribuição inválidos.");
 return reply(503,"Não foi possível processar a atribuição.");
}
/** Read is scoped to the current client via SQL. Visibility is not assignment. */
export async function GET(req:NextRequest){
 if(process.env.ROTEVO_CLIENT_ACTIONS_ENABLED!=="true")return reply(503,"Atribuições de clientes em homologação.");
 const raw={projectId:req.nextUrl.searchParams.get("projectId"),expectedAuthorUserId:req.nextUrl.searchParams.get("expectedAuthorUserId")};
 const params=parseClientActionList(raw);
 if(!params)return reply(400,"Parâmetros inválidos.");
 const access=await authorized(req,params.expectedAuthorUserId);
 if("error" in access)return access.error;
 const {data,error}=await access.client.rpc("rotevo_client_action_list",{p_project_id:params.projectId});
 if(error)return rpcError(error.code);
 return NextResponse.json({assignments:data??[]},{headers:{"Cache-Control":"no-store"}});
}
/** Creating assignments is G2/team-only; the RPC checks tenant/user/resource. */
export async function POST(req:NextRequest){
 if(process.env.ROTEVO_CLIENT_ACTIONS_ENABLED!=="true")return reply(503,"Atribuições de clientes em homologação.");
 let body:unknown;
 try{body=await req.json();}catch{return reply(400,"Dados inválidos.");}
 const params=parseClientActionCreate(body);
 if(!params)return reply(400,"Dados inválidos.");
 const access=await authorized(req,params.expectedAuthorUserId);
 if("error" in access)return access.error;
 const {data,error}=await access.client.rpc("rotevo_client_action_create",{
  p_project_id:params.projectId,p_resource_type:params.resourceType,
  p_resource_id:params.resourceId,p_resource_version:params.resourceVersion,
  p_client_user_id:params.clientUserId,p_action_type:params.actionType,
  p_instructions:params.instructions,p_due_date:params.dueDate,
  p_request_key:params.requestKey
 });
 if(error)return rpcError(error.code);
 return NextResponse.json({assignment:data},{status:200,headers:{"Cache-Control":"no-store"}});
}
