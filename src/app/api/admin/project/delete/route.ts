import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const fail=(status:number)=>NextResponse.json({error:"Não foi possível excluir o planejamento autorizado."},{status,headers:{"Cache-Control":"no-store"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// This endpoint requires explicit project deletion confirmation in the calling UI.
export async function DELETE(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail(503);
 const header=req.headers.get("authorization");
 if(!header?.startsWith("Bearer ")||!header.slice(7).trim())return fail(401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await auth.auth.getUser(header.slice(7));
 if(identityError||!identity.user)return fail(401);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",identity.user.id).maybeSingle();
 if(profileError)return fail(503);
 if(profile?.role!=="strategist")return fail(403);
 let raw:unknown;try{raw=await req.json();}catch{return fail(400);}
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return fail(400);
 const b=raw as Record<string,unknown>;
 if(Object.keys(b).some(k=>!["projectId","expectedUpdatedAt","confirmed"].includes(k))||
 b.confirmed!==true||typeof b.projectId!=="string"||!uuid.test(b.projectId)||
 typeof b.expectedUpdatedAt!=="string"||!Number.isFinite(Date.parse(b.expectedUpdatedAt)))return fail(400);
 const {data:deleted,error:deleteError}=await admin.from("planning_projects").delete()
 .eq("id",b.projectId).eq("updated_at",b.expectedUpdatedAt).select("id").maybeSingle();
 if(deleteError)return fail(503);
 if(!deleted)return fail(409);
 return NextResponse.json({deletedId:deleted.id},{headers:{"Cache-Control":"no-store"}});
}
