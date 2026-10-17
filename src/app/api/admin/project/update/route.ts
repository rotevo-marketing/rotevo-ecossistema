import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {validEcosystemDocumentTransition} from "@/lib/security/ecosystemDocumentTransitions";
import {validExecutionDependencies} from "@/lib/security/executionDependencyValidation";

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
 // Rollout gate: old strategist sessions remain compatible until the new policies are approved.
 // When enabled, an inactive staff account or a team member lacking project access fails closed.
 if(process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED==="true"){
  const {data:member,error:memberError}=await admin.from("team_members")
   .select("role,active").eq("user_id",identity.user.id).maybeSingle();
  if(memberError)return fail(503);
  if(!member||member.active!==true)return fail(403);
  if(member.role!=="admin"){
   const {data:assignment,error:assignmentError}=await admin.from("team_project_assignments")
    .select("project_id").eq("user_id",identity.user.id).eq("project_id",b.projectId).maybeSingle();
   if(assignmentError)return fail(503);
   if(!assignment)return fail(403);
   const {data:permission,error:permissionError}=await admin.from("team_member_permissions")
    .select("permission").eq("user_id",identity.user.id).eq("permission","projects.write").maybeSingle();
   if(permissionError)return fail(503);
   if(!permission)return fail(403);
  }
 }
 const {data:existing,error:existingError}=await admin.from("planning_projects")
   .select("data,updated_at").eq("id",b.projectId).maybeSingle();
 if(existingError)return fail(503);
 if(!existing||existing.updated_at!==b.expectedUpdatedAt)return fail(409);
 if(!validEcosystemDocumentTransition(existing.data,b.data)||!validExecutionDependencies(b.data))return fail(400);
 // Only newly assigned or reassigned identities require an active team membership.
 // Historical assignments are preserved without retroactive data migration.
 const oldRoot=existing.data&&typeof existing.data==="object"&&!Array.isArray(existing.data)?existing.data as Record<string,unknown>:{};
 const nextRoot=b.data as Record<string,unknown>;
 // Validate onboarding links on the server as well as in the editor.
 const checklist=nextRoot.onboardingChecklist;
 if(checklist!==undefined){
  if(!Array.isArray(checklist))return fail(400);
  for(const item of checklist){
   if(!item||typeof item!=="object"||Array.isArray(item))return fail(400);
   const entry=item as Record<string,unknown>;
   if(typeof entry.title!=="string"||entry.title.trim().length<3)return fail(400);
   const link=entry.link;
   if(link===undefined||link===null||link==="")continue;
   if(typeof link!=="string")return fail(400);
   try{
    const parsed=new URL(link);
    if(parsed.protocol!=="https:"||!parsed.hostname)return fail(400);
   }catch{return fail(400);}
  }
 }
 const previousItems=Array.isArray(oldRoot.executionTimeline)?oldRoot.executionTimeline:[];
 const nextItems=Array.isArray(nextRoot.executionTimeline)?nextRoot.executionTimeline:[];
 const previousOwners=new Map(previousItems.filter((v):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v)&&typeof (v as Record<string,unknown>).id==="string").map(v=>[v.id,v.ownerUserId]));
 const changedOwners=[...new Set(nextItems.filter((v):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v)&&typeof (v as Record<string,unknown>).id==="string").filter(v=>typeof v.ownerUserId==="string"&&v.ownerUserId!==""&&v.ownerUserId!==previousOwners.get(v.id)).map(v=>v.ownerUserId as string))];
 if(changedOwners.length){
  if(changedOwners.some(id=>!uuid.test(id)))return fail(400);
  const {data:members,error:memberError}=await admin.from("team_members").select("user_id").eq("active",true).in("user_id",changedOwners);
  if(memberError)return fail(503);
  if(new Set((members??[]).map(m=>m.user_id)).size!==changedOwners.length)return fail(400);
 }

 const nextAt=new Date().toISOString();
 const {data:updated,error:updateError}=await admin.from("planning_projects")
   .update({data:b.data,updated_at:nextAt}).eq("id",b.projectId)
   .eq("updated_at",b.expectedUpdatedAt)
   .select("id,updated_at,data").maybeSingle();
 if(updateError)return fail(503);
 if(!updated)return fail(409);
 return NextResponse.json({project:updated},{headers:{"Cache-Control":"no-store"}});
}
