import {administrator,body,failure,identity,uuid} from "@/lib/operations/server";
import {saveProfile} from "@/lib/operations/profile";
export const runtime="nodejs";

export async function PATCH(request:Request){
 const auth=await identity(request);if(auth.error)return auth.error;
 if(!administrator(auth.identity))return failure(403);
 let data;try{data=await body(request,6000);}catch{return failure(400);}
 if(Object.keys(data).some(key=>!["userId","displayName","avatarRef","expectedUpdatedAt"].includes(key))||!uuid(data.userId))return failure(400);
 const target=await auth.identity.db.from("team_members").select("user_id").eq("user_id",data.userId).maybeSingle();
 if(target.error)return failure(503);if(!target.data)return failure(404,"Colaborador não encontrado.");
 const profile=await auth.identity.db.from("profiles").select("role").eq("id",data.userId).maybeSingle();
 if(profile.error)return failure(503);if(!profile.data||!["strategist","staff"].includes(profile.data.role))return failure(403);
 return saveProfile(auth.identity,data.userId,data);
}
