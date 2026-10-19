import {supabase} from "@/lib/supabase";
export async function financeRequest(clientView:boolean,body?:Record<string,unknown>) {
 const {data,error}=await supabase.auth.getSession();
 if(error||!data.session)throw new Error("Sua sessão expirou. Entre novamente.");
 const response=await fetch(clientView?"/api/client/finance":"/api/admin/finance",{
  method:body?"POST":"GET",cache:"no-store",headers:{Authorization:`Bearer ${data.session.access_token}`,"Content-Type":"application/json"},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const result=await response.json();
 if(!response.ok)throw new Error(result.error??"Não foi possível consultar o Financeiro.");
 return result;
}
