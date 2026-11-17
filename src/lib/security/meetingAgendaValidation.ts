import {eventOptions} from "../googleCalendar/eventSync.ts";
import {meetingInterval} from "../googleCalendar/meetingTiming.ts";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Root=Record<string,unknown>;
export function validMeetingAgenda(oldRoot:Root,nextRoot:Root):boolean{
 // Validate newly changed meeting records while preserving existing legacy records during unrelated edits.
 if(JSON.stringify(oldRoot.operationalAgenda)!==JSON.stringify(nextRoot.operationalAgenda)){
  const agenda=nextRoot.operationalAgenda;
  if(!Array.isArray(agenda)||agenda.length>500)return false;
  // Completed meetings and meetings with a recorded minute are retained to preserve accountability.
  const nextIds=new Set(agenda.flatMap(row=>row&&typeof row==="object"&&!Array.isArray(row)&&typeof (row as Record<string,unknown>).id==="string"?[(row as Record<string,unknown>).id as string]:[]));
  if(Array.isArray(oldRoot.operationalAgenda)&&oldRoot.operationalAgenda.some(row=>{
   if(!row||typeof row!=="object"||Array.isArray(row))return false;
   const old=row as Record<string,unknown>;
   return typeof old.id==="string"&&!nextIds.has(old.id)&&(!!old.googleLink||old.status==="completed"||(typeof old.minutes==="string"&&old.minutes.trim()!==""));
  }))return false;
  const legacyIds=new Set(Array.isArray(oldRoot.operationalAgenda)?oldRoot.operationalAgenda.flatMap(row=>row&&typeof row==="object"&&!Array.isArray(row)&&typeof (row as Record<string,unknown>).id==="string"?[(row as Record<string,unknown>).id as string]:[]):[]);
  const ids=new Set<string>();
  const validHttps=(value:unknown)=>{if(value===undefined||value==="")return true;if(typeof value!=="string"||value.length>2048)return false;try{return new URL(value).protocol==="https:";}catch{return false;}};
  for(const value of agenda){
   if(!value||typeof value!=="object"||Array.isArray(value))return false;
   const item=value as Record<string,unknown>;
   if(typeof item.id!=="string"||(!uuid.test(item.id)&&!legacyIds.has(item.id))||ids.has(item.id))return false;
   ids.add(item.id);
   const oldItem=Array.isArray(oldRoot.operationalAgenda)?oldRoot.operationalAgenda.find(row=>row&&typeof row==="object"&&!Array.isArray(row)&&(row as Record<string,unknown>).id===item.id):undefined;
   if(JSON.stringify((oldItem as Record<string,unknown>|undefined)?.googleLink)!==JSON.stringify(item.googleLink))return false;
   if(item.googleOptions!==undefined&&!eventOptions(item.googleOptions))return false;
   if(oldItem&&JSON.stringify(oldItem)===JSON.stringify(item))continue; // Preserve untouched legacy meetings.
   if(typeof item.title!=="string"||item.title.trim().length<3||item.title.length>140)return false;
   if(typeof item.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||!Number.isFinite(Date.parse(item.date)))return false;
   if(item.timing!==undefined&&!meetingInterval(item.date,item.time??"",item.timing))return false;
   if(!["meeting","followup","checkpoint"].includes(String(item.kind))||!["planned","completed","cancelled"].includes(String(item.status)))return false;
   for(const [key,max] of [["minutes",5000],["internalNotes",5000],["notes",2000],["owner",120],["location",180],["duration",60]] as const)if(item[key]!==undefined&&(typeof item[key]!=="string"||item[key].length>max))return false;
   if(item.agendaVisibleToClient!==undefined&&typeof item.agendaVisibleToClient!=="boolean")return false;
   if(item.minutesVisibleToClient!==undefined&&typeof item.minutesVisibleToClient!=="boolean")return false;
   if(item.actionItems!==undefined){
    if(!Array.isArray(item.actionItems)||item.actionItems.length>25)return false;
    const actionIds=new Set<string>();
    const taskIds=new Set(Array.isArray(nextRoot.executionTimeline)?nextRoot.executionTimeline.flatMap(row=>row&&typeof row==="object"&&!Array.isArray(row)&&typeof (row as Record<string,unknown>).id==="string"?[(row as Record<string,unknown>).id]:[]):[]);
    for(const raw of item.actionItems){
     if(!raw||typeof raw!=="object"||Array.isArray(raw))return false;
     const action=raw as Record<string,unknown>;
     if(typeof action.id!=="string"||!uuid.test(action.id)||actionIds.has(action.id))return false;
     actionIds.add(action.id);
     if(typeof action.title!=="string"||action.title.trim().length<3||action.title.length>240)return false;
     if(typeof action.owner!=="string"||action.owner.length>120||typeof action.dueDate!=="string")return false;
     if(action.dueDate!==""&&(!/^\d{4}-\d{2}-\d{2}$/.test(action.dueDate)||!Number.isFinite(Date.parse(action.dueDate))))return false;
     if(action.relatedTaskId!==undefined&&action.relatedTaskId!==""&&(typeof action.relatedTaskId!=="string"||!taskIds.has(action.relatedTaskId)))return false;
    }
   }

   if(item.visibleToClient!==undefined&&typeof item.visibleToClient!=="boolean")return false;
   if(!validHttps(item.materialUrl)||!validHttps(item.meetingUrl))return false;
  }
 }


 return true;
}
export function recordMeetingMinutes(oldRoot:Root,nextRoot:Root,userId:string):void{
 // Append-only audit trail for edited minutes. Attribution and timestamp come from
 // the authenticated server identity, never from browser-supplied history.
 if(JSON.stringify(oldRoot.operationalAgenda)!==JSON.stringify(nextRoot.operationalAgenda)&&Array.isArray(nextRoot.operationalAgenda)){
  const originals=Array.isArray(oldRoot.operationalAgenda)?oldRoot.operationalAgenda:[];
  const originalById=new Map(originals.filter((value):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value)&&typeof (value as Record<string,unknown>).id==="string").map(value=>[value.id as string,value]));
  nextRoot.operationalAgenda=nextRoot.operationalAgenda.map(value=>{
   const current=value as Record<string,unknown>;
   const previous=originalById.get(current.id as string);
   const historical=previous&&Array.isArray(previous.minutesHistory)?previous.minutesHistory.slice(-99):[];
   const before=typeof previous?.minutes==="string"?previous.minutes:"";
   const after=typeof current.minutes==="string"?current.minutes:"";
   const changed=before!==after;
   const history=changed?[...historical,{version:historical.length+1,text:after,changedAt:new Date().toISOString(),changedBy:userId}]:historical;
   const {minutesHistory:_ignored,...safeCurrent}=current;
   return history.length?{...safeCurrent,minutesHistory:history}:safeCurrent;
  });
 }

}
