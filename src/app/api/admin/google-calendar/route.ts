import {NextRequest,NextResponse} from "next/server";
import {CalendarError,calendarAdmin,calendarConfig,googleCalendarRead,googleToken,newOAuthAttempt,oauthCookie,oauthResultCookie,open,scopes,seal} from "@/lib/googleCalendar/server";

export const runtime="nodejs";
const table="rotevo_google_calendar_connections";
const cookiePath="/api/admin/google-calendar";
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"no-store"}});
const failure=(error:unknown)=>error instanceof CalendarError?json({error:error.message},error.status):json({error:"Não foi possível concluir a operação do Google Calendar."},503);
type Calendar={id:string;summary?:string;summaryOverride?:string;accessRole?:string;primary?:boolean;conferenceProperties?:{allowedConferenceSolutionTypes?:string[]}};
async function calendars(token:string){
 const results:Calendar[]=[];
 let page="";
 do{
  const query=new URLSearchParams({minAccessRole:"writer",maxResults:"250"});
  if(page)query.set("pageToken",page);
  const data=await googleCalendarRead<{items?:Calendar[];nextPageToken?:string}>("/calendar/v3/users/me/calendarList?"+query,token);
  results.push(...(data.items??[]).filter(c=>c.accessRole==="owner"||c.accessRole==="writer"));
  page=data.nextPageToken??"";
 }while(page);
 return results.map(c=>({id:c.id,title:c.summaryOverride??c.summary??c.id,primary:c.primary===true,meet:c.conferenceProperties?.allowedConferenceSolutionTypes?.includes("hangoutsMeet")??false}));
}
export async function GET(req:NextRequest){
 try{
  const {db,userId}=await calendarAdmin(req);
  const config=calendarConfig();
  const {data,error}=await db.from(table).select("google_account,selected_calendar_id,refresh_token_ciphertext").eq("user_id",userId).maybeSingle();
  if(error)throw new CalendarError(503,"Não foi possível consultar a conexão.");
  if(!data)return json({connected:false});
  const response={connected:true,account:data.google_account,selectedCalendarId:data.selected_calendar_id};
  try{
   const token=await googleToken({grant_type:"refresh_token",refresh_token:open(config.key,"refresh:"+userId,data.refresh_token_ciphertext)});
   return json({...response,calendars:await calendars(token.access_token)});
  }catch(error){
   if(error instanceof CalendarError&&error.status===409)return json({...response,expired:true});
   throw error;
  }
 }catch(error){return failure(error);}
}
export async function POST(req:NextRequest){
 try{
  const {db,userId}=await calendarAdmin(req);
  const config=calendarConfig();
  const body=await req.json().catch(()=>null);
  const options={path:cookiePath,httpOnly:true,secure:config.secure,sameSite:"lax" as const,maxAge:600};
  if(body?.action==="start"){
   const attempt=newOAuthAttempt(userId);
   const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
   url.search=new URLSearchParams({
    client_id:config.clientId,redirect_uri:config.redirectUri,response_type:"code",
    scope:scopes.join(" "),access_type:"offline",prompt:"consent select_account",
    state:attempt.state,code_challenge:attempt.challenge,code_challenge_method:"S256",
   }).toString();
   const reply=json({url:url.href});
   reply.cookies.set(oauthCookie,seal(config.key,"oauth",JSON.stringify(attempt)),options);
   reply.cookies.set(oauthResultCookie,"",{...options,maxAge:0});
   return reply;
  }
  if(body?.action==="finish"){
   const stored=req.cookies.get(oauthResultCookie)?.value;
   if(!stored)throw new CalendarError(400,"A tentativa de conexão expirou. Comece novamente.");
   const attempt=JSON.parse(open(config.key,"oauth-result",stored)) as {userId:string;expires:number;code:string;verifier:string};
   if(attempt.userId!==userId||attempt.expires<Date.now())throw new CalendarError(403,"A sessão mudou. Reinicie a conexão.");
   const token=await googleToken({grant_type:"authorization_code",code:attempt.code,code_verifier:attempt.verifier,redirect_uri:config.redirectUri});
   const received=new Set(token.scope?.split(" ")??[]);
   if(!token.refresh_token||!scopes.filter(scope=>scope.startsWith("https://")).every(scope=>received.has(scope)))
    throw new CalendarError(409,"Conceda todas as permissões de agenda para concluir a conexão.");
   const identity=await googleCalendarRead<{email?:string;verified_email?:boolean}>("/oauth2/v2/userinfo",token.access_token);
   if(!identity.email||identity.verified_email!==true)throw new CalendarError(409,"A conta Google precisa ter um e-mail verificado.");
   const allowed=await calendars(token.access_token);
   const initial=allowed.find(item=>item.primary)?.id??null;
   const {error}=await db.from(table).upsert({
    user_id:userId,google_account:identity.email,selected_calendar_id:initial,
    refresh_token_ciphertext:seal(config.key,"refresh:"+userId,token.refresh_token),updated_at:new Date().toISOString(),
   });
   if(error)throw new CalendarError(503,"Não foi possível salvar a conexão.");
   const reply=json({connected:true,account:identity.email,selectedCalendarId:initial,calendars:allowed});
   reply.cookies.set(oauthResultCookie,"",{...options,maxAge:0});
   return reply;
  }
  if(body?.action==="select"&&typeof body.id==="string"&&body.id.length>0&&body.id.length<=1024){
   const {data,error}=await db.from(table).select("refresh_token_ciphertext,updated_at").eq("user_id",userId).maybeSingle();
   if(error)throw new CalendarError(503,"Não foi possível consultar a conexão.");
   if(!data)throw new CalendarError(409,"Conecte sua conta Google.");
   const token=await googleToken({grant_type:"refresh_token",refresh_token:open(config.key,"refresh:"+userId,data.refresh_token_ciphertext)});
   if(!(await calendars(token.access_token)).some(item=>item.id===body.id))throw new CalendarError(403,"Calendário sem permissão de escrita.");
   const change=await db.from(table).update({selected_calendar_id:body.id,updated_at:new Date().toISOString()}).eq("user_id",userId).eq("updated_at",data.updated_at).select("selected_calendar_id").maybeSingle();
   if(change.error||!change.data)throw new CalendarError(409,"A conexão mudou. Reabra a agenda.");
   return json({selectedCalendarId:change.data.selected_calendar_id});
  }
  return json({error:"Operação inválida."},400);
 }catch(error){return failure(error);}
}
export async function DELETE(req:NextRequest){
 try{
  const {db,userId}=await calendarAdmin(req);
  const config=calendarConfig();
  const row=await db.from(table).select("refresh_token_ciphertext,updated_at").eq("user_id",userId).maybeSingle();
  if(row.error)throw new CalendarError(503,"Não foi possível consultar a conexão.");
  if(!row.data)return json({connected:false});
  const revoke=await fetch("https://oauth2.googleapis.com/revoke",{method:"POST",cache:"no-store",signal:AbortSignal.timeout(10_000),
   body:new URLSearchParams({token:open(config.key,"refresh:"+userId,row.data.refresh_token_ciphertext)})});
  if(!revoke.ok&&(await revoke.json().catch(()=>null))?.error!=="invalid_token")throw new CalendarError(502,"O Google não confirmou a desconexão. Tente novamente.");
  const change=await db.from(table).delete().eq("user_id",userId).eq("updated_at",row.data.updated_at).select("user_id").maybeSingle();
  if(change.error||!change.data)throw new CalendarError(409,"A conexão mudou. Reabra a agenda.");
  return json({connected:false});
 }catch(error){return failure(error);}
}
