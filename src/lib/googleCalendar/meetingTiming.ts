export type MeetingTiming={endDate:string;endTime:string;timeZone:string;allDay:boolean};
export const defaultMeetingZone="America/Sao_Paulo";
const day=86_400_000;
const date=/^\d{4}-\d{2}-\d{2}$/;
const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/;

function validDate(value:unknown):value is string{
 if(typeof value!=="string"||!date.test(value))return false;
 const epoch=Date.parse(value+"T00:00:00Z");
 return Number.isFinite(epoch)&&new Date(epoch).toISOString().slice(0,10)===value;
}

function localInstant(d:string,t:string,zone:string){
 try{
  const format=new Intl.DateTimeFormat("sv-SE",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
  const wall=d+" "+t;
  const approximate=Date.parse(d+"T"+t+":00Z");
  const offsets=[-day,0,day].map(delta=>{
   const candidate=approximate+delta;
   const local=format.format(candidate).replace(" ","T");
   return Date.parse(local+":00Z")-candidate;
  });
  const matches=[...new Set(offsets)].map(offset=>approximate-offset).filter(candidate=>format.format(candidate)===wall);
  return matches.length===1?matches[0]:null;
 }catch{return null;}
}

export function meetingInterval(startDate:unknown,startTime:unknown,value:unknown):{start:number;end:number;minutes:number}|null{
 if(!value||typeof value!=="object"||Array.isArray(value)||!validDate(startDate))return null;
 const {endDate,endTime,timeZone,allDay}=value as Record<string,unknown>;
 if(!validDate(endDate)||typeof timeZone!=="string"||timeZone.length>100||typeof allDay!=="boolean")return null;
 if(allDay?(startTime!==""||endTime!==""):(typeof startTime!=="string"||!time.test(startTime)||typeof endTime!=="string"||!time.test(endTime)))return null;
 const start=localInstant(startDate,allDay?"00:00":String(startTime),timeZone);
 const endDay=allDay?new Date(Date.parse(endDate+"T00:00:00Z")+day).toISOString().slice(0,10):endDate;
 const end=localInstant(endDay,allDay?"00:00":String(endTime),timeZone);
 if(start===null||end===null||end<=start)return null;
 return {start,end,minutes:(end-start)/60_000};
}

export function meetingIntervalsOverlap(a:{start:number;end:number},b:{start:number;end:number}){
 return a.start<b.end&&b.start<a.end;
}
