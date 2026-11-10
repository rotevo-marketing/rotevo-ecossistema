import {workspaceForClient} from "@/lib/operations/model";
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
  if (identity.user.app_metadata?.rotevo_password_reset_required===true) return fail(403);
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
  const modules=workspaceForClient(workspace.data?.data).modules;
  const source=(projects??[]) as PrivateProjectRow[];
  const visible=source.map(p=>projectForClient(p,modules));
  // Restrict avatar enrichment to team members already assigned to explicitly shared tasks.
  const assignment=new Map<string,string>();
  const editorialAssignment=new Map<string,string>();
  for(const project of source){
   const data=project.data&&typeof project.data==="object"&&!Array.isArray(project.data)?project.data as Record<string,unknown>:{};
   const tasks=Array.isArray(data.executionTimeline)?data.executionTimeline:[];
   for(const raw of tasks){
    if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
    const task=raw as Record<string,unknown>;
    if(task.visibleToClient===true&&!task.archivedAt&&!task.deletedAt&&typeof task.id==="string"&&typeof task.ownerUserId==="string")
     assignment.set(project.id+":"+task.id,task.ownerUserId);
   }
   const sharedIds=new Set(visible.find(p=>p.id===project.id)?.data.editorialCalendar?.map(x=>x.id)??[]);
   const editorial=Array.isArray(data.editorialCalendar)?data.editorialCalendar:[];
   for(const raw of editorial){
    if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
    const content=raw as Record<string,unknown>;
    if(typeof content.id==="string"&&sharedIds.has(content.id)&&typeof content.ownerUserId==="string"&&content.ownerUserId)
     editorialAssignment.set(project.id+":"+content.id,content.ownerUserId);
   }
  }
  const memberIds=[...new Set([...assignment.values(),...editorialAssignment.values()])].filter(Boolean);
  const prefs=memberIds.length?await admin.from("user_preferences").select("user_id,avatar_asset_id").in("user_id",memberIds):{data:[],error:null};
  if(prefs.error)return fail(503);
  const clientInfo=await admin.from("clients").select("cover_image_url").eq("id",profile.client_id).maybeSingle();
  if(clientInfo.error)return fail(503);
  const cover=clientInfo.data?.cover_image_url??"";
  const memberAsset=new Map((prefs.data??[]).filter(x=>x.avatar_asset_id).map(x=>[x.user_id,x.avatar_asset_id as string]));
  const coverAsset=typeof cover==="string"&&cover.startsWith("asset://")?cover.slice(8):"";
  const assetIds=[...new Set([...memberAsset.values(),...(coverAsset?[coverAsset]:[])])];
  let signed=new Map<string,string>();
  if(assetIds.length){
   const assets=await admin.from("project_assets").select("id,storage_path").eq("purpose","avatar").in("id",assetIds);
   if(assets.error)return fail(503);
   const paths=(assets.data??[]).map(x=>x.storage_path);
   const urls=paths.length?await admin.storage.from("rotevo-private").createSignedUrls(paths,3600):{data:[],error:null};
   if(urls.error||urls.data?.some(x=>x.error))return fail(503);
   const byPath=new Map((urls.data??[]).map(x=>[x.path,x.signedUrl]));
   signed=new Map((assets.data??[]).flatMap(x=>{const url=byPath.get(x.storage_path);return url?[[x.id,url] as [string,string]]:[];}));
  }
  const clientAvatarUrl=coverAsset?signed.get(coverAsset)??null:typeof cover==="string"&&cover.startsWith("https://")?cover:null;
  for(let i=0;i<visible.length;i++){
   (visible[i] as typeof visible[number]&{clientAvatarUrl?:string|null}).clientAvatarUrl=clientAvatarUrl;
   for(const task of visible[i].data.executionTimeline){
    const id=assignment.get(source[i].id+":"+task.id);
    const asset=id?memberAsset.get(id):undefined;
    if(asset&&signed.has(asset))task.ownerAvatarUrl=signed.get(asset);
   }
   for(const content of visible[i].data.editorialCalendar??[]){
    const id=editorialAssignment.get(source[i].id+":"+content.id);
    const asset=id?memberAsset.get(id):undefined;
    if(asset&&signed.has(asset))content.ownerAvatarUrl=signed.get(asset);
   }
  }
  return NextResponse.json({projects:visible},{headers:{"Cache-Control":"no-store"}});
}
