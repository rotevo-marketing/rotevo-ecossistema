import type {MeetingTiming} from "./meetingTiming.ts";

export const recurrenceOptions=["DAILY","WEEKLY","MONTHLY","YEARLY"] as const;
export type EventOptions={
 guests:string[]; optionalGuests?:string[]; description:string;
 recurrence:string; visibility?:"default"|"private"|"public"; availability?:"opaque"|"transparent"; reminders:{method:"popup"|"email";minutes:number}[]|null; meet:boolean
};
export type EventLink={userId:string;account:string;calendarId:string;etag:string;localHash:string;cancelled?:boolean;meetUrl?:string;meetStatus?:string};
export const emptyEventOptions:EventOptions={guests:[],optionalGuests:[],description:"",recurrence:"",visibility:"private",availability:"opaque",reminders:null,meet:false};
const email=/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
const recurrence=/^RRULE:FREQ=(?:DAILY|WEEKLY|MONTHLY|YEARLY)(?:;INTERVAL=(?:[1-9][0-9]?|100))?(?:;COUNT=(?:[1-9][0-9]?|[1-3][0-9]{2}|400))?$/;
export function eventOptions(input:unknown):EventOptions|null{
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const {guests,optionalGuests=[],description,recurrence:rule,visibility="private",availability="opaque",reminders,meet}=input as Record<string,unknown>;
 const validGuests=(list:unknown):list is string[]=>Array.isArray(list)&&list.length<=50&&list.every(v=>typeof v==="string"&&v.length<=254&&email.test(v));
 if(!validGuests(guests)||!validGuests(optionalGuests)||guests.length+optionalGuests.length>50||
 typeof description!=="string"||description.length>2000||typeof rule!=="string"||(rule&&!recurrence.test(rule))||typeof meet!=="boolean")return null;
 if(visibility!=="private"&&visibility!=="public"&&visibility!=="default")return null;
 if(availability!=="opaque"&&availability!=="transparent")return null;
 if(reminders!==null&&(!Array.isArray(reminders)||reminders.length>5||!reminders.every(r=>r&&(r.method==="email"||r.method==="popup")&&Number.isInteger(r.minutes)&&r.minutes>=0&&r.minutes<=40320)))return null;
 const required=[...new Set(guests.map(v=>v.toLowerCase()))].sort();
 return {guests:required,optionalGuests:[...new Set(optionalGuests.map(v=>v.toLowerCase()))].filter(v=>!required.includes(v)).sort(),description,recurrence:rule,
  visibility,availability,reminders:reminders===null?null:reminders.map(r=>({method:r.method,minutes:r.minutes})).sort((a,b)=>a.minutes-b.minutes||a.method.localeCompare(b.method)),meet};
}

export type SyncMeeting={title:string;date:string;time?:string;timing:MeetingTiming;location?:string;status:string;googleOptions?:EventOptions};
type GoogleDate={date?:string;dateTime?:string;timeZone?:string};
export type GoogleEvent={
 id?:string;etag?:string;status?:string;visibility?:string;transparency?:string;summary?:string;description?:string;location?:string;
 start?:GoogleDate;end?:GoogleDate;attendees?:{email?:string;organizer?:boolean;optional?:boolean;responseStatus?:string}[];
 attendeesOmitted?:boolean;recurringEventId?:string;recurrence?:string[];
 reminders?:{useDefault?:boolean;overrides?:EventOptions["reminders"]};
 hangoutLink?:string;conferenceData?:{createRequest?:{status?:{statusCode?:string}}};
 extendedProperties?:{private?:Record<string,string>};
};
function shiftDate(date:string,days:number){
 return new Date(Date.parse(date+"T00:00:00Z")+days*86400000).toISOString().slice(0,10);
}
export function eventPayload(item:SyncMeeting,interval:{start:number;end:number}){
 const {timing}=item;
 const options=eventOptions(item.googleOptions??emptyEventOptions);
 if(!options)throw Error("Configuração do evento inválida.");
 const date=(value:string)=>({date:value,timeZone:timing.timeZone});
 const time=(value:number)=>({dateTime:new Date(value).toISOString(),timeZone:timing.timeZone});
 return {
  summary:item.title,description:options.description,location:item.location??"",visibility:options.visibility,transparency:options.availability,
  start:timing.allDay?date(item.date):time(interval.start),
  end:timing.allDay?date(shiftDate(timing.endDate,1)):time(interval.end),
  attendees:[...options.guests.map(email=>({email,optional:false})),...(options.optionalGuests??[]).map(email=>({email,optional:true}))],recurrence:options.recurrence?[options.recurrence]:[],
  reminders:options.reminders===null?{useDefault:true}:{useDefault:false,overrides:options.reminders}
 };
}
export function eventMeeting(remote:GoogleEvent,fallbackZone:string):SyncMeeting|null{
 if(remote.attendeesOmitted||remote.recurringEventId||!remote.start||!remote.end||!remote.summary||
  remote.summary.trim().length<3||remote.summary.length>140||(remote.location??"").length>180) return null;
 if((remote.recurrence?.length??0)>1)return null;
 const allDay=!!remote.start.date;
 if(!!remote.end.date!==allDay)return null;
 const timeZone=remote.start.timeZone??fallbackZone;
 try{
  const format=new Intl.DateTimeFormat("sv-SE",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
  const start=allDay?[remote.start.date!,""]:format.format(new Date(remote.start.dateTime??"")).split(" ");
  const end=allDay?[shiftDate(remote.end.date!,-1),""]:format.format(new Date(remote.end.dateTime??"")).split(" ");
  const googleOptions=eventOptions({
   guests:(remote.attendees??[]).filter(a=>!a.organizer&&!a.optional).map(a=>a.email),
   optionalGuests:(remote.attendees??[]).filter(a=>!a.organizer&&a.optional).map(a=>a.email),description:remote.description??"",
   recurrence:remote.recurrence?.[0]??"",visibility:remote.visibility??"default",availability:remote.transparency??"opaque",reminders:remote.reminders?.useDefault===false?remote.reminders.overrides??[]:null,
   meet:!!(remote.hangoutLink||remote.conferenceData?.createRequest)
  });
  if(!googleOptions)return null;
  return {title:remote.summary,date:start[0],time:start[1],timing:{endDate:end[0],endTime:end[1],timeZone,allDay},location:remote.location??"",googleOptions,status:"planned"};
 }catch{return null;}
}
export function syncDecision(localChanged:boolean,remoteChanged:boolean,agree:boolean,deleted:boolean){
 if(deleted)return localChanged?"conflict":"cancel";
 if(agree)return "record";
 if(localChanged&&remoteChanged)return "conflict";
 if(remoteChanged)return "pull";
 return localChanged?"push":"record";
}
