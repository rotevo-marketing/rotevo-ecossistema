import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status:number)=>NextResponse.json({error:"Não foi possível transferir a administração."},{status,headers:{"Cache-Control":"no-store"}});
/** Disabled until RLS, audit schema and administrator-succession workflow are homologated. */
export async function POST(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail(503);
 const token=req.headers.get("authorization");
 if(!token?.startsWith("Bearer ")||!token.slice(7).trim())return fail(401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await auth.auth.getUser(token.slice(7));
 if(identityError||!identity.user)return fail(401);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",identity.user.id).maybeSingle();
 if(profileError)return fail(503);
 if(profile?.role!=="strategist")return fail(403);
 const {data:caller,error:callerError}=await admin.from("team_members").select("role,active").eq("user_id",identity.user.id).maybeSingle();
 if(callerError)return fail(503);
 if(caller?.role!=="admin"||caller.active!==true)return fail(403);
 if(process.env.ROTEVO_TEAM_ADMIN_TRANSFER_ENABLED!=="true")return fail(503);
 let body:unknown;
 try{body=await req.json()}catch{return fail(400);}
 if(!body||typeof body!=="object"||Array.isArray(body))return fail(400);
 const input=body as Record<string,unknown>;
 if(Object.keys(input).some(k=>!["targetUserId","confirmation"].includes(k)))return fail(400);
 const {targetUserId,confirmation}=input;
 if(typeof targetUserId!=="string"||!uuid.test(targetUserId)||targetUserId===identity.user.id||confirmation!=="TRANSFERIR_ADMIN")return fail(400);
 const {error:transferError}=await admin.rpc("rotevo_transfer_team_admin",{p_actor:identity.user.id,p_target:targetUserId});
 if(transferError)return fail(409);
 return NextResponse.json({ok:true,requiresRelogin:true},{headers:{"Cache-Control":"no-store"}});
}
