import {administrator,failure,identity,response,uuid} from "@/lib/operations/server";
export const runtime="nodejs";
export async function GET(request:Request){const a=await identity(request);if(a.error)return a.error;if(!administrator(a.identity))return failure(403);const id=new URL(request.url).searchParams.get("clientId");if(!uuid(id))return failure(400);const r=await a.identity.db.from("profiles").select("id,full_name,email").eq("role","client").eq("client_id",id);return r.error?failure(503):response({users:r.data});}
