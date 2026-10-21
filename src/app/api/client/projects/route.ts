import {emptyWorkspace,workspaceForClient} from "@/lib/operations/model";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { projectForClient, type PrivateProjectRow } from "@/lib/security/projectForClient";

export const runtime = "nodejs";
const fail = (status:number) => NextResponse.json({error:"Não foi possível carregar os projetos autorizados."},
  {status,headers:{"Cache-Control":"no-store"}});

export async function GET(req:NextRequest) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) return fail(503);
  const header=req.headers.get("authorization");
  if (!header?.startsWith("Bearer ") || !header.slice(7).trim()) return fail(401);
  const authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:identityError}=await authClient.auth.getUser(header.slice(7));
  if (identityError || !identity.user) return fail(401);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:profile,error:profileError}=await admin.from("profiles")
    .select("role,client_id").eq("id",identity.user.id).maybeSingle();
  if (profileError) return fail(503);
  if (!profile || profile.role!=="client" || !profile.client_id) return fail(403);
  const {data:projects,error:projectError}=await admin.from("planning_projects")
    .select("id,client_id,title,slug,description,status,updated_at,data")
    .eq("client_id",profile.client_id).order("updated_at",{ascending:false});
  if (projectError) return fail(503);
  const workspace=await admin.from("client_workspaces").select("data").eq("client_id",profile.client_id).maybeSingle();
  if(workspace.error)return fail(503);
  const modules=workspaceForClient(workspace.data?.data??emptyWorkspace()).modules;
  return NextResponse.json({projects:((projects??[]) as PrivateProjectRow[]).map(p=>projectForClient(p,modules))},
    {headers:{"Cache-Control":"no-store"}});
}
