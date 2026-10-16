import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const fail=(status:number)=>NextResponse.json({error:"Acesso indisponível."},{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail(503);
 const token=req.headers.get("authorization");
 if(!token?.startsWith("Bearer "))return fail(401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await auth.auth.getUser(token.slice(7));
 if(authError||!identity.user)return fail(401);
 if(identity.user.app_metadata?.rotevo_password_reset_required===true)return fail(403);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",identity.user.id).maybeSingle();
 if(profileError||profile?.role!=="staff")return fail(403);
 const {data:member,error:memberError}=await admin.from("team_members").select("role,active,display_name").eq("user_id",identity.user.id).maybeSingle();
 if(memberError)return fail(503);
 if(!member?.active)return fail(403);
 const {data:assignments,error:assignmentError}=await admin.from("team_project_assignments").select("project_id").eq("user_id",identity.user.id);
 if(assignmentError)return fail(503);
 const {data:permissions,error:permissionError}=await admin.from("team_member_permissions").select("permission").eq("user_id",identity.user.id);
 if(permissionError)return fail(503);
 const permitted=(permissions??[]).map(p=>p.permission as string);
 const ids=(assignments??[]).map(p=>p.project_id as string);
 // Never send project content, client details or project names via this endpoint.
 return NextResponse.json({displayName:member.display_name,role:member.role,permissions:permitted,assignedProjectCount:ids.length},{headers:{"Cache-Control":"no-store"}});
}
