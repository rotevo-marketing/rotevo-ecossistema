type Item=Record<string,unknown>;
const item=(v:unknown):Item|null=>!!v&&typeof v==="object"&&!Array.isArray(v)?v as Item:null;
/** Operational task visibility is independent of a formal client responsibility. */
export function clientTaskVisible(value:unknown):boolean{
 const t=item(value);
 return !!t&&typeof t.id==="string"&&typeof t.title==="string"&&!t.deletedAt&&!t.archivedAt&&
  (t.kind==="task"?t.clientVisibility!=="confidential":t.visibleToClient===true);
}
export function clientResourceVisible(type:"task"|"content",value:unknown):boolean{
 const t=item(value);return type==="task"?clientTaskVisible(t):!!t&&t.visibleToClient===true&&!t.deletedAt&&!t.archivedAt;
}
export function projectClientTask(value:unknown){
 const t=item(value);if(!t||!clientTaskVisible(t))return null;
 const result:Item&{id:string;title:string;visibleToClient:true}={id:t.id as string,title:t.title as string,visibleToClient:true};
 for(const key of ["phase","status","kind","startDate","dueDate","completedAt","priority","owner"])
  if(typeof t[key]==="string")result[key]=t[key];
 // Existing explicitly shared descriptions retain their prior approval. Previously private
 // descriptions and new internal text never become public merely because tasks are mirrored.
 const description=typeof t.clientSummary==="string"?t.clientSummary:
  t.clientDescriptionApproved===true||(t.clientProjectionVersion===undefined&&t.visibleToClient===true)?t.description:undefined;
 if(typeof description==="string"&&description.trim())result.description=description.slice(0,2000);
 const checks=Array.isArray(t.checklist)?t.checklist.map(item).filter((v):v is Item=>!!v):[];
 if(checks.length)result.progress={completed:checks.filter(c=>c.done===true).length,total:checks.length};
 return result;
}
/** Server-owned privacy history. Caller cannot forge an author or silently rewrite history. */
export function recordTaskPrivacy(before:unknown,after:unknown,actor:string,now=new Date().toISOString()):boolean{
 const old=item(before)??{},next=item(after)??{};
 const prior=new Map((Array.isArray(old.executionTimeline)?old.executionTimeline:[]).map(item).filter((v):v is Item=>!!v).map(v=>[v.id,v]));
 for(const raw of Array.isArray(next.executionTimeline)?next.executionTimeline:[]){
  const t=item(raw);if(!t)continue;const p=prior.get(t.id);
  if(!p&&t.kind==="task"){t.clientProjectionVersion=1;t.clientSummary??="";t.visibleToClient=false;}
  if(t.clientVisibility!==undefined&&!["project","confidential"].includes(String(t.clientVisibility)))return false;
  if(t.clientSummary!==undefined&&(typeof t.clientSummary!=="string"||t.clientSummary.length>2000))return false;
  if(t.clientProjectionVersion!==undefined&&t.clientProjectionVersion!==1)return false;
  // Older releases must not expose new internal descriptions during rollback.
  if(t.kind==="task"&&(t.clientProjectionVersion===1||t.clientVisibility==="confidential"))t.visibleToClient=false;
  if(t.clientDescriptionApproved!==undefined&&typeof t.clientDescriptionApproved!=="boolean")return false;
  if(JSON.stringify(t.clientVisibilityAudit)!==JSON.stringify(p?.clientVisibilityAudit))return false;
  const confidential=t.clientVisibility==="confidential";
  const changed=(p?.clientVisibility??"project")!==(t.clientVisibility??"project")||p?.clientConfidentialReason!==t.clientConfidentialReason;
  if(confidential&&(typeof t.clientConfidentialReason!=="string"||t.clientConfidentialReason.trim().length<3||t.clientConfidentialReason.length>1000))return false;
  if(changed)t.clientVisibilityAudit=[...(Array.isArray(p?.clientVisibilityAudit)?p.clientVisibilityAudit:[]),{at:now,by:actor,visibility:confidential?"confidential":"project",reason:confidential?t.clientConfidentialReason:""}];
 }
 return true;
}
