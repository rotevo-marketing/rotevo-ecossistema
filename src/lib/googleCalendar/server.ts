import "server-only";
import {createCipheriv,createDecipheriv,randomBytes,createHash} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {NextRequest} from "next/server";

export const callbackPath="/api/admin/google-calendar/callback";
export const scopes=[
 "openid","email","https://www.googleapis.com/auth/calendar.calendarlist.readonly",
 "https://www.googleapis.com/auth/calendar.events","https://www.googleapis.com/auth/calendar.events.freebusy"
];
export const oauthCookie="rotevo_google_calendar_oauth";
export const oauthResultCookie="rotevo_google_calendar_code";
export function calendarConfig(){
 if(process.env.ROTEVO_GOOGLE_CALENDAR_ENABLED!=="true")throw new CalendarError(503,"Google Calendar ainda não está habilitado.");
 const clientId=process.env.ROTEVO_GOOGLE_CLIENT_ID;
 const clientSecret=process.env.ROTEVO_GOOGLE_CLIENT_SECRET;
 const configuredOrigin=process.env.ROTEVO_GOOGLE_OAUTH_ORIGIN;
 const encryptionKey=Buffer.from(process.env.ROTEVO_GOOGLE_TOKEN_KEY??"","base64");
 if(!clientId||!clientSecret||!configuredOrigin||encryptionKey.length!==32)throw new CalendarError(503,"Conexão Google ainda não configurada.");
 const parsed=new URL(configuredOrigin);
 if(parsed.origin!==configuredOrigin||(parsed.protocol!=="https:"&&!(parsed.protocol==="http:"&&["localhost","127.0.0.1"].includes(parsed.hostname))))
  throw new CalendarError(503,"Origem OAuth inválida.");
 return {clientId,clientSecret,origin:parsed.origin,redirectUri:parsed.origin+callbackPath,key:encryptionKey,secure:parsed.protocol==="https:"};
}
export class CalendarError extends Error{
 constructor(public status:number,message:string){super(message);}
}
export async function calendarAdmin(req:NextRequest){
 const authHeader=req.headers.get("authorization");
 if(!authHeader?.startsWith("Bearer "))throw new CalendarError(401,"Sessão expirada.");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anonymous=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anonymous||!secret)throw new CalendarError(503,"Conexão indisponível.");
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const {data,error}=await createClient(url,anonymous,options).auth.getUser(authHeader.slice(7));
 if(error||!data.user)throw new CalendarError(401,"Sessão expirada.");
 if(data.user.app_metadata?.rotevo_password_reset_required===true)throw new CalendarError(403,"Atualize sua senha inicial.");
 const db=createClient(url,secret,options);
 const userId=data.user.id;
 const [profile,member]=await Promise.all([
  db.from("profiles").select("role").eq("id",userId).maybeSingle(),
  db.from("team_members").select("active").eq("user_id",userId).maybeSingle()
 ]);
 if(profile.error||member.error)throw new CalendarError(503,"Não foi possível confirmar seu acesso.");
 if(profile.data?.role!=="strategist"||member.data?.active!==true)throw new CalendarError(403,"Acesso à integração não autorizado.");
 return {db,userId};
}
export function seal(key:Buffer,purpose:string,value:string){
 const nonce=randomBytes(12);
 const cipher=createCipheriv("aes-256-gcm",key,nonce);
 cipher.setAAD(Buffer.from(purpose));
 const payload=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
 return Buffer.concat([nonce,cipher.getAuthTag(),payload]).toString("base64url");
}
export function open(key:Buffer,purpose:string,value:string){
 const payload=Buffer.from(value,"base64url");
 const cipher=createDecipheriv("aes-256-gcm",key,payload.subarray(0,12));
 cipher.setAAD(Buffer.from(purpose));
 cipher.setAuthTag(payload.subarray(12,28));
 return Buffer.concat([cipher.update(payload.subarray(28)),cipher.final()]).toString("utf8");
}
export function newOAuthAttempt(userId:string){
 const state=randomBytes(32).toString("base64url");
 const verifier=randomBytes(48).toString("base64url");
 return {state,verifier,challenge:createHash("sha256").update(verifier).digest("base64url"),userId,expires:Date.now()+600_000};
}
export async function googleToken(fields:Record<string,string>){
 const config=calendarConfig();
 const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",cache:"no-store",signal:AbortSignal.timeout(10_000),
  body:new URLSearchParams({...fields,client_id:config.clientId,client_secret:config.clientSecret})});
 const body=await response.json().catch(()=>null);
 if(!response.ok||typeof body?.access_token!=="string"){
  if(body?.error==="invalid_grant")throw new CalendarError(409,"A autorização do Google expirou ou foi revogada. Conecte novamente.");
  throw new CalendarError(502,"Não foi possível confirmar a autorização no Google.");
 }
 return body as {access_token:string;refresh_token?:string;scope?:string};
}
export async function googleCalendarRead<T>(pathname:string,token:string):Promise<T>{
 const response=await fetch("https://www.googleapis.com"+pathname,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(10_000)});
 if(!response.ok)throw new CalendarError(502,"Não foi possível consultar o Google Calendar.");
 return await response.json() as T;
}
