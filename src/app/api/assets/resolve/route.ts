import {body,failure,identity,response,uuid} from "@/lib/operations/server";
import {resolveAssets} from "@/lib/operations/assets";
export const runtime="nodejs";
export async function POST(request:Request){const a=await identity(request);if(a.error)return a.error;let b;try{b=await body(request,12000);}catch{return failure(400);}if(!Array.isArray(b.ids)||b.ids.length>100||!b.ids.every(uuid)||new Set(b.ids).size!==b.ids.length||b.download!==undefined&&typeof b.download!=="boolean")return failure(400);const links=await resolveAssets(a.identity,b.ids,b.download===true);return links?response({links}):failure(403,"Arquivo indisponível para esta conta.");}
