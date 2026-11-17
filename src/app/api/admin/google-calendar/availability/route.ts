import {NextRequest,NextResponse} from "next/server";
import {CalendarError,calendarAdmin,calendarConfig,googleToken,open} from "@/lib/googleCalendar/server";
import {meetingInterval} from "@/lib/googleCalendar/meetingTiming";

export const runtime="nodejs";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:NextRequest){
 try{
  const {db,userId}=await calendarAdmin(req);
  const config=calendarConfig();
  const body=await req.json().catch(()=>null);
  const interval=meetingInterval(body?.date,body?.time,body?.timing);
  if(!interval||interval.minutes>7*1440)return json({error:"Selecione um intervalo válido de até sete dias."},400);
  const {data,error}=await db.from("rotevo_google_calendar_connections").select("selected_calendar_id,refresh_token_ciphertext").eq("user_id",userId).maybeSingle();
  if(error)return json({error:"Não foi possível consultar a conexão."},503);
  if(!data?.selected_calendar_id)return json({error:"Conecte o Google Calendar e selecione um calendário de destino."},409);
  const token=await googleToken({grant_type:"refresh_token",refresh_token:open(config.key,"refresh:"+userId,data.refresh_token_ciphertext)});
  const response=await fetch("https://www.googleapis.com/calendar/v3/freeBusy",{
   method:"POST",headers:{Authorization:"Bearer "+token.access_token,"Content-Type":"application/json"},
   cache:"no-store",signal:AbortSignal.timeout(10_000),body:JSON.stringify({
    timeMin:new Date(interval.start).toISOString(),timeMax:new Date(interval.end).toISOString(),items:[{id:data.selected_calendar_id}]
   })
  });
  const result=await response.json().catch(()=>null);
  const calendar=result?.calendars?.[data.selected_calendar_id];
  if(!response.ok||!Array.isArray(calendar?.busy)||calendar.errors?.length)
   return json({error:"O Google não confirmou a disponibilidade."},502);
  // The client receives no private event, calendar identity or exact busy window.
  return json({busy:calendar.busy.length>0});
 }catch(error){
  if(error instanceof CalendarError)return json({error:error.message},error.status);
  return json({error:"Não foi possível consultar a disponibilidade."},503);
 }
}
