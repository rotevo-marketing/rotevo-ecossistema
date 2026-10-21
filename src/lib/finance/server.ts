import {financeEnvironmentAllowed} from "./environment.ts";
import {createClient} from "@supabase/supabase-js";
import {NextResponse} from "next/server";
export const financeResponse=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store, private","Vary":"Authorization"}});
export async function financeIdentity(request:Request) {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const allowedEnvironment=financeEnvironmentAllowed(url,process.env.VERCEL_ENV,process.env.ROTEVO_FINANCE_ENABLED,process.env.ROTEVO_FINANCE_PRODUCTION_APPROVED);
 if(!url||!allowedEnvironment || process.env.ROTEVO_FINANCE_ENABLED!=="true"||!key)return {error:financeResponse({error:"O Financeiro ainda não foi ativado neste ambiente."},503)};
 const match=/^Bearer (\S+)$/.exec(request.headers.get("authorization")??"");
 if(!match)return {error:financeResponse({error:"Entre na sua conta para continuar."},401)};
 // Use the caller's JWT. No service key and no client ID supplied by the browser.
 const db=createClient(url,key,{global:{headers:{Authorization:`Bearer ${match[1]}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.auth.getUser(match[1]);
 if(error||!data.user)return {error:financeResponse({error:"Sessão inválida."},401)};
 if(data.user.app_metadata?.rotevo_password_reset_required===true)return {error:financeResponse({error:"Conclua a troca inicial de senha."},403)};
 return {db};
}
export function financeError(code?:string,message?:string) {
 if(code==="42501")return financeResponse({error:"Você não tem permissão para esta operação."},403);
 if(code==="40001")return financeResponse({error:"Este registro foi alterado. Atualize a consulta antes de continuar."},409);
 if(code==="22023"||code==="23502"||code==="23514"||code==="23503"||code==="23505"||code==="22P02"||code==="22007"||code==="22008")return financeResponse({error:message?.startsWith("FIN:")?message.slice(4):"Confira os valores e os vínculos informados."},400);
 return financeResponse({error:"Não foi possível concluir a operação. Nenhuma confirmação foi recebida; atualize a consulta antes de tentar novamente."},503);
}
