export type EditorialDecisionRequest={
 projectId:string;
 contentId:string;
 contentVersion:string;
 phase:"idea"|"final";
 decision:"approved"|"changes_requested";
 adjustmentBody:string|null;
 expectedAuthorUserId?:string;
};
function record(value:unknown):Record<string,unknown>|null{
 return !!value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
/** Input validation only; authorization must be enforced in the SQL RPC. */
export function validateEditorialDecision(value:unknown):EditorialDecisionRequest|null{
 const v=record(value);if(!v)return null;
 const {projectId,contentId,contentVersion,phase,decision,adjustmentBody,expectedAuthorUserId}=v;
 if(typeof projectId!=="string"||!(/^[0-9a-f-]{36}$/i).test(projectId))return null;
 if(typeof contentId!=="string"||!(/^[A-Za-z0-9_-]{1,80}$/).test(contentId))return null;
 if(typeof contentVersion!=="string"||!contentVersion.trim()||contentVersion.length>30)return null;
 if(phase!=="idea"&&phase!=="final")return null;
 if(decision!=="approved"&&decision!=="changes_requested")return null;
 if(expectedAuthorUserId!==undefined&&(typeof expectedAuthorUserId!=="string"||!(/^[0-9a-f-]{36}$/i).test(expectedAuthorUserId)))return null;
 const body=typeof adjustmentBody==="string"?adjustmentBody.trim():null;
 if(decision==="changes_requested"&&(!body||body.length<3||body.length>3000))return null;
 if(decision==="approved"&&body)return null;
 return {projectId,contentId,contentVersion,phase,decision,adjustmentBody:body, ...(typeof expectedAuthorUserId==="string"?{expectedAuthorUserId}:{})};
}

export type EditorialSubmissionRequest={
 projectId:string;
 contentId:string;
 contentVersion:string;
 phase:"idea"|"final";
 expectedAuthorUserId?:string;
};
/** Validates shape only. G2, tenant and status are checked inside the SQL RPC. */
export function validateEditorialSubmission(value:unknown):EditorialSubmissionRequest|null{
 const v=record(value);if(!v)return null;
 const {projectId,contentId,contentVersion,phase,expectedAuthorUserId}=v;
 if(typeof projectId!=="string"||!/^[0-9a-f-]{36}$/i.test(projectId))return null;
 if(typeof contentId!=="string"||!/^[A-Za-z0-9_-]{1,80}$/.test(contentId))return null;
 if(typeof contentVersion!=="string"||!contentVersion.trim()||contentVersion.length>30)return null;
 if(phase!=="idea"&&phase!=="final")return null;
 if(expectedAuthorUserId!==undefined&&(typeof expectedAuthorUserId!=="string"||!/^[0-9a-f-]{36}$/i.test(expectedAuthorUserId)))return null;
 return {projectId,contentId,contentVersion,phase,...(typeof expectedAuthorUserId==="string"?{expectedAuthorUserId}:{})};
}
