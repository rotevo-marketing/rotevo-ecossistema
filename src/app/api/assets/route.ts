import {administrator,authorizeProject,failure,identity,response,uuid} from "@/lib/operations/server";
import {fileSignature,financeWriter,type Asset} from "@/lib/operations/assets";
export const runtime="nodejs";
export async function POST(request:Request){
 const a=await identity(request);if(a.error)return a.error;
 if(Number(request.headers.get("content-length"))>4500000)return failure(413,"Arquivo muito grande.");
 let form:FormData;try{form=await request.formData();}catch{return failure(400);}
 const file=form.get("file"),purpose=form.get("purpose");if(!(file instanceof File)||typeof purpose!=="string"||!["planning","contract","invoice","receipt","avatar"].includes(purpose))return failure(400);
 if(!["image/png","image/jpeg","image/webp","application/pdf"].includes(file.type)||file.size<1||file.size>4*1024*1024||purpose==="avatar"&&file.type==="application/pdf"||purpose==="planning"&&file.type==="application/pdf")return failure(400,"Use imagens PNG, JPG, WebP até 4 MB ou documentos PDF até 4 MB.");
 let clientId:string|null=null,projectId:string|null=null,invoiceId:string|null=null;
 if(purpose==="planning"){
  const id=form.get("projectId");if(!uuid(id)||!await authorizeProject(a.identity,id,true))return failure(403);
  const p=await a.identity.db.from("planning_projects").select("client_id").eq("id",id).maybeSingle();if(p.error)return failure(503);if(!p.data)return failure(404);clientId=p.data.client_id;projectId=id;
 }else if(purpose!=="avatar"){
  if(!administrator(a.identity)&&!((purpose==="invoice"||purpose==="receipt")&&financeWriter(a.identity)))return failure(403);
  const id=form.get("clientId");if(!uuid(id))return failure(400);const c=await a.identity.db.from("clients").select("id").eq("id",id).maybeSingle();if(c.error)return failure(503);if(!c.data)return failure(404);clientId=id;
  if(purpose==="invoice"||purpose==="receipt"){
   const invoice=form.get("invoiceId");if(!uuid(invoice))return failure(400);
   const snapshot=await a.identity.caller.rpc("rotevo_finance_snapshot");if(snapshot.error||!snapshot.data?.invoices?.some((i:{id:string;client_id:string|null;direction:string})=>i.id===invoice&&i.client_id===id&&i.direction==="in"))return failure(403);invoiceId=invoice;
  }
 }
 const bytes=new Uint8Array(await file.arrayBuffer());if(!fileSignature(bytes,file.type))return failure(400,"O conteúdo do arquivo não corresponde ao formato informado.");
 const id=crypto.randomUUID(),extension={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","application/pdf":"pdf"}[file.type];
 const storagePath=(clientId??a.identity.userId)+"/"+(projectId??purpose)+"/"+id+"."+extension;
 const uploaded=await a.identity.db.storage.from("rotevo-private").upload(storagePath,bytes,{contentType:file.type,upsert:false});if(uploaded.error)return failure(503,"Não foi possível armazenar o arquivo privado.");
 const name=file.name.replace(/[^\p{L}\p{N} ._()-]/gu,"_").slice(0,180)||("arquivo."+extension);
 const row={id,client_id:clientId,project_id:projectId,invoice_id:invoiceId,owner_user_id:a.identity.userId,purpose:purpose as Asset["purpose"],storage_path:storagePath,original_name:name,mime_type:file.type,size_bytes:bytes.length,visible_to_client:form.get("visibleToClient")==="true"};
 const saved=await a.identity.db.from("project_assets").insert(row);if(saved.error){await a.identity.db.storage.from("rotevo-private").remove([storagePath]);return failure(503);}
 const signed=await a.identity.db.storage.from("rotevo-private").createSignedUrl(storagePath,3600);return signed.error?failure(503):response({id,url:signed.data.signedUrl,name},201);
}
