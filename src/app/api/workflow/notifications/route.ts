import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {isUuid} from "@/lib/collaboration/guards";

export const runtime="nodejs";
const respond=(body:unknown,status:number)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function authorized(req:NextRequest){
 if(process.env.ROTEVO_NOTIFICATIONS_ENABLED!=="true")return {status:503 as const};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return {status:503 as const};
 const token=req.headers.get("authorization");
 if(!token?.startsWith("Bearer ")||!token.slice(7).trim())return {status:401 as const};
 const bearer=token.slice(7).trim();
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+bearer}}});
 const {data:identity,error}=await client.auth.getUser(bearer);
 if(error||!identity.user)return {status:401 as const};
 if(identity.user.app_metadata?.rotevo_password_reset_required===true)return {status:403 as const};
 // Pilot is deny-by-default. Only current authenticated accounts on the explicit server-side
 // allowlist can read or acknowledge notifications during the controlled rollout.
 const pilot=(process.env.ROTEVO_NOTIFICATIONS_PILOT_USER_IDS??"").split(",").map(id=>id.trim()).filter(isUuid);
 if(!pilot.length||!pilot.includes(identity.user.id))return {status:403 as const};
 return {client,userId:identity.user.id};
}
export async function GET(req:NextRequest){
 const session=await authorized(req);
 if("status" in session&&typeof session.status==="number")return respond({error:"Notificações indisponíveis ou não autorizadas."},session.status);
 const raw=req.nextUrl.searchParams.get("limit"),only=req.nextUrl.searchParams.get("unread");
 if(raw!==null&&!/^[1-9][0-9]?$/.test(raw))return respond({error:"Limite inválido."},400);
 const limit=raw?Number(raw):30;
 if(limit>50||limit<1||only!==null&&only!=="true"&&only!=="false")return respond({error:"Filtro inválido."},400);
 const {data,error}=await session.client.rpc("rotevo_workflow_list_notifications",{p_limit:limit,p_unread_only:only==="true"});
 if(error)return respond({error:"Não foi possível consultar notificações."},503);
 return respond({notifications:data??[]},200);
}
export async function PATCH(req:NextRequest){
 const session=await authorized(req);
 if("status" in session&&typeof session.status==="number")return respond({error:"Notificações indisponíveis ou não autorizadas."},session.status);
 let raw:unknown;try{raw=await req.json();}catch{return respond({error:"Dados inválidos."},400);}
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return respond({error:"Dados inválidos."},400);
 const id=(raw as Record<string,unknown>).notificationId;
 const author=(raw as Record<string,unknown>).expectedAuthorUserId;
 if(!isUuid(id)||author!==undefined&&(!isUuid(author)||author!==session.userId))return respond({error:"Sessão alterada ou identificador inválido."},409);
 const {data,error}=await session.client.rpc("rotevo_workflow_mark_notification_read",{p_notification_id:id});
 if(error)return respond({error:"Não foi possível atualizar a notificação."},503);
 if(data!==true)return respond({error:"Notificação indisponível."},404);
 return respond({read:true},200);
}
