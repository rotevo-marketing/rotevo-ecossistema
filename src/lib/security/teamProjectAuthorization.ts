import type {SupabaseClient} from "@supabase/supabase-js";
type AuthorizationResult={allowed:boolean;status:403|503|200};
/** Transitional authorization: enforced only after explicit role/RLS rollout. */
export async function mayMutateProject(admin:SupabaseClient,userId:string,projectId:string,adminOnly=false):Promise<AuthorizationResult>{
 if(process.env.ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED!=="true")return {allowed:true,status:200};
 const {data:member,error:memberError}=await admin.from("team_members").select("role,active").eq("user_id",userId).maybeSingle();
 if(memberError)return {allowed:false,status:503};
 if(!member||member.active!==true)return {allowed:false,status:403};
 if(member.role==="admin")return {allowed:true,status:200};
 if(adminOnly)return {allowed:false,status:403};
 const {data:assignment,error:assignmentError}=await admin.from("team_project_assignments").select("project_id").eq("user_id",userId).eq("project_id",projectId).maybeSingle();
 if(assignmentError)return {allowed:false,status:503};
 if(!assignment)return {allowed:false,status:403};
 const {data:permission,error:permissionError}=await admin.from("team_member_permissions").select("permission").eq("user_id",userId).eq("permission","projects.write").maybeSingle();
 if(permissionError)return {allowed:false,status:503};
 return {allowed:!!permission,status:permission?200:403};
}
