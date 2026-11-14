import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import {NextResponse} from "next/server";
export const response=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"no-store, private","Vary":"Authorization"}});
export const failure=(status:number,message="Não foi possível acessar o registro autorizado.")=>response({error:message},status);
export const uuid=(value:unknown):value is string=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export type Identity={db:SupabaseClient;caller:SupabaseClient;userId:string;profile:{role:string;client_id:string|null};member:{role:string;active:boolean}|null};
export async function identity(request:Request):Promise<{identity:Identity;error?:never}|{identity?:never;error:NextResponse}>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return {error:failure(503)};
 const token=/^Bearer (\S+)$/.exec(request.headers.get("authorization")??"")?.[1];if(!token)return {error:failure(401)};
 const caller=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const auth=await caller.auth.getUser(token);if(auth.error||!auth.data.user)return {error:failure(401)};
 if(auth.data.user.app_metadata?.rotevo_password_reset_required===true)return {error:failure(403,"Conclua a troca inicial de senha.")};
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}),userId=auth.data.user.id;
 const profile=await db.from("profiles").select("role,client_id").eq("id",userId).maybeSingle();if(profile.error)return {error:failure(503)};if(!profile.data)return {error:failure(403)};
 let member=null;if(profile.data.role!=="client"){const result=await db.from("team_members").select("role,active").eq("user_id",userId).maybeSingle();if(result.error)return {error:failure(503)};member=result.data;if(!member?.active)return {error:failure(403)};}
 return {identity:{db,caller,userId,profile:profile.data,member}};
}
export function administrator(value:Identity){return value.profile.role==="strategist"&&value.member?.active===true&&value.member.role==="admin";}
export async function authorizeProject(value:Identity,projectId:string,write=false){
 if(administrator(value))return true;if(!value.member?.active||!["staff","strategist"].includes(value.profile.role))return false;
 const [assignment,permission]=await Promise.all([value.db.from("team_project_assignments").select("project_id").eq("user_id",value.userId).eq("project_id",projectId).maybeSingle(),value.db.from("team_member_permissions").select("permission").eq("user_id",value.userId).eq("permission",write?"projects.write":"projects.read").maybeSingle()]);
 return !assignment.error&&!permission.error&&!!assignment.data&&!!permission.data;
}
export async function body(request:Request,max=1500000){const raw=await request.text();if(raw.length>max)throw Error("Solicitação muito grande.");const value:unknown=JSON.parse(raw);if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Solicitação inválida.");return value as Record<string,unknown>;}
