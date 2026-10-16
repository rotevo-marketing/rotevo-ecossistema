import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const fail = (status:number) => NextResponse.json(
  {error:"Não foi possível acessar o projeto autorizado."},
  {status,headers:{"Cache-Control":"no-store"}}
);

// Read-only administrative route. Writes remain on existing flows until
// version checks and concurrency behavior can be tested independently.
export async function GET(req:NextRequest) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !anon || !secret) return fail(503);
  const header=req.headers.get("authorization");
  if(!header?.startsWith("Bearer ") || !header.slice(7).trim()) return fail(401);
  const projectId=req.nextUrl.searchParams.get("id");
  if(!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) return fail(400);

  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:identityError}=await auth.auth.getUser(header.slice(7));
  if(identityError || !identity.user) return fail(401);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:profile,error:profileError}=await admin.from("profiles")
    .select("role").eq("id",identity.user.id).maybeSingle();
  if(profileError) return fail(503);
  if(profile?.role!=="strategist") return fail(403);
  if(process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED==="true"){
    const {data:member,error:memberError}=await admin.from("team_members").select("role,active").eq("user_id",identity.user.id).maybeSingle();
    if(memberError)return fail(503);
    if(!member||member.active!==true)return fail(403);
    if(member.role!=="admin"){
      const {data:assignment,error:assignmentError}=await admin.from("team_project_assignments").select("project_id").eq("user_id",identity.user.id).eq("project_id",projectId).maybeSingle();
      if(assignmentError)return fail(503);
      if(!assignment)return fail(403);
      const {data:permission,error:permissionError}=await admin.from("team_member_permissions").select("permission").eq("user_id",identity.user.id).eq("permission","projects.read").maybeSingle();
      if(permissionError)return fail(503);
      if(!permission)return fail(403);
    }
  }
  const {data:project,error:projectError}=await admin.from("planning_projects")
    .select("id,client_id,title,slug,description,status,updated_at,data")
    .eq("id",projectId).maybeSingle();
  if(projectError) return fail(503);
  if(!project) return fail(404);
  return NextResponse.json({project},{headers:{"Cache-Control":"no-store"}});
}
