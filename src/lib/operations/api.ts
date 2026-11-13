"use client";
import {supabase} from "@/lib/supabase";
export async function request<T=unknown>(path:string,method="GET",body?:unknown):Promise<T>{const session=await supabase.auth.getSession();if(session.error||!session.data.session?.access_token)throw Error("Sessão expirada. Entre novamente.");const r=await fetch(path,{method,headers:{Authorization:"Bearer "+session.data.session.access_token,"Content-Type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:"no-store"});const data=await r.json().catch(()=>null);if(!r.ok)throw Error(typeof data?.error==="string"?data.error:requestFailureMessage(r.status));return data as T;}

export function requestFailureMessage(status:number):string {
 const messages:Record<number,string>={
  400:"A solicitação contém dados inválidos. Seu rascunho continua nesta página.",
  401:"Sessão expirada. Entre novamente antes de salvar.",
  403:"Seu acesso não permite salvar este documento.",
  409:"O projeto mudou em outra sessão. Preserve seu rascunho antes de recarregar.",
  413:"O documento excede o tamanho permitido para envio. Divida o conteúdo em documentos menores.",
  429:"Muitas solicitações. Aguarde um momento antes de salvar novamente.",
 };
 return messages[status]??`O servidor não conseguiu concluir o salvamento (HTTP ${status}). Seu rascunho continua nesta página. Tente novamente; se persistir, informe este código ao suporte.`;
}
