import {NextRequest,NextResponse} from "next/server";
import {calendarAdmin,CalendarError} from "@/lib/googleCalendar/server";
import {validMeetingAgenda,recordMeetingMinutes} from "@/lib/security/meetingAgendaValidation";

export const runtime="nodejs";
const table="rotevo_user_agendas";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const failure=(error:unknown)=>error instanceof CalendarError?json({error:error.message},error.status):json({error:"Não foi possível atualizar sua agenda."},503);
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const empty=()=>({data:{operationalAgenda:[]},updated_at:null});

// Identity always comes from the authenticated active strategist. No owner selector,
// project join, or administrator override exists for a private agenda.
export async function GET(req:NextRequest){
 try{
  const {db,userId}=await calendarAdmin(req);
  if(new URL(req.url).searchParams.get("expectedUserId")!==userId)return json({error:"Sessão alterada. Reabra sua agenda."},403);
  const {data,error}=await db.from(table).select("data,updated_at").eq("user_id",userId).maybeSingle();
  if(error)throw new CalendarError(503,"Sua agenda privada está indisponível. Tente novamente mais tarde.");
  return json({agenda:data??empty()});
 }catch(error){return failure(error);}
}

export async function PATCH(req:NextRequest){
 try{
  const {db,userId}=await calendarAdmin(req);
  const body:unknown=await req.json().catch(()=>null);
  if(!object(body)||Object.keys(body).some(key=>!["data","expectedUpdatedAt","expectedUserId"].includes(key))||
   !(body.expectedUpdatedAt===null||(typeof body.expectedUpdatedAt==="string"&&Number.isFinite(Date.parse(body.expectedUpdatedAt))))||
   !object(body.data)||Object.keys(body.data).length!==1||!Array.isArray(body.data.operationalAgenda)||
   JSON.stringify(body.data).length>2_000_000)return json({error:"Compromisso inválido."},400);
  if(body.expectedUserId!==userId)return json({error:"Sessão alterada. Reabra sua agenda."},403);
  // Unlinked meetings cannot carry client visibility or operational task references.
  if(body.data.operationalAgenda.some(value=>!object(value)||
   ["visibleToClient","agendaVisibleToClient","minutesVisibleToClient"].some(key=>value[key]===true)||
   (value.relatedTaskId!==undefined&&value.relatedTaskId!=="")||
   (Array.isArray(value.actionItems)&&value.actionItems.some(action=>!object(action)||(action.relatedTaskId!==undefined&&action.relatedTaskId!=="")))))return json({error:"Compromissos sem projeto são exclusivos da sua agenda."},400);
  const {data:previous,error:readError}=await db.from(table).select("data,updated_at").eq("user_id",userId).maybeSingle();
  if(readError)throw new CalendarError(503,"Sua agenda privada está indisponível.");
  if((previous?.updated_at??null)!==body.expectedUpdatedAt)return json({error:"Sua agenda mudou em outra sessão. Reabra antes de salvar."},409);
  const before=previous?.data??{operationalAgenda:[]};
  if(!validMeetingAgenda(before,body.data))return json({error:"Confira os dados do compromisso."},400);
  recordMeetingMinutes(before,body.data,userId);
  const clock=new Date(Math.max(Date.now(),previous?Date.parse(previous.updated_at)+1:0)).toISOString();
  const query=previous
   ?db.from(table).update({data:body.data,updated_at:clock}).eq("user_id",userId).eq("updated_at",previous.updated_at)
   :db.from(table).insert({user_id:userId,data:body.data,updated_at:clock});
  const {data:updated,error}=await query.select("data,updated_at").maybeSingle();
  if(error?.code==="23505"||(!error&&!updated))return json({error:"Sua agenda mudou em outra sessão. Reabra antes de salvar."},409);
  if(error)throw new CalendarError(503,"Não foi possível salvar sua agenda privada.");
  return json({agenda:updated});
 }catch(error){return failure(error);}
}
