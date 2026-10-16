import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {projectForPresentation,type PresentationProjectRow} from "@/lib/security/projectForPresentation";
export const runtime="nodejs";
const fail=(status:number)=>NextResponse.json({error:"Não foi possível acessar a apresentação autorizada."},{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail(503);
 const header=req.headers.get("authorization");
 if(!header?.startsWith("Bearer ")||!header.slice(7).trim())return fail(401);
 const slug=req.nextUrl.searchParams.get("slug");
 if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>180)return fail(400);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await auth.auth.getUser(header.slice(7));
 if(identityError||!identity.user)return fail(401);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles")
 .select("role,client_id").eq("id",identity.user.id).maybeSingle();
 if(profileError)return fail(503);
 if(!profile||!["client","strategist"].includes(profile.role))return fail(403);
 const {data:project,error:projectError}=await admin.from("planning_projects")
 .select("id,client_id,title,slug,description,status,data,clients(id,name,slug)")
 .eq("slug",slug).maybeSingle();
 if(projectError)return fail(503);
 if(!project)return fail(404);
 if(profile.role==="client"&&(!profile.client_id||profile.client_id!==project.client_id))return fail(404);
 return NextResponse.json({project:projectForPresentation(project as PresentationProjectRow,profile.role==="strategist")},{headers:{"Cache-Control":"no-store"}});
}
