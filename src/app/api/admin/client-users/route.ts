import {administrator,failure,identity,response,uuid} from "@/lib/operations/server";

export const runtime="nodejs";

export async function GET(request:Request){
 const access=await identity(request);
 if(access.error)return access.error;
 if(!administrator(access.identity))return failure(403);
 const params=new URL(request.url).searchParams;
 const clientId=params.get("clientId");
 if(!uuid(clientId))return failure(400);
 const db=access.identity.db;
 const users=await db.from("profiles").select("id,full_name,email").eq("role","client").eq("client_id",clientId);
 if(users.error)return failure(503);
 if(params.get("linkedOnly")!=="true")return response({users:users.data});
 const links=await db.from("client_users").select("user_id").eq("client_id",clientId);
 if(links.error)return failure(503);
 const linked=new Set(links.data.map(link=>link.user_id));
 return response({users:users.data.filter(user=>linked.has(user.id))});
}
