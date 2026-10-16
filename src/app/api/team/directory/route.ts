import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const runtime="nodejs";
const fail=(status:number)=>NextResponse.json({error:"Não foi possível consultar a equipe autorizada."},{status,headers:{"Cache-Control":"no-store"}});

/** Read-only team directory: never let browser RLS determine administrative access. */
export async function GET(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail(503);
 const token=req.headers.get("authorization");
 if(!token?.startsWith("Bearer ")||!token.slice(7).trim())return fail(401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await auth.auth.getUser(token.slice(7));
 if(authError||!identity.user)return fail(401);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",identity.user.id).maybeSingle();
 if(profileError)return fail(503);
 if(profile?.role!=="strategist")return fail(403);
 const {data:member,error:memberError}=await admin.from("team_members").select("role,active").eq("user_id",identity.user.id).maybeSingle();
 if(memberError)return fail(503);
 if(member?.role!=="admin"||member.active!==true)return fail(403);
 const {data:members,error:directoryError}=await admin.from("team_members")
  .select("user_id,display_name,job_title,avatar_url,role,active").order("display_name");
 if(directoryError)return fail(503);
 const {data:assignments,error:assignmentsError}=await admin.from("team_project_assignments").select("user_id,project_id");
 if(assignmentsError)return fail(503);
 const {data:permissions,error:permissionsError}=await admin.from("team_member_permissions").select("user_id,permission");
 if(permissionsError)return fail(503);
 return NextResponse.json({assignments:assignments??[],permissions:permissions??[],members:members??[]},{headers:{"Cache-Control":"no-store"}});
}
