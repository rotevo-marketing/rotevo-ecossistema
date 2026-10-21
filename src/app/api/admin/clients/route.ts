import {administrator,body,failure,identity,response,uuid} from "@/lib/operations/server";
import {safeLink} from "@/lib/operations/model";
export const runtime="nodejs";
const columns="id,name,slug,contact_name,contact_email,whatsapp,status,cover_image_url,created_at,updated_at";
export async function GET(request:Request){const auth=await identity(request);if(auth.error)return auth.error;if(!administrator(auth.identity))return failure(403);const r=await auth.identity.db.from("clients").select(columns).order("name");return r.error?failure(503):response({clients:r.data});}
async function save(request:Request,create:boolean){
 const auth=await identity(request);if(auth.error)return auth.error;if(!administrator(auth.identity))return failure(403);
 let data;try{data=await body(request,12000);}catch{return failure(400);}
 if(typeof data.name!=="string"||data.name.trim().length<3||data.name.length>180)return failure(400,"Informe o nome do cliente entre 3 e 180 caracteres.");
 for(const key of ["contact_name","contact_email","whatsapp","cover_image_url"])if(data[key]!==undefined&&(typeof data[key]!=="string"||(data[key] as string).length>(key==="cover_image_url"?2048:180)))return failure(400);
 if(data.contact_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.contact_email)))return failure(400,"Confira o e-mail de contato.");
 if(data.cover_image_url&&!safeLink(data.cover_image_url))return failure(400);
 const status=data.status??"active";if(!["active","paused","archived"].includes(String(status)))return failure(400);
 const row={name:data.name.trim(),contact_name:data.contact_name||null,contact_email:data.contact_email||null,whatsapp:data.whatsapp||null,cover_image_url:data.cover_image_url||null,status,updated_at:new Date().toISOString()};
 if(create){const slug=row.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,58)+"-"+crypto.randomUUID().slice(0,6);const r=await auth.identity.db.from("clients").insert({...row,slug}).select(columns).single();return r.error?failure(400,"Não foi possível cadastrar o cliente."):response({client:r.data},201);}
 if(!uuid(data.id)||typeof data.expectedUpdatedAt!=="string")return failure(400);
 const r=await auth.identity.db.from("clients").update(row).eq("id",data.id).eq("updated_at",data.expectedUpdatedAt).select(columns).maybeSingle();return r.error?failure(503):r.data?response({client:r.data}):failure(409,"Cadastro alterado em outra sessão. Atualize antes de salvar.");
}
export const POST=(request:Request)=>save(request,true);
export const PATCH=(request:Request)=>save(request,false);
