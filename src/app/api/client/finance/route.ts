import {financeIdentity,financeResponse,financeError} from "@/lib/finance/server";
export const runtime="nodejs";
export async function GET(request:Request) {
 const identity=await financeIdentity(request);if(identity.error)return identity.error;
 const {data,error}=await identity.db!.rpc("rotevo_client_finance");
 return error?financeError(error.code,error.message):financeResponse(data);
}
