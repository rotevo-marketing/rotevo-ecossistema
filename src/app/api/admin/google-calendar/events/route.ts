import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {calendarAdmin,calendarConfig,CalendarError,googleToken,open} from "@/lib/googleCalendar/server";
import {googleEventTransport,googleEventMutationQuery} from "@/lib/googleCalendar/eventTransport";
import {eventMeeting,eventPayload,syncDecision,type SyncMeeting,type EventLink,type GoogleEvent} from "@/lib/googleCalendar/eventSync";
import {meetingInterval} from "@/lib/googleCalendar/meetingTiming";

export const runtime="nodejs";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const identifier=(v:unknown):v is string=>typeof v==="string"&&/^[a-zA-Z0-9_-]{1,120}$/.test(v);
type Meeting=SyncMeeting&{id:string;googleLink?:EventLink};

export async function POST(req:NextRequest){
 try{
  const {db,userId}=await calendarAdmin(req);
  const config=calendarConfig();
  const body=await req.json().catch(()=>null);
  if(!identifier(body?.projectId)||!identifier(body?.meetingId)||typeof body.expectedUpdatedAt!=="string"||
   !["sync","pull","push"].includes(body.action)||typeof body.notify!=="boolean"||
   (body.action!=="sync"&&(typeof body.conflictToken!=="string"||body.conflictToken.length!==64)))return json({error:"Solicitação inválida."},400);

  const {data:member,error:memberError}=await db.from("team_members").select("active,role").eq("user_id",userId).maybeSingle();
  if(memberError)throw new CalendarError(503,"Não foi possível confirmar o acesso.");
  if(!member?.active)throw new CalendarError(403,"Acesso ao projeto não autorizado.");
  if(member.role!=="admin"){
   const [assignment,permission]=await Promise.all([
    db.from("team_project_assignments").select("project_id").eq("user_id",userId).eq("project_id",body.projectId).maybeSingle(),
    db.from("team_member_permissions").select("permission").eq("user_id",userId).eq("permission","projects.write").maybeSingle()
   ]);
   if(assignment.error||permission.error)throw new CalendarError(503,"Não foi possível confirmar o acesso.");
   if(!assignment.data||!permission.data)throw new CalendarError(403,"Acesso ao projeto não autorizado.");
  }
  const [projectResult,connectionResult]=await Promise.all([
   db.from("planning_projects").select("id,data,updated_at").eq("id",body.projectId).maybeSingle(),
   db.from("rotevo_google_calendar_connections").select("google_account,selected_calendar_id,refresh_token_ciphertext").eq("user_id",userId).maybeSingle()
  ]);
  if(projectResult.error||connectionResult.error)throw new CalendarError(503,"Não foi possível carregar a sincronização.");
  const project=projectResult.data,connection=connectionResult.data;
  if(!project||project.updated_at!==body.expectedUpdatedAt)throw new CalendarError(409,"O projeto mudou. Atualize a agenda antes de sincronizar.");
  const agenda=project.data?.operationalAgenda;
  if(!Array.isArray(agenda))return json({error:"Compromisso indisponível."},404);
  const meeting=agenda.find((item:Meeting)=>item?.id===body.meetingId) as Meeting|undefined;
  if(!meeting) return json({error:"Compromisso indisponível."},404);
  let linked=meeting.googleLink;
  if(!connection||(!linked&&!connection.selected_calendar_id))throw new CalendarError(409,"Conecte a conta Google e escolha um calendário.");
  if(linked&&(linked.userId!==userId||linked.account!==connection.google_account))throw new CalendarError(403,"Use a conta Google que vinculou este compromisso.");
  if((linked?.cancelled||!linked)&&meeting.status==="cancelled")throw new CalendarError(409,"Este compromisso está cancelado.");
  if(linked?.cancelled)throw new CalendarError(409,"Crie um novo compromisso para gerar outro evento no Google.");
  const interval=meetingInterval(meeting.date,meeting.time??"",meeting.timing);
  if(!interval)throw new CalendarError(400,"Informe início, término e fuso horário na agenda.");
  const payload=eventPayload(meeting,interval);
  const localHash=digest([payload,meeting.googleOptions?.meet===true,meeting.status==="cancelled"]);
  const calendarId=linked?.calendarId??connection.selected_calendar_id;
  if(typeof calendarId!=="string"||!calendarId)throw new CalendarError(409,"Escolha um calendário.");
  const marker=digest([body.projectId,body.meetingId]);
  const eventId="r"+marker;
  const api="https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId)+"/events";
  const {access_token}=await googleToken({grant_type:"refresh_token",refresh_token:open(config.key,"refresh:"+userId,connection.refresh_token_ciphertext)});
  const query=googleEventMutationQuery(body.notify);
  const send=googleEventTransport(access_token);
  const address=api+"/"+eventId;
  const read=async()=>{
   const response=await send(address);
   if(response.status===404||response.status===410)return null;
   if(!response.ok)throw new CalendarError(502,"O Google não confirmou a consulta do evento.");
   const result=await response.json() as GoogleEvent;
   if(result.status!=="cancelled"&&(result.id!==eventId||result.extendedProperties?.private?.rotevoMeeting!==marker))
    throw new CalendarError(409,"O identificador retornado pelo Google pertence a outro evento.");
   return result;
  };
  if(!linked){
   if(body.action!=="sync")throw new CalendarError(409,"Atualize a comparação antes de resolver o conflito.");
   const reservation:EventLink={userId,account:connection.google_account,calendarId,etag:"",localHash};
   const {data:reserved,error:reserveError}=await db.from("planning_projects").update({
    data:{...project.data,operationalAgenda:agenda.map((item:Meeting)=>item.id===meeting.id?{...item,googleLink:reservation}:item)},
    updated_at:new Date(Date.parse(project.updated_at)+1).toISOString()
   }).eq("id",project.id).eq("updated_at",project.updated_at).select("updated_at").maybeSingle();
   if(reserveError||!reserved)throw new CalendarError(409,"Não foi possível reservar o vínculo. Atualize a agenda.");
   project.updated_at=reserved.updated_at;
   linked=reservation;
  }
  let remote=await read();
  let createdNow=false;
  if(!remote&&!linked.etag&&meeting.status!=="cancelled"){
   if(body.action!=="sync")throw new CalendarError(409,"Atualize a comparação antes de resolver o conflito.");
   const input={...payload,id:eventId,extendedProperties:{private:{rotevoMeeting:marker}},
    ...(meeting.googleOptions?.meet?{conferenceData:{createRequest:{requestId:eventId,conferenceSolutionKey:{type:"hangoutsMeet"}}}}:{})};
   const created=await send(api+query,"POST",input);
   if(created.status===409)remote=await read();
   else if(created.ok){remote=await created.json() as GoogleEvent;createdNow=true;}
   else throw new CalendarError(502,"O Google não confirmou a criação do evento.");
   if(!remote)throw new CalendarError(409,"O evento ainda não está disponível. Tente novamente.");
  }

  const deleted=!remote||remote.status==="cancelled";
  if(deleted){
   const access=await send("https://www.googleapis.com/calendar/v3/users/me/calendarList/"+encodeURIComponent(calendarId));
   const calendar=access.ok?await access.json():null;
   if(!["owner","writer"].includes(calendar?.accessRole))throw new CalendarError(409,"O acesso ao calendário mudou. A exclusão não foi aplicada à Rotevo.");
  }
  const external=remote&&!deleted?eventMeeting(remote,meeting.timing.timeZone):null;
  const externalRange=external?meetingInterval(external.date,external.time??"",external.timing):null;
  const externalHash=external&&externalRange?digest([eventPayload(external,externalRange),external.googleOptions?.meet===true,false]):null;
  const agree=externalHash===localHash;
  const conflictToken=digest([project.updated_at,remote?.etag??null,remote?.status??null,localHash]);
  if(body.action!=="sync"&&body.conflictToken!==conflictToken)throw new CalendarError(409,"O evento mudou após a comparação. Sincronize novamente.");
  let next:Meeting=meeting;
  let appliedHash=localHash;
  const decision=createdNow?"record":!linked.etag&&!agree&&!deleted?"conflict":syncDecision(meeting.status!=="cancelled"&&linked.localHash!==localHash,linked.etag!==remote?.etag,agree,deleted);
  const previouslyCancelled=meeting.status==="cancelled";
  const conflict=(error:string)=>json({conflict:true,canPush:!deleted,canPull:deleted||!!externalRange,conflictToken,error});
  if(body.action==="sync"&&(decision==="conflict"||previouslyCancelled&&!deleted&&linked.etag!==remote?.etag))return conflict("O compromisso e o evento têm alterações diferentes. Escolha qual versão preservar.");
  if(deleted&&body.action==="push")return conflict("O Google excluiu o evento. A exclusão pode ser refletida na Rotevo.");
  if(deleted||((body.action==="pull"||decision==="pull")&&body.action!=="push")){
   if(deleted)next={...meeting,status:"cancelled"};
   else if(external&&externalRange&&externalHash){
    next={...meeting,...external,status:meeting.status==="completed"?"completed":"planned"};
    appliedHash=externalHash;
   }else return conflict("O evento do Google contém campos incompatíveis ou indisponíveis.");
  }else if(body.action==="push"||decision==="push"||previouslyCancelled){
   if(!remote?.etag)throw new CalendarError(409,"Não foi possível confirmar a versão do evento.");
   const remove=meeting.status==="cancelled";
   const attendees=payload.attendees.map(attendee=>{
    const existing=remote?.attendees?.find(candidate=>candidate.email?.toLowerCase()===attendee.email&&!candidate.organizer);
    return existing?{...attendee,responseStatus:existing.responseStatus}:attendee;
   });
   if(remote.attendeesOmitted)throw new CalendarError(409,"O Google retornou uma lista incompleta de participantes.");
   const patch={...payload,attendees,...(meeting.googleOptions?.meet&&!external?.googleOptions?.meet?{
     conferenceData:{createRequest:{requestId:digest([eventId,remote.etag]),conferenceSolutionKey:{type:"hangoutsMeet"}}}
    }:!meeting.googleOptions?.meet&&external?.googleOptions?.meet?{conferenceData:null}:{})};
   const result=await send(address+query,remove?"DELETE":"PATCH",remove?undefined:patch,remote.etag);
   if(result.status===412)throw new CalendarError(409,"O evento foi editado no Google. Sincronize novamente.");
   if(!result.ok&&!(remove&&(result.status===404||result.status===410)))throw new CalendarError(502,"O Google não confirmou a alteração.");
   remote=remove?null:await result.json() as GoogleEvent;
  }
  const wasCancelled=next.status==="cancelled"&&(!remote||remote.status==="cancelled");
  if(!wasCancelled&&!remote?.etag)throw new CalendarError(502,"O Google não confirmou a versão do evento.");
  const meetUrl=remote?.hangoutLink?.match(/^https:\/\/meet\.google\.com\/[a-z-]+$/i)?.[0];
  next={...next,googleLink:{userId,account:connection.google_account,calendarId,etag:remote?.etag??"",localHash:appliedHash,
   ...(wasCancelled?{cancelled:true}:{}),...(meetUrl?{meetUrl}:{}),
   ...(remote?.conferenceData?.createRequest?.status?.statusCode?{meetStatus:remote.conferenceData.createRequest.status.statusCode}:{})}};
  if(JSON.stringify(next)===JSON.stringify(meeting))return json({project});
  const clock=new Date(Math.max(Date.now(),Date.parse(project.updated_at)+1)).toISOString();
  const {data:updated,error}=await db.from("planning_projects").update({
   data:{...project.data,operationalAgenda:agenda.map((item:Meeting)=>item.id===meeting.id?next:item)},updated_at:clock
  }).eq("id",project.id).eq("updated_at",project.updated_at).select("data,updated_at").maybeSingle();
  if(error)throw new CalendarError(503,"Não foi possível registrar o vínculo. Tente sincronizar novamente.");
  if(!updated)throw new CalendarError(409,"O projeto mudou durante a sincronização. Atualize e tente novamente.");
  return json({project:updated});
 }catch(error){
  if(error instanceof CalendarError)return json({error:error.message},error.status);
  return json({error:"Não foi possível sincronizar o evento."},503);
 }
}
