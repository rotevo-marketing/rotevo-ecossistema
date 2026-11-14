/**
 * Shared, pure authorization primitives for UI3 project conversations.
 * Never trusts client-supplied role, tenant, visibility, or author identity.
 */
export type ResourceType = "task" | "content";
type Item = Record<string, unknown>;
type ProjectData = Record<string, unknown>;
const item = (value:unknown):Item|null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Item : null;
export const isUuid=(value:unknown):value is string=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function parseResource(input:unknown):{projectId:string;resourceId:string;resourceType:ResourceType}|null{
 const data=item(input);if(!data)return null;
 const {projectId,resourceId,resourceType}=data;
 if(!isUuid(projectId)||typeof resourceId!=="string"||resourceId.length<1||resourceId.length>100||!/^[a-zA-Z0-9_-]+$/.test(resourceId)||!(resourceType==="task"||resourceType==="content"))return null;
 return {projectId,resourceId,resourceType};
}
export function parseMessageBody(value:unknown):string|null{
 if(typeof value!=="string"||value.length>3000)return null;
 const body=value.trim();
 if(body.length<1||body.length>3000||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(body))return null;
 return body;
}
function sharedResource(data:unknown,resourceType:ResourceType,resourceId:string):Item|null{
 const root=item(data) as ProjectData|null;if(!root)return null;
 const rows=root[resourceType==="task"?"executionTimeline":"editorialCalendar"];
 if(!Array.isArray(rows))return null;
 const matches=rows.map((value:unknown)=>item(value)).filter((entry):entry is Item=>entry?.id===resourceId);
 const resource=matches[0];
 return matches.length===1&&resource.visibleToClient===true&&!resource.archivedAt&&!resource.deletedAt?resource:null;
}
export function resourceIsVisible(data:unknown,resourceType:ResourceType,resourceId:string):boolean{
 return sharedResource(data,resourceType,resourceId)!==null;
}
export function sharedContentVersion(data:unknown,resourceId:string):string|null{
 const version=sharedResource(data,"content",resourceId)?.version;
 return typeof version==="string"&&version.trim() ? version.trim().slice(0,80) : null;
}
export function sharedConversationItems(data:unknown){
 const root=item(data);
 if(!root)return [];
 return (["task","content"] as const).flatMap(type=>{
  const rows=root[type==="task"?"executionTimeline":"editorialCalendar"];
  if(!Array.isArray(rows))return [];
  return rows.flatMap(value=>{
   const resource=item(value);
   if(!resource||typeof resource.title!=="string"||typeof resource.id!=="string"||!resourceIsVisible(data,type,resource.id))return [];
   if(!/^[A-Za-z0-9_-]{1,100}$/.test(resource.id))return [];
   return [{id:resource.id,type,title:resource.title.slice(0,240)}];
  });
 });
}
export function requiredModule(resourceType:ResourceType):"execution"|"content"{
 return resourceType==="task"?"execution":"content";
}
export function canAccessConversation(input:{
 role:unknown;userClientId:unknown;projectClientId:unknown;
 workspaceModules:readonly string[];projectData:unknown;resourceType:ResourceType;resourceId:string;
 teamActive?:boolean;assigned?:boolean;permissions?:readonly string[];
}):boolean{
 const shared=resourceIsVisible(input.projectData,input.resourceType,input.resourceId);
 if(!shared)return false; // No conversation for a private or nonexistent resource, even for admin.
 if(input.role==="client")return typeof input.userClientId==="string"&&input.userClientId.length>0&&input.userClientId===input.projectClientId&&input.workspaceModules.includes(requiredModule(input.resourceType));
 if(input.role==="strategist")return input.teamActive===undefined||input.teamActive===true;
 if(input.role==="staff")return input.teamActive===true&&input.assigned===true&&(input.permissions??[]).includes("projects.read");
 return false;
}
