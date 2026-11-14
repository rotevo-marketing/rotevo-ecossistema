import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const runtime="nodejs";
const reply=(status:number,error:string)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
type Appearance="light"|"dark"|"system";
async function authorized(req:NextRequest,expectedUserId:string){
 const header=req.headers.get("authorization");
 const token=header?.startsWith("Bearer ")?header.slice(7).trim():"";
 if(!token)return {error:reply(401,"Autenticação necessária.")} as const;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return {error:reply(503,"Serviço indisponível.")} as const;
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+token}}});
 const {data,error}=await client.auth.getUser(token);
 if(error||!data.user)return {error:reply(401,"Sessão expirada.")} as const;
 if(data.user.app_metadata?.rotevo_password_reset_required===true)return {error:reply(403,"Atualize sua senha inicial.")} as const;
 if(data.user.id!==expectedUserId)return {error:reply(409,"A sessão mudou. Reabra o painel.")} as const;
 return {client} as const;
}
function rpcFailure(code?:string){
 if(code==="42501")return reply(403,"Acesso não autorizado.");
 if(code==="22023")return reply(400,"Preferência inválida.");
 return reply(503,"Não foi possível consultar ou salvar sua preferência.");
}
/** Server flag keeps this inactive while dark-mode palette awaits visual homologation. */
export async function GET(req:NextRequest){
 if(process.env.ROTEVO_APPEARANCE_ENABLED!=="true")return reply(503,"Aparência em homologação.");
 const id=req.nextUrl.searchParams.get("expectedAuthorUserId");
 if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return reply(400,"Usuário inválido.");
 const auth=await authorized(req,id);
 if("error" in auth)return auth.error;
 const {data,error}=await auth.client.rpc("rotevo_account_appearance_get");
 if(error)return rpcFailure(error.code);
 return NextResponse.json({appearance:data?.appearance??"system"},{headers:{"Cache-Control":"no-store"}});
}
export async function PATCH(req:NextRequest){
 if(process.env.ROTEVO_APPEARANCE_ENABLED!=="true")return reply(503,"Aparência em homologação.");
 let raw:unknown;
 try{raw=await req.json();}catch{return reply(400,"Dados inválidos.");}
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return reply(400,"Dados inválidos.");
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).some(k=>!["appearance","expectedAuthorUserId"].includes(k)))return reply(400,"Dados inválidos.");
 const appearance=x.appearance;
 if(appearance!=="light"&&appearance!=="dark"&&appearance!=="system")return reply(400,"Preferência inválida.");
 if(typeof x.expectedAuthorUserId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x.expectedAuthorUserId))
  return reply(400,"Usuário inválido.");
 const auth=await authorized(req,x.expectedAuthorUserId);
 if("error" in auth)return auth.error;
 const {data,error}=await auth.client.rpc("rotevo_account_appearance_set",{p_appearance:appearance as Appearance});
 if(error)return rpcFailure(error.code);
 return NextResponse.json({appearance:data?.appearance??appearance},{headers:{"Cache-Control":"no-store"}});
}
