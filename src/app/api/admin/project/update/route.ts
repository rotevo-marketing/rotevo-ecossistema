import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const fail=(status:number)=>NextResponse.json({error:"Não foi possível atualizar o projeto autorizado."},{status,headers:{"Cache-Control":"no-store"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Dedicated strategist-only write path, with compare-and-swap protection.
export async function PATCH(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail(503);
 const header=req.headers.get("authorization");
 if(!header?.startsWith("Bearer ")||!header.slice(7).trim())return fail(401);
 let body:unknown;
 try{body=await req.json();}catch{return fail(400);}
 if(!body||typeof body!=="object"||Array.isArray(body))return fail(400);
 const b=body as Record<string,unknown>;
 if(typeof b.projectId!=="string"||!uuid.test(b.projectId)||
    typeof b.expectedUpdatedAt!=="string"||!Number.isFinite(Date.parse(b.expectedUpdatedAt))||
    !b.data||typeof b.data!=="object"||Array.isArray(b.data))return fail(400);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await auth.auth.getUser(header.slice(7));
 if(identityError||!identity.user)return fail(401);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles")
   .select("role").eq("id",identity.user.id).maybeSingle();
 if(profileError)return fail(503);
 if(profile?.role!=="strategist")return fail(403);
 const nextAt=new Date().toISOString();
 const {data:updated,error:updateError}=await admin.from("planning_projects")
   .update({data:b.data,updated_at:nextAt}).eq("id",b.projectId)
   .eq("updated_at",b.expectedUpdatedAt)
   .select("id,updated_at,data").maybeSingle();
 if(updateError)return fail(503);
 if(!updated)return fail(409);
 return NextResponse.json({project:updated},{headers:{"Cache-Control":"no-store"}});
}
