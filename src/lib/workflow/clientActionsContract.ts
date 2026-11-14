/** Strict, environment-independent request validation for a future client-action API.
 * This module does not authorize users or touch the database. RPCs own authorization.
 */
export const clientActionTypes=["record_video","send_material","provide_information","review_material","custom"] as const;
export type ClientActionType=typeof clientActionTypes[number];
export type ClientResourceType="content"|"task";
export type CreateClientAction={
 projectId:string;resourceType:ClientResourceType;resourceId:string;
 resourceVersion:string|null;clientUserId:string;actionType:ClientActionType;
 instructions:string;dueDate:string|null;requestKey:string;
 expectedAuthorUserId:string;
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date=/^\d{4}-\d{2}-\d{2}$/;
export function validClientActionDate(x:string):boolean{
 if(!date.test(x))return false;
 const [y,m,d]=x.split("-").map(Number);
 const parsed=new Date(Date.UTC(y,m-1,d));
 return parsed.getUTCFullYear()===y&&parsed.getUTCMonth()===m-1&&parsed.getUTCDate()===d;
}
export function parseClientActionCreate(raw:unknown):CreateClientAction|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const x=raw as Record<string,unknown>;
 const expectedKeys=["projectId","resourceType","resourceId","resourceVersion","clientUserId","actionType","instructions","dueDate","requestKey","expectedAuthorUserId"];
 if(Object.keys(x).some(k=>!expectedKeys.includes(k)))return null;
 const projectId=x.projectId,clientUserId=x.clientUserId,expectedAuthorUserId=x.expectedAuthorUserId;
 if(typeof projectId!=="string"||!uuid.test(projectId)||typeof clientUserId!=="string"||!uuid.test(clientUserId)||typeof expectedAuthorUserId!=="string"||!uuid.test(expectedAuthorUserId))return null;
 const resourceType=x.resourceType;
 if(resourceType!=="content"&&resourceType!=="task")return null;
 const resourceId=x.resourceId;
 if(typeof resourceId!=="string"||!/^[a-zA-Z0-9_-]{1,180}$/.test(resourceId))return null;
 const version=x.resourceVersion;
 if(version!==undefined&&version!==null&&(typeof version!=="string"||version.trim().length<1||version.length>80))return null;
 if(resourceType==="content"&&(typeof version!=="string"||!version.trim()))return null;
 const actionType=x.actionType;
 if(typeof actionType!=="string"||!clientActionTypes.some(v=>v===actionType))return null;
 if(typeof x.instructions!=="string"||x.instructions.trim().length<3||x.instructions.length>4000)return null;
 const dueDate=x.dueDate;
 if(dueDate!==undefined&&dueDate!==null&&(typeof dueDate!=="string"||!validClientActionDate(dueDate)))return null;
 const requestKey=x.requestKey;
 if(typeof requestKey!=="string"||!/^[a-zA-Z0-9:_-]{8,250}$/.test(requestKey))return null;
 return {projectId,resourceType,resourceId,resourceVersion:typeof version==="string"?version.trim():null,
  clientUserId,actionType:actionType as ClientActionType,instructions:x.instructions.trim(),
  dueDate:typeof dueDate==="string"?dueDate:null,requestKey,expectedAuthorUserId};
}
export function parseClientActionList(raw:unknown):{projectId:string;expectedAuthorUserId:string}|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).some(k=>!["projectId","expectedAuthorUserId"].includes(k)))return null;
 return typeof x.projectId==="string"&&uuid.test(x.projectId)&&typeof x.expectedAuthorUserId==="string"&&uuid.test(x.expectedAuthorUserId)
 ?{projectId:x.projectId,expectedAuthorUserId:x.expectedAuthorUserId}:null;
}

export function parseClientActionSubmit(raw:unknown):{
 assignmentId:string;note:string;requestKey:string;expectedAuthorUserId:string
}|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).some(k=>!["assignmentId","note","requestKey","expectedAuthorUserId"].includes(k)))return null;
 if(typeof x.assignmentId!=="string"||!uuid.test(x.assignmentId)
 ||typeof x.expectedAuthorUserId!=="string"||!uuid.test(x.expectedAuthorUserId)
 ||typeof x.note!=="string"||x.note.trim().length<3||x.note.length>4000
 ||typeof x.requestKey!=="string"||!/^[a-zA-Z0-9:_-]{8,250}$/.test(x.requestKey))return null;
 return {assignmentId:x.assignmentId,note:x.note.trim(),requestKey:x.requestKey,expectedAuthorUserId:x.expectedAuthorUserId};
}

export type ClientReviewDecision="validated"|"correction_requested";
export function parseClientActionReview(raw:unknown):{
 assignmentId:string;submissionId:string;decision:ClientReviewDecision;
 feedback:string;expectedAuthorUserId:string
}|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).some(k=>!["assignmentId","submissionId","decision","feedback","expectedAuthorUserId"].includes(k)))return null;
 if(typeof x.assignmentId!=="string"||!uuid.test(x.assignmentId)
 ||typeof x.submissionId!=="string"||!uuid.test(x.submissionId)
 ||typeof x.expectedAuthorUserId!=="string"||!uuid.test(x.expectedAuthorUserId)
 ||(x.decision!=="validated"&&x.decision!=="correction_requested")
 ||typeof x.feedback!=="string"||x.feedback.length>4000
 ||(x.decision==="correction_requested"&&x.feedback.trim().length<3))return null;
 return {assignmentId:x.assignmentId,submissionId:x.submissionId,
   decision:x.decision,feedback:x.feedback.trim(),expectedAuthorUserId:x.expectedAuthorUserId};
}

/** Immutable RLS-uploaded private asset; the original name never enters Storage paths. */
export function parseClientActionSubmitAsset(raw:unknown):{
 assignmentId:string;note:string;requestKey:string;expectedAuthorUserId:string;privateStoragePath:string
}|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).some(k=>!["assignmentId","note","requestKey","expectedAuthorUserId","privateStoragePath"].includes(k)))return null;
 const base=parseClientActionSubmit({assignmentId:x.assignmentId,note:x.note,requestKey:x.requestKey,expectedAuthorUserId:x.expectedAuthorUserId});
 if(!base||typeof x.privateStoragePath!=="string")return null;
 if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(pdf|png|jpe?g|webp|mp4|mov)$/.test(x.privateStoragePath))return null;
 const [assignmentId,userId]=x.privateStoragePath.split("/");
 if(assignmentId!==base.assignmentId||userId!==base.expectedAuthorUserId)return null;
 return {...base,privateStoragePath:x.privateStoragePath};
}
