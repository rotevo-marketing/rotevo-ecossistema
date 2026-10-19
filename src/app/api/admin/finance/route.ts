import {financeIdentity,financeResponse,financeError} from "@/lib/finance/server";
export const runtime="nodejs";
export async function GET(request:Request) {
 const identity=await financeIdentity(request);if(identity.error)return identity.error;
 const {data,error}=await identity.db!.rpc("rotevo_finance_snapshot");
 return error?financeError(error.code,error.message):financeResponse(data);
}
export async function POST(request:Request) {
 const identity=await financeIdentity(request);if(identity.error)return identity.error;
 if(Number(request.headers.get("content-length"))>65536)return financeResponse({error:"Solicitação muito grande."},413);
 let body:unknown;try{const raw=await request.text();if(raw.length>65536)return financeResponse({error:"Solicitação muito grande."},413);body=JSON.parse(raw);}catch{return financeResponse({error:"Solicitação inválida."},400);}
 if(!body||typeof body!=="object"||Array.isArray(body))return financeResponse({error:"Solicitação inválida."},400);
 const b=body as Record<string,unknown>;
 if(Object.keys(b).some(k=>!["action","input","requestId"].includes(k))||typeof b.action!=="string"||!b.input||typeof b.input!=="object"||Array.isArray(b.input)||typeof b.requestId!=="string"||!(/^[0-9a-f-]{36}$/i).test(b.requestId))return financeResponse({error:"Solicitação inválida."},400);
 const {data,error}=await identity.db!.rpc("rotevo_finance_mutate",{p_action:b.action,p_input:b.input,p_request_id:b.requestId});
 return error?financeError(error.code,error.message):financeResponse(data);
}
