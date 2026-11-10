type ObjectValue=Record<string,unknown>;
const object=(value:unknown):ObjectValue|null=>value!==null&&typeof value==="object"&&!Array.isArray(value)?value as ObjectValue:null;

/** Validate the entire execution dependency graph before accepting any project data write.
 * Existing projects without a timeline remain compatible. All existing links must be
 * resolvable within the same project; dangling links and cycles are rejected.
 */
export const validOperationalDate=(date:string):boolean=>{
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
 if(!match)return false;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 if(year<1||month<1||month>12||day<1)return false;
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return day<=days[month-1];
};

export const validOperationalTime=(time:string):boolean=>/^([01]\d|2[0-3]):[0-5]\d$/.test(time);

export function validExecutionDependencies(data:unknown):boolean{
 const root=object(data);
 if(!root)return false;
 const agenda=root.operationalAgenda;
 if(agenda!==undefined&&agenda!==null){
  if(!Array.isArray(agenda)||agenda.length>1000)return false;
  const agendaIds=new Set<string>();
  const executionIds=new Set(Array.isArray(root.executionTimeline)?root.executionTimeline.map(x=>object(x)?.id):[]);
  for(const value of agenda){
   const item=object(value);
   if(!item||typeof item.id!=="string"||!item.id.trim()||item.id.length>128||agendaIds.has(item.id))return false;
   agendaIds.add(item.id);
   if(typeof item.title!=="string"||item.title.trim().length<3||item.title.length>140)return false;
   if(!["meeting","followup","checkpoint"].includes(String(item.kind))||!["planned","completed","cancelled"].includes(String(item.status)))return false;
   if(typeof item.date!=="string"||!validOperationalDate(item.date))return false;
   if(item.time!==undefined&&item.time!==""&&(typeof item.time!=="string"||!validOperationalTime(item.time)))return false;
   if(item.notes!==undefined&&(typeof item.notes!=="string"||item.notes.length>2000))return false;
   if(item.visibleToClient!==undefined&&typeof item.visibleToClient!=="boolean")return false;
   if(item.modality!==undefined&&!["online","presencial"].includes(String(item.modality)))return false;
   for(const [field,max] of [["location",180],["duration",60],["minutes",5000]] as const)if(item[field]!==undefined&&(typeof item[field]!=="string"||(item[field] as string).length>max))return false;
   for(const field of ["meetingUrl","materialUrl"]){const link=item[field];if(link===undefined||link==="")continue;if(typeof link!=="string"||link.length>2048)return false;try{const u=new URL(link);if(u.protocol!=="https:"||u.username||u.password)return false;}catch{return false;}}
   if(item.owner!==undefined&&(typeof item.owner!=="string"||item.owner.length>120))return false;
   if(item.relatedTaskId!==undefined&&item.relatedTaskId!==""&&(!Array.isArray(root.executionTimeline)||!executionIds.has(item.relatedTaskId)))return false;
   if(item.internalNotes!==undefined&&(typeof item.internalNotes!=="string"||item.internalNotes.length>5000))return false;
   if(item.minutesVisibleToClient!==undefined&&typeof item.minutesVisibleToClient!=="boolean")return false;
   if(item.actionItems!==undefined){
    if(!Array.isArray(item.actionItems)||item.actionItems.length>25)return false;
    const seenActions=new Set<string>();
    for(const value of item.actionItems){
     const action=object(value);
     if(!action||typeof action.id!=="string"||!action.id||action.id.length>128||seenActions.has(action.id))return false;
     seenActions.add(action.id);
     if(typeof action.title!=="string"||action.title.trim().length<3||action.title.length>240||typeof action.owner!=="string"||action.owner.length>120||typeof action.dueDate!=="string"||(action.dueDate!==""&&!validOperationalDate(action.dueDate)))return false;
     if(action.relatedTaskId!==undefined&&action.relatedTaskId!==""&&!executionIds.has(action.relatedTaskId))return false;
    }
   }

  }
 }
 // Editorial metadata is optional for legacy content; new operational cells are bounded.
 const editorial=root.editorialCalendar;
 if(editorial!==undefined&&editorial!==null){
  if(!Array.isArray(editorial)||editorial.length>2000)return false;
  for(const entry of editorial){
   const item=object(entry);
   if(!item)return false;
   if(item.owner!==undefined&&(typeof item.owner!=="string"||item.owner.length>120))return false;
   if(item.priority!==undefined&&!["low","normal","high","urgent"].includes(String(item.priority)))return false;
  }
 }
 const timeline=root.executionTimeline;
 if(timeline===undefined||timeline===null)return true;
 if(!Array.isArray(timeline)||timeline.length>2000)return false;
 const dependencies=new Map<string,string[]>();
 for(const entry of timeline){
  const item=object(entry);
  if(!item||typeof item.id!=="string"||!item.id.trim()||item.id.length>128||dependencies.has(item.id))return false;
  if(item.startDate!==undefined&&item.startDate!==""&&(typeof item.startDate!=="string"||!validOperationalDate(item.startDate)))return false;
  if(item.dueDate!==undefined&&item.dueDate!==""&&(typeof item.dueDate!=="string"||!validOperationalDate(item.dueDate)))return false;
  if(typeof item.startDate==="string"&&item.startDate&&typeof item.dueDate==="string"&&item.dueDate&&item.startDate>item.dueDate)return false;
  if(item.status!==undefined&&!["planned","in_progress","blocked","completed","cancelled"].includes(String(item.status)))return false;
  if(item.kind!==undefined&&!["deliverable","milestone","task"].includes(String(item.kind)))return false;
  if(item.documentCode!==undefined&&item.documentCode!==""&&(typeof item.documentCode!=="string"||!/^\d{2}\.\d{2}$/.test(item.documentCode)))return false;
  if(item.ownerUserId!==undefined&&item.ownerUserId!==""&&(typeof item.ownerUserId!=="string"||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(item.ownerUserId)))return false;
  if(item.archivedAt!==undefined&&item.archivedAt!==null){if(typeof item.archivedAt!=="string"||item.archivedAt.length>40||Number.isNaN(Date.parse(item.archivedAt)))return false;}
  if(item.priority!==undefined&&!["low","normal","high","urgent"].includes(String(item.priority)))return false;
  if(item.referenceUrl!==undefined&&item.referenceUrl!==""){if(typeof item.referenceUrl!=="string"||item.referenceUrl.length>2048)return false;try{const u=new URL(item.referenceUrl);if(u.protocol!=="https:"||u.username||u.password)return false;}catch{return false;}}
  if(item.checklist!==undefined){if(!Array.isArray(item.checklist)||item.checklist.length>50)return false;const listIds=new Set<string>();for(const rawCheck of item.checklist){const check=object(rawCheck);if(!check||typeof check.id!=="string"||check.id.length>128||!check.id||listIds.has(check.id)||typeof check.text!=="string"||!check.text.trim()||check.text.length>240||typeof check.done!=="boolean")return false;listIds.add(check.id);}}
  if(item.activityLog!==undefined){if(!Array.isArray(item.activityLog)||item.activityLog.length>100)return false;for(const rawEvent of item.activityLog){const ev=object(rawEvent);if(!ev||typeof ev.at!=="string"||ev.at.length>40||Number.isNaN(Date.parse(ev.at))||typeof ev.summary!=="string"||!ev.summary.trim()||ev.summary.length>240)return false;}}

  const raw=item.dependencies??[];
  if(!Array.isArray(raw)||raw.length>200)return false;
  if(raw.some((id:unknown)=>typeof id!=="string"||!id.trim()||id.length>128))return false;
  const ids=raw as string[];
  if(new Set(ids).size!==ids.length||ids.includes(item.id))return false;
  dependencies.set(item.id,ids);
 }
 // Completion is a server-enforced workflow rule, not merely a disabled UI button.
 for(const entry of timeline){
  const item=object(entry)!;
  if(item.status!=="completed")continue;
  for(const id of dependencies.get(item.id as string)??[]){
   const prerequisite=timeline.find(candidate=>object(candidate)?.id===id);
   if(object(prerequisite)?.status!=="completed")return false;
  }
 }
 const done=new Set<string>(),visiting=new Set<string>();
 const visit=(id:string):boolean=>{
  if(!dependencies.has(id))return false;
  if(visiting.has(id))return false;
  if(done.has(id))return true;
  visiting.add(id);
  for(const prerequisite of dependencies.get(id)??[]){
   if(!visit(prerequisite))return false;
  }
  visiting.delete(id);
  done.add(id);
  return true;
 };
 return [...dependencies.keys()].every(visit);
}
