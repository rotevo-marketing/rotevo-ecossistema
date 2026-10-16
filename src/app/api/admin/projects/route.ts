import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const runtime="nodejs";
const fail=(status:number)=>NextResponse.json({error:"Não foi possível consultar os projetos autorizados."},{status,headers:{"Cache-Control":"no-store"}});

// Server-side administrative list, never exposed to customer accounts.
export async function GET(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail(503);
 const header=req.headers.get("authorization");
 if(!header?.startsWith("Bearer ")||!header.slice(7).trim())return fail(401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await auth.auth.getUser(header.slice(7));
 if(identityError||!identity.user)return fail(401);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles")
   .select("role").eq("id",identity.user.id).maybeSingle();
 if(profileError)return fail(503);
 if(profile?.role!=="strategist")return fail(403);
 const {data:projects,error:projectsError}=await admin.from("planning_projects")
   .select("id,title,slug,description,status,created_at,updated_at,data,clients(id,name,slug)")
   .order("updated_at",{ascending:false});
 if(projectsError)return fail(503);
 return NextResponse.json({projects:projects??[]},{headers:{"Cache-Control":"no-store"}});
}
