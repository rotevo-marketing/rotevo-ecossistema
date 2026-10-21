import {administrator,authorizeProject,type Identity} from "./server";
import {assetReferences} from "../planning/richContent";
import {projectForPresentation} from "../security/projectForPresentation";
import {workspaceForClient} from "./model";
export type Asset={id:string;client_id:string|null;project_id:string|null;invoice_id:string|null;owner_user_id:string;purpose:"planning"|"contract"|"invoice"|"receipt"|"avatar";storage_path:string;original_name:string;visible_to_client:boolean};
export function financeWriter(value:Identity){return !!value.member?.active&&["strategist","staff"].includes(value.profile.role)&&["admin","finance"].includes(value.member.role);}
export async function mayReadAsset(value:Identity,asset:Asset):Promise<boolean>{
 if(asset.purpose==="avatar"){
  if(asset.owner_user_id===value.userId)return true;
  const own=await value.db.from("user_preferences").select("avatar_asset_id").eq("user_id",value.userId).eq("avatar_asset_id",asset.id).maybeSingle();
  return !own.error&&!!own.data;
 }
 if(value.profile.role!=="client"){
  if(administrator(value))return true;
  if(asset.purpose==="invoice"||asset.purpose==="receipt")return financeWriter(value);
  return asset.purpose==="planning"&&!!asset.project_id&&await authorizeProject(value,asset.project_id);
 }
 if(!value.profile.client_id||value.profile.client_id!==asset.client_id)return false;
 const workspace=await value.db.from("client_workspaces").select("data").eq("client_id",asset.client_id).maybeSingle();if(workspace.error)return false;
 const allowed=workspace.data?workspaceForClient(workspace.data.data):null;
 if(asset.purpose==="contract")return !!allowed?.modules.includes("contract")&&assetReferences(allowed.contracts).includes(asset.id);
 if(asset.purpose==="invoice"||asset.purpose==="receipt"){
  if(allowed&&!allowed.modules.includes("finance")||!asset.visible_to_client||!asset.invoice_id)return false;
  const snapshot=await value.caller.rpc("rotevo_client_finance");return !snapshot.error&&Array.isArray(snapshot.data?.invoices)&&snapshot.data.invoices.some((i:{id:string})=>i.id===asset.invoice_id);
 }
 if(!asset.project_id||allowed&&!allowed.modules.includes("planning"))return false;
 const project=await value.db.from("planning_projects").select("id,client_id,title,slug,description,status,data").eq("id",asset.project_id).eq("client_id",asset.client_id).maybeSingle();
 if(project.error||!project.data)return false;
 if(Array.isArray(project.data.data?.portalModules)&&!project.data.data.portalModules.includes("planning"))return false;
 const published=projectForPresentation({...project.data,clients:null},false);
 return published!==null&&assetReferences(published.data).includes(asset.id);
}
export async function resolveAssets(value:Identity,ids:string[],download=false){
 if(!ids.length)return {};
 const rows=await value.db.from("project_assets").select("id,client_id,project_id,invoice_id,owner_user_id,purpose,storage_path,original_name,visible_to_client").in("id",ids);
 if(rows.error||rows.data?.length!==ids.length)return null;
 const links:Record<string,string>={};
 for(const row of rows.data){if(!await mayReadAsset(value,row as Asset))return null;const signed=await value.db.storage.from("rotevo-private").createSignedUrl(row.storage_path,download?300:3600,download?{download:row.original_name}:undefined);if(signed.error||!signed.data?.signedUrl)return null;links[row.id]=signed.data.signedUrl;}
 return links;
}
export function fileSignature(bytes:Uint8Array,mime:string){
 if(mime==="image/png")return [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 if(mime==="image/jpeg")return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==="image/webp")return String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
 return mime==="application/pdf"&&String.fromCharCode(...bytes.slice(0,5))==="%PDF-";
}
