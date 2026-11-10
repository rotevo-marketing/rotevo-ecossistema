/**
 * Shared, pure authorization primitives for UI3 project conversations.
 * Never trusts client-supplied role, tenant, visibility, or author identity.
 */
export type ResourceType = "task" | "content";
type Item = Record<string, unknown>;
type ProjectData = Record<string, unknown>;
const item = (value:unknown):Item|null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Item : null;
export const isUuid=(value:unknown):value is string=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{12}$/i.test(value);

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
export function resourceIsVisible(data:unknown,resourceType:ResourceType,resourceId:string):boolean{
 const root=item(data) as ProjectData|null;if(!root)return false;
 const key=resourceType==="task"?"executionTimeline":"editorialCalendar";
 const rows=root[key];if(!Array.isArray(rows))return false;
 return rows.some((value:unknown)=>{const entry=item(value);return entry?.id===resourceId&&entry.visibleToClient===true;});
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
