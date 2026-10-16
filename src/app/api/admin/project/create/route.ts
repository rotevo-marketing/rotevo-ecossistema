import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const fail=(status:number)=>NextResponse.json({error:"Não foi possível criar o planejamento autorizado."},{status,headers:{"Cache-Control":"no-store"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest){
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
 let body:unknown;
 try{body=await req.json();}catch{return fail(400);}
 if(!body||typeof body!=="object"||Array.isArray(body))return fail(400);
 const b=body as Record<string,unknown>;
 if(typeof b.client_id!=="string"||!uuid.test(b.client_id)||typeof b.title!=="string"||!b.title.trim()||b.title.length>180||
 typeof b.slug!=="string"||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug)||b.slug.length>180||
 (b.description!==null&&b.description!==undefined&&(typeof b.description!=="string"||b.description.length>2000))||
 b.status!=="draft"||!b.data||typeof b.data!=="object"||Array.isArray(b.data)||
 Object.keys(b).some(key=>!["client_id","title","slug","description","status","data"].includes(key)))return fail(400);
 const {data:client,error:clientError}=await admin.from("clients").select("id").eq("id",b.client_id).maybeSingle();
 if(clientError)return fail(503);
 if(!client)return fail(404);
 const {data:project,error:createError}=await admin.from("planning_projects").insert({
  client_id:b.client_id,title:b.title.trim(),slug:b.slug,description:b.description??null,status:"draft",data:b.data
 }).select("id").single();
 if(createError)return fail(createError.code==="23505"?409:503);
 return NextResponse.json({project},{status:201,headers:{"Cache-Control":"no-store"}});
}
