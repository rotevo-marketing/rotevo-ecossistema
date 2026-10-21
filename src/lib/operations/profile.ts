import {failure,response,uuid,type Identity} from "./server";

export async function saveProfile(actor:Identity,userId:string,data:Record<string,unknown>){
 if(typeof data.displayName!=="string"||data.displayName.trim().length<2||data.displayName.length>180||typeof data.avatarRef!=="string"||!(data.expectedUpdatedAt===null||typeof data.expectedUpdatedAt==="string"&&Number.isFinite(Date.parse(data.expectedUpdatedAt))))return failure(400,"Confira o nome e a fotografia informados.");
 const current=await actor.db.from("user_preferences").select("avatar_asset_id").eq("user_id",userId).maybeSingle();
 if(current.error)return failure(503);
 let avatar:string|null=null;
 if(data.avatarRef){
  if(!data.avatarRef.startsWith("asset://")||!uuid(data.avatarRef.slice(8)))return failure(400);
  avatar=data.avatarRef.slice(8);
  const asset=await actor.db.from("project_assets").select("id,owner_user_id").eq("id",avatar).eq("purpose","avatar").maybeSingle();
  if(asset.error)return failure(503);
  if(!asset.data||![actor.userId,userId].includes(asset.data.owner_user_id)&&current.data?.avatar_asset_id!==avatar)return failure(403,"Fotografia indisponível para este usuário.");
 }
 const row={display_name:data.displayName.trim(),avatar_asset_id:avatar,updated_at:new Date().toISOString()};
 if(data.expectedUpdatedAt===null){
  const result=await actor.db.from("user_preferences").insert({user_id:userId,...row}).select("updated_at").single();
  return result.error?failure(result.error.code==="23505"?409:503):response({updatedAt:result.data.updated_at});
 }
 const result=await actor.db.from("user_preferences").update(row).eq("user_id",userId).eq("updated_at",data.expectedUpdatedAt).select("updated_at").maybeSingle();
 return result.error?failure(503):result.data?response({updatedAt:result.data.updated_at}):failure(409,"Este perfil mudou em outra sessão. Atualize antes de salvar.");
}
