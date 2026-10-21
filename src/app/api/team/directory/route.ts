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
 const userIds=(members??[]).map(item=>item.user_id);
 const preferences=userIds.length?await admin.from("user_preferences").select("user_id,display_name,avatar_asset_id,updated_at").in("user_id",userIds):{data:[],error:null};
 if(preferences.error)return fail(503);
 const prefs=new Map((preferences.data??[]).map(item=>[item.user_id,item]));
 const avatarIds=(preferences.data??[]).flatMap(item=>item.avatar_asset_id?[item.avatar_asset_id]:[]);
 const assets=avatarIds.length?await admin.from("project_assets").select("id,storage_path").eq("purpose","avatar").in("id",avatarIds):{data:[],error:null};
 if(assets.error)return fail(503);
 const paths=new Map((assets.data??[]).map(item=>[item.id,item.storage_path]));
 const signed=paths.size?await admin.storage.from("rotevo-private").createSignedUrls([...paths.values()],3600):{data:[],error:null};
 if(signed.error||signed.data?.some(item=>item.error))return fail(503);
 const urls=new Map((signed.data??[]).map(item=>[item.path,item.signedUrl]));
 const directory=(members??[]).map(item=>{const p=prefs.get(item.user_id);return {...item,display_name:p?.display_name||item.display_name,avatar_ref:p?.avatar_asset_id?"asset://"+p.avatar_asset_id:"",avatar_url:p?(p.avatar_asset_id?urls.get(paths.get(p.avatar_asset_id)??"")??null:null):item.avatar_url,profile_updated_at:p?.updated_at??null};});
 const {data:assignments,error:assignmentsError}=await admin.from("team_project_assignments").select("user_id,project_id");
 if(assignmentsError)return fail(503);
 const {data:permissions,error:permissionsError}=await admin.from("team_member_permissions").select("user_id,permission");
 if(permissionsError)return fail(503);
 const {data:projects,error:projectsError}=await admin.from("planning_projects").select("id,title").order("title");
 if(projectsError)return fail(503);
 const capabilities={
  invites:process.env.ROTEVO_TEAM_INVITES_ENABLED==="true",
  permissions:process.env.ROTEVO_TEAM_PERMISSIONS_ENABLED==="true",
  assignments:process.env.ROTEVO_TEAM_ASSIGNMENTS_ENABLED==="true",
  memberStatus:process.env.ROTEVO_TEAM_MEMBER_STATUS_ENABLED==="true",
  adminTransfer:process.env.ROTEVO_TEAM_ADMIN_TRANSFER_ENABLED==="true"
 };
 return NextResponse.json({assignments:assignments??[],permissions:permissions??[],members:directory,projects:projects??[],capabilities},{headers:{"Cache-Control":"no-store, private","Vary":"Authorization"}});
}
