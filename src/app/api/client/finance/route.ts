import {identity as operationIdentity} from "@/lib/operations/server";
import {emptyWorkspace,workspaceForClient} from "@/lib/operations/model";
import {financeIdentity,financeResponse,financeError} from "@/lib/finance/server";
export const runtime="nodejs";
export async function GET(request:Request) {
 const identity=await financeIdentity(request);if(identity.error)return identity.error;
 const auth=await operationIdentity(request);if(auth.error)return auth.error;
 const clientId=auth.identity.profile.client_id;if(auth.identity.profile.role!=="client"||!clientId)return financeResponse({error:"Acesso não autorizado."},403);
 const workspace=await auth.identity.db.from("client_workspaces").select("data").eq("client_id",clientId).maybeSingle();
 if(workspace.error)return financeResponse({error:"Não foi possível consultar seus serviços."},503);
 if(!workspaceForClient(workspace.data?.data??emptyWorkspace()).modules.includes("finance"))return financeResponse({error:"O Financeiro não foi disponibilizado para sua conta."},403);
 const {data,error}=await identity.db!.rpc("rotevo_client_finance");
 if(error)return financeError(error.code,error.message);
 const ids=Array.isArray(data?.invoices)?data.invoices.map((i:{id:string})=>i.id):[];
 const documents=ids.length?await auth.identity.db.from("project_assets").select("id,invoice_id,original_name,purpose").eq("client_id",clientId).eq("visible_to_client",true).in("purpose",["invoice","receipt"]).in("invoice_id",ids):{data:[],error:null};
 if(documents.error)return financeResponse({error:"Não foi possível consultar os documentos financeiros."},503);
 const links=ids.length?await auth.identity.db.from("finance_invoice_links").select("invoice_id,payment_url").in("invoice_id",ids):{data:[],error:null};
 if(links.error)return financeResponse({error:"Não foi possível consultar os links financeiros."},503);
 return financeResponse({...data,documents:documents.data,paymentLinks:links.data});
}
