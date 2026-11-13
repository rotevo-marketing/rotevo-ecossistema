import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {isUuid} from "@/lib/collaboration/guards";
import {validateEditorialDecision} from "@/lib/workflow/editorial-contract";

export const runtime="nodejs";
const noStore={"Cache-Control":"no-store"} as const;
const response=(body:unknown,status:number)=>NextResponse.json(body,{status,headers:noStore});

/**
 * Experimental Gate B route: fails closed in every environment until SQL RPC
 * is applied and explicitly enabled AFTER isolated E2E approval.
 * Authorization, tenant, workspace, item visibility, status and version are
 * checked inside ONE SQL transaction. No service_role is used in this route.
 */
export async function POST(req:NextRequest){
 if(process.env.ROTEVO_WORKFLOW_APPROVALS_ENABLED!=="true"){
  return response({error:"Fluxo de aprovações em homologação."},503);
 }
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return response({error:"Serviço indisponível."},503);
 const header=req.headers.get("authorization");
 if(!header?.startsWith("Bearer ")||!header.slice(7).trim())
  return response({error:"Autenticação necessária."},401);

 let raw:unknown;
 try{raw=await req.json();}catch{return response({error:"Dados inválidos."},400);}
 const params=validateEditorialDecision(raw);
 if(!params||!isUuid(params.projectId))return response({error:"Dados inválidos."},400);

 const accessToken=header.slice(7).trim();
 const client=createClient(url,anon,{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{Authorization:"Bearer "+accessToken}}
 });
 const {data:actor,error:authError}=await client.auth.getUser(accessToken);
 if(authError||!actor.user)return response({error:"Sessão expirada."},401);
 if(actor.user.app_metadata?.rotevo_password_reset_required===true)
  return response({error:"Troque sua senha inicial antes de aprovar."},403);
 if(params.expectedAuthorUserId&&params.expectedAuthorUserId!==actor.user.id)
  return response({error:"A sessão mudou. Reabra o portal."},409);

 const {data,error}=await client.rpc("rotevo_editorial_workflow_decide",{
  p_project_id:params.projectId,
  p_content_id:params.contentId,
  p_content_version:params.contentVersion,
  p_phase:params.phase,
  p_decision:params.decision,
  p_adjustment_body:params.decision==="changes_requested"?params.adjustmentBody:null
 });
 if(error){
  if(error.code==="42501")return response({error:"Acesso não autorizado."},403);
  if(error.code==="40001"||error.code==="23505")return response({error:"Esta versão já mudou. Atualize o conteúdo."},409);
  if(error.code==="22023")return response({error:"Dados de aprovação inválidos."},400);
  return response({error:"Não foi possível registrar a decisão."},503);
 }
 return response({result:data},200);
}
