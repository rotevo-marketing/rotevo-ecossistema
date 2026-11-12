import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {isUuid} from "@/lib/collaboration/guards";
import {validateEditorialSubmission} from "@/lib/workflow/editorial-contract";

export const runtime="nodejs";
const respond=(body:unknown,status:number)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

/** Next-generation request remains closed until separate migration and E2E approval. */
export async function POST(req:NextRequest){
 if(process.env.ROTEVO_WORKFLOW_APPROVALS_ENABLED!=="true")
  return respond({error:"Envio para aprovação em homologação."},503);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return respond({error:"Serviço indisponível."},503);
 const header=req.headers.get("authorization");
 if(!header?.startsWith("Bearer ")||!header.slice(7).trim())
  return respond({error:"Autenticação necessária."},401);
 let raw:unknown;
 try{raw=await req.json();}catch{return respond({error:"Dados inválidos."},400);}
 const params=validateEditorialSubmission(raw);
 if(!params||!isUuid(params.projectId))return respond({error:"Dados inválidos."},400);
 const token=header.slice(7).trim();
 const client=createClient(url,anon,{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{Authorization:"Bearer "+token}}
 });
 const {data:identity,error:authError}=await client.auth.getUser(token);
 if(authError||!identity.user)return respond({error:"Sessão expirada."},401);
 if(identity.user.app_metadata?.rotevo_password_reset_required===true)
  return respond({error:"Troque sua senha inicial para continuar."},403);
 if(params.expectedAuthorUserId&&params.expectedAuthorUserId!==identity.user.id)
  return respond({error:"A sessão mudou. Reabra o painel."},409);
 const {data,error}=await client.rpc("rotevo_editorial_workflow_request",{
  p_project_id:params.projectId,p_content_id:params.contentId,
  p_content_version:params.contentVersion,p_phase:params.phase
 });
 if(error){
  if(error.code==="42501")return respond({error:"Acesso não autorizado ou aprovador não designado."},403);
  if(error.code==="40001"||error.code==="23505")return respond({error:"Esta versão mudou. Atualize a página."},409);
  if(error.code==="22023")return respond({error:"Dados de aprovação inválidos."},400);
  return respond({error:"Não foi possível enviar para aprovação."},503);
 }
 return respond({result:data},200);
}
